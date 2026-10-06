const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

const SUPPORTED_PROGRAMME = 'BCAOL';
const MIN_SYNC_INTERVAL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

function parseMark(raw) {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed === '-') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// IGNOU's grade card renders codes like "BCS011" (no hyphen, zero-padded);
// our catalog/courses tables use the same normalized form the Samarth
// portal shows ("BCS11") — strip the hyphen-equivalent leading zeros so
// both sides match.
function normalizeCode(raw) {
  const m = String(raw).trim().toUpperCase().match(/^([A-Z]+)0*(\d+)$/);
  return m ? `${m[1]}${m[2]}` : String(raw).trim().toUpperCase();
}

function parseGradeCard(html) {
  const $ = cheerio.load(html);

  const name = $('[id*="lblDispname"]').first().text().trim() || null;

  const table = $('[id*="gvDetail"]').first();
  const rows = table.find('tr').toArray();
  if (rows.length === 0) return { name, courses: [] };

  const headerCells = $(rows[0])
    .find('th')
    .map((_, el) => $(el).text().trim().toUpperCase())
    .get();

  const courses = [];
  for (const tr of rows.slice(1)) {
    const cells = $(tr)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get();
    if (cells.length < 2) continue; // trailing spacer row

    const row = {};
    headerCells.forEach((h, idx) => {
      row[h] = cells[idx];
    });

    const rawCode = row['COURSE'];
    if (!rawCode) continue;

    let practical = parseMark(row['TERM END PRACTICAL']);
    if (practical === null) {
      for (const h of Object.keys(row)) {
        if (h.startsWith('LAB')) {
          const v = parseMark(row[h]);
          if (v !== null) {
            practical = v;
            break;
          }
        }
      }
    }

    courses.push({
      code: normalizeCode(rawCode),
      assignment1: parseMark(row['ASGN1']),
      termEndTheory: parseMark(row['TERM END THEORY']),
      termEndPractical: practical,
      status: (row['STATUS'] || '').trim().toUpperCase() || null
    });
  }

  return { name, courses };
}

async function fetchGradeCard(enrolmentNumber, gradecardProg) {
  const url = `https://gradecard.ignou.ac.in/view_gradecard.aspx?eno=${encodeURIComponent(enrolmentNumber)}&prog=${encodeURIComponent(gradecardProg)}&type=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`IGNOU grade card site returned ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileError } = await admin
    .from('profile')
    .select('enrolment_number, programme_code, gradecard_prog, last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    res.status(400).json({ error: 'Profile not found' });
    return;
  }

  if (profile.programme_code !== SUPPORTED_PROGRAMME) {
    res.status(400).json({ error: `Only ${SUPPORTED_PROGRAMME} is supported right now` });
    return;
  }

  if (profile.last_synced_at) {
    const elapsed = Date.now() - new Date(profile.last_synced_at).getTime();
    if (elapsed < MIN_SYNC_INTERVAL_MS) {
      res.status(429).json({ error: 'Please wait a bit before syncing again', retryAfterMs: MIN_SYNC_INTERVAL_MS - elapsed });
      return;
    }
  }

  let html;
  try {
    html = await fetchGradeCard(profile.enrolment_number, profile.gradecard_prog || profile.programme_code);
  } catch (err) {
    res.status(502).json({ error: `Could not reach IGNOU's grade card site: ${err.message}` });
    return;
  }

  const { name, courses: scraped } = parseGradeCard(html);
  const scrapedByCode = Object.fromEntries(scraped.map((c) => [c.code, c]));

  const { data: catalog, error: catalogError } = await admin
    .from('programme_courses')
    .select('*')
    .eq('programme_code', SUPPORTED_PROGRAMME);

  if (catalogError || !catalog?.length) {
    res.status(500).json({ error: 'Course catalog unavailable' });
    return;
  }

  const merged = catalog.map((c) => {
    const s = scrapedByCode[c.code];
    return {
      user_id: userId,
      code: c.code,
      title: c.title,
      category: c.category,
      exam_type: c.exam_type,
      credits: c.credits,
      semester: c.semester,
      assignment1: s?.assignment1 ?? null,
      term_end_theory: s?.termEndTheory ?? null,
      term_end_practical: s?.termEndPractical ?? null,
      status: s?.status || 'NOT STARTED'
    };
  });

  const { error: upsertError } = await admin
    .from('courses')
    .upsert(merged, { onConflict: 'user_id,code' });

  if (upsertError) {
    res.status(500).json({ error: `Failed to save synced courses: ${upsertError.message}` });
    return;
  }

  const profileUpdate = { last_synced_at: new Date().toISOString() };
  if (name) profileUpdate.name = name;
  await admin.from('profile').update(profileUpdate).eq('user_id', userId);

  res.status(200).json({ ok: true, syncedCourses: merged.length, matchedFromGradeCard: scraped.length, name });
}

module.exports = handler;
module.exports.parseMark = parseMark;
module.exports.normalizeCode = normalizeCode;
module.exports.parseGradeCard = parseGradeCard;
