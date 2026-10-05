const supabaseClient = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

function emailForEnrolment(enrolmentNumber) {
  return `${enrolmentNumber.trim()}@${window.AUTH_EMAIL_DOMAIN}`;
}

async function signIn(enrolmentNumber, password) {
  return supabaseClient.auth.signInWithPassword({
    email: emailForEnrolment(enrolmentNumber),
    password
  });
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

// Call at the top of any page that requires login. Redirects to login.html
// if there's no active session, otherwise resolves with the session.
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Every IGNOU student's Supabase account is created with a synthetic email
// of "<enrolment>@<domain>" (see emailForEnrolment above), so the enrolment
// number is already known the moment they're signed in — no separate
// "connect your IGNOU account" form needed. On first-ever sign-in we just
// create a blank profile row for that enrolment under the one programme
// this platform currently supports, and let the caller trigger a sync
// against IGNOU's real grade card to fill in their name and courses.
//
// Returns true if a new (blank) profile was just created, false if the
// user already had one — callers use this to decide whether to kick off
// an automatic first sync.
async function ensureProfile(userId, email) {
  const { data: existing } = await supabaseClient
    .from('profile')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return false;

  const enrolmentNumber = email.split('@')[0];
  await supabaseClient.from('profile').insert({
    user_id: userId,
    name: '',
    enrolment_number: enrolmentNumber,
    program: 'BCA (Online) - Bachelor of Computer Applications',
    institution: 'IGNOU (Indira Gandhi National Open University)',
    study_center: '',
    admission_cycle: '',
    delivery_mode: 'Online',
    programme_code: 'BCAOL'
  });
  return true;
}

// Calls the Vercel serverless function that fetches this student's real
// grade card from IGNOU, merges it with the BCAOL course catalog, and
// writes the result into their `courses`/`profile` rows server-side (the
// browser can't call IGNOU directly — cross-origin, and we don't want
// every client hammering IGNOU's server independently).
async function syncGradecard() {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch('/api/sync-gradecard', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error(`Sync failed (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(body.error || `Sync failed (${res.status})`);
  }
  return body;
}
