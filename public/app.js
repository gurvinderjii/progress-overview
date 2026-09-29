const state = { data: null, userId: null };

function mapProfileFromDb(row) {
  return {
    name: row.name,
    enrolmentNumber: row.enrolment_number,
    program: row.program,
    institution: row.institution,
    studyCenter: row.study_center,
    admissionCycle: row.admission_cycle,
    deliveryMode: row.delivery_mode
  };
}

function mapCourseFromDb(row) {
  return {
    code: row.code,
    title: row.title,
    category: row.category,
    examType: row.exam_type,
    credits: row.credits,
    semester: row.semester,
    cycle: row.cycle,
    assignment1: row.assignment1,
    termEndTheory: row.term_end_theory,
    termEndPractical: row.term_end_practical,
    status: row.status,
    notes: row.notes
  };
}

function courseToDb(payload) {
  return {
    code: payload.code,
    title: payload.title,
    category: payload.category,
    exam_type: payload.examType,
    credits: payload.credits,
    semester: payload.semester,
    cycle: payload.cycle,
    assignment1: payload.assignment1,
    term_end_theory: payload.termEndTheory,
    term_end_practical: payload.termEndPractical,
    status: payload.status,
    notes: payload.notes
  };
}

// IGNOU UG (BCA) passing rule: assignment, term-end theory, and term-end
// practical must each independently reach 35% to pass — a strong score in
// one component does not compensate for a failed one. 35% (not the 40%
// sometimes quoted for BCA online) is confirmed by this student's own grade
// card: ECO1 and FEG2 both scored 36 in term-end theory and IGNOU's portal
// marked them COMPLETED, which only holds under a 35% cutoff.
const PASS_THRESHOLD = 35;

const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>',
  dashed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.56 2.75c.7-.35 1.5-.6 2.3-.7M2.75 8.56c.1-.8.35-1.6.7-2.3M2.05 13.5c0 .8.15 1.6.4 2.35M6.24 21.25c.7.35 1.5.6 2.3.7M13.5 21.95c.8 0 1.6-.15 2.35-.4M21.25 17.76c.35-.7.6-1.5.7-2.3M21.95 10.5c0-.8-.15-1.6-.4-2.35M17.76 2.75c-.7-.35-1.5-.6-2.3-.7"/></svg>',
  credits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  chevron: '<svg class="semester-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'
};

function getPendingReasons(course) {
  // Trust IGNOU's own status once it says a course is done — the exact
  // per-course cutoff can vary, so don't second-guess a confirmed pass.
  if (course.status === 'COMPLETED') return [];
  const reasons = [];
  const assignmentOk = course.assignment1 !== null && course.assignment1 >= PASS_THRESHOLD;
  if (!assignmentOk) {
    reasons.push({
      key: 'assignment',
      label: 'Assignment pending',
      detail: course.assignment1 === null ? 'not submitted' : `scored ${course.assignment1}, needs ${PASS_THRESHOLD}`
    });
  }
  if (course.examType === 'PRACTICAL') {
    const practicalOk = course.termEndPractical !== null && course.termEndPractical >= PASS_THRESHOLD;
    if (!practicalOk) {
      reasons.push({
        key: 'practical',
        label: 'Practical not passed',
        detail: course.termEndPractical === null ? 'not attempted' : `scored ${course.termEndPractical}, needs ${PASS_THRESHOLD}`
      });
    }
  } else {
    const theoryOk = course.termEndTheory !== null && course.termEndTheory >= PASS_THRESHOLD;
    if (!theoryOk) {
      reasons.push({
        key: 'theory',
        label: 'Theory exam not passed',
        detail: course.termEndTheory === null ? 'not attempted' : `scored ${course.termEndTheory}, needs ${PASS_THRESHOLD}`
      });
    }
  }
  return reasons;
}

async function loadData() {
  const session = await requireAuth();
  if (!session) return;
  state.userId = session.user.id;

  await ensureSeeded(state.userId);

  const [{ data: profileRow, error: profileError }, { data: courseRows, error: coursesError }] = await Promise.all([
    supabaseClient.from('profile').select('*').eq('user_id', state.userId).maybeSingle(),
    supabaseClient.from('courses').select('*').eq('user_id', state.userId).order('code')
  ]);

  if (profileError || coursesError) {
    alert(`Failed to load data: ${(profileError || coursesError).message}`);
    return;
  }

  state.data = {
    student: mapProfileFromDb(profileRow),
    courses: (courseRows || []).map(mapCourseFromDb)
  };
  render();
}

function render() {
  renderHeader();
  renderSummary();
  renderPending();
  renderPendingBreakdown();
  renderCourseGroups();
}

function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

function renderHeader() {
  const { student, courses } = state.data;
  document.getElementById('avatar').textContent = initials(student.name);
  document.getElementById('studentName').textContent = student.name;
  document.getElementById('studentProgram').textContent = `${student.program} · ${student.institution}`;

  const meta = document.getElementById('headerMeta');
  meta.innerHTML = '';
  const rows = [
    ['Enrolment', student.enrolmentNumber],
    ['Study Center', student.studyCenter],
    ['Admission', student.admissionCycle],
    ['Mode', student.deliveryMode]
  ];
  for (const [label, value] of rows) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${label}: <b>${value || '—'}</b>`;
    meta.appendChild(tag);
  }

  const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const completedCredits = courses
    .filter((c) => c.status === 'COMPLETED')
    .reduce((s, c) => s + (c.credits || 0), 0);
  const pct = totalCredits ? Math.round((completedCredits / totalCredits) * 100) : 0;

  const circle = document.getElementById('ringProgress');
  const r = 52;
  const circumference = 2 * Math.PI * r;
  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = `${circumference * (1 - pct / 100)}`;
  document.getElementById('ringPct').textContent = `${pct}%`;
  document.getElementById('ringCaption').textContent = `${completedCredits}/${totalCredits} credits`;
}

function statusClass(status) {
  if (status === 'COMPLETED') return 'complete';
  if (status === 'NOT COMPLETED') return 'partial';
  return 'none';
}

function fmt(v) {
  return v === null || v === undefined ? '—' : v;
}

function statCard({ icon, iconClass, value, label, bar }) {
  return `
    <div class="stat-card">
      <div class="stat-top">
        <span class="stat-icon ${iconClass}">${icon}</span>
      </div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
      ${bar !== undefined ? `<div class="stat-bar"><div class="stat-bar-fill" style="width:${bar}%"></div></div>` : ''}
    </div>
  `;
}

function renderSummary() {
  const { courses } = state.data;
  const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const completedCredits = courses
    .filter((c) => c.status === 'COMPLETED')
    .reduce((s, c) => s + (c.credits || 0), 0);
  const counts = { COMPLETED: 0, 'NOT COMPLETED': 0, 'NOT STARTED': 0 };
  for (const c of courses) counts[c.status] = (counts[c.status] || 0) + 1;
  const pct = totalCredits ? Math.round((completedCredits / totalCredits) * 100) : 0;

  const el = document.getElementById('summary');
  el.innerHTML = [
    statCard({ icon: ICONS.credits, iconClass: 'icon-primary', value: `${completedCredits}/${totalCredits}`, label: 'Credits completed', bar: pct }),
    statCard({ icon: ICONS.check, iconClass: 'icon-success', value: counts.COMPLETED, label: `Courses completed of ${courses.length}` }),
    statCard({ icon: ICONS.alert, iconClass: 'icon-warning', value: counts['NOT COMPLETED'], label: 'Attempted, still pending' }),
    statCard({ icon: ICONS.dashed, iconClass: 'icon-neutral', value: counts['NOT STARTED'], label: 'No activity yet' })
  ].join('');
}

function renderPending() {
  const pending = state.data.courses
    .filter((c) => c.status !== 'COMPLETED')
    .sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
  const list = document.getElementById('pendingList');
  list.innerHTML = '';
  if (!pending.length) {
    list.innerHTML = '<p class="muted">Nothing pending — all courses completed.</p>';
    return;
  }
  for (const c of pending) {
    const reasons = getPendingReasons(c);
    const row = document.createElement('div');
    row.className = `pending-item s-${statusClass(c.status)}`;
    row.innerHTML = `
      <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
      <span class="pending-code">${c.code}</span>
      <span class="pending-title">${c.title}${reasons.length ? `<span class="pending-reasons"> — ${reasons.map((r) => r.label).join(', ')}</span>` : ''}</span>
      <span class="pending-sem">Sem ${c.semester}</span>
    `;
    row.addEventListener('click', () => openCourseDialog(c.code));
    list.appendChild(row);
  }
}

function renderPendingBreakdown() {
  const { courses } = state.data;
  const groups = {
    assignment: { label: 'Assignment Pending', items: [] },
    theory: { label: 'Theory Exam Not Passed', items: [] },
    practical: { label: 'Practical Not Passed', items: [] }
  };
  for (const c of courses) {
    for (const r of getPendingReasons(c)) {
      groups[r.key].items.push({ course: c, detail: r.detail });
    }
  }
  const container = document.getElementById('pendingBreakdown');
  container.innerHTML = '';
  for (const key of ['assignment', 'theory', 'practical']) {
    const g = groups[key];
    const col = document.createElement('div');
    col.className = 'breakdown-col';
    col.dataset.key = key;
    col.innerHTML = `<div class="breakdown-col-head"><h3>${g.label}</h3><span class="breakdown-count">${g.items.length}</span></div>`;
    const list = document.createElement('div');
    list.className = 'breakdown-list';
    if (!g.items.length) {
      list.innerHTML = '<p class="muted" style="font-size:12.5px;padding:6px 8px;">None</p>';
    } else {
      for (const { course, detail } of g.items) {
        const row = document.createElement('div');
        row.className = 'breakdown-item';
        row.innerHTML = `
          <span class="pending-code">${course.code}</span>
          <span class="breakdown-title">${course.title}</span>
          <span class="muted breakdown-detail">${detail}</span>
        `;
        row.addEventListener('click', () => openCourseDialog(course.code));
        list.appendChild(row);
      }
    }
    col.appendChild(list);
    container.appendChild(col);
  }
}

function renderCourseGroups() {
  const { courses } = state.data;
  const bySemester = {};
  for (const c of courses) {
    if (!bySemester[c.semester]) bySemester[c.semester] = [];
    bySemester[c.semester].push(c);
  }
  const container = document.getElementById('semesterGroups');
  container.innerHTML = '';
  for (const sem of Object.keys(bySemester).sort((a, b) => a - b)) {
    const list = bySemester[sem].sort((a, b) => a.code.localeCompare(b.code));
    const totalCredits = list.reduce((s, c) => s + (c.credits || 0), 0);
    const doneCredits = list.filter((c) => c.status === 'COMPLETED').reduce((s, c) => s + (c.credits || 0), 0);
    const pct = totalCredits ? Math.round((doneCredits / totalCredits) * 100) : 0;

    const details = document.createElement('details');
    details.className = 'semester-card';
    details.open = true;

    const summary = document.createElement('summary');
    summary.innerHTML = `
      ${ICONS.chevron}
      <span class="semester-title">Semester ${sem}</span>
      <span class="semester-cycle">${list[0]?.cycle || ''}</span>
      <span class="semester-progress">
        <span class="semester-bar"><span class="semester-bar-fill" style="width:${pct}%"></span></span>
        <span class="semester-credits">${doneCredits}/${totalCredits} cr</span>
      </span>
    `;
    details.appendChild(summary);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Code</th><th>Title</th><th>Type</th><th>Credits</th><th>Asgn 1</th><th>TE Theory</th><th>TE Practical</th><th>Status</th>
      </tr></thead>
    `;
    const tbody = document.createElement('tbody');
    for (const c of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="cell-code">${c.code}</td>
        <td>${c.title}</td>
        <td class="cell-muted">${c.examType === 'PRACTICAL' ? 'Practical' : 'Theory'}</td>
        <td>${c.credits}</td>
        <td class="cell-muted">${fmt(c.assignment1)}</td>
        <td class="cell-muted">${fmt(c.termEndTheory)}</td>
        <td class="cell-muted">${fmt(c.termEndPractical)}</td>
        <td><span class="badge badge-${statusClass(c.status)}">${c.status}</span></td>
      `;
      tr.addEventListener('click', () => openCourseDialog(c.code));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    details.appendChild(tableWrap);
    container.appendChild(details);
  }
}

// --- Dialog handling ---

const dialog = document.getElementById('courseDialog');
const form = document.getElementById('courseForm');

function openCourseDialog(code) {
  const course = code ? state.data.courses.find((c) => c.code === code) : null;
  document.getElementById('dialogTitle').textContent = course ? `Edit ${course.code}` : 'Add Course';
  document.getElementById('f-originalCode').value = course ? course.code : '';

  const codeField = document.getElementById('f-code');
  codeField.value = course ? course.code : '';
  codeField.readOnly = !!course;

  document.getElementById('f-title').value = course ? course.title : '';
  document.getElementById('f-semester').value = course ? course.semester : 1;
  document.getElementById('f-cycle').value = course ? course.cycle : '';
  document.getElementById('f-category').value = course ? course.category : 'COMPULSORY';
  document.getElementById('f-examType').value = course ? course.examType : 'THEORY';
  document.getElementById('f-credits').value = course ? course.credits : '';
  document.getElementById('f-assignment1').value = course?.assignment1 ?? '';
  document.getElementById('f-termEndTheory').value = course?.termEndTheory ?? '';
  document.getElementById('f-termEndPractical').value = course?.termEndPractical ?? '';
  document.getElementById('f-status').value = course ? course.status : 'NOT STARTED';
  document.getElementById('f-notes').value = course?.notes || '';
  document.getElementById('deleteCourseBtn').style.display = course ? '' : 'none';
  dialog.showModal();
}

function numOrNull(v) {
  return v === '' ? null : Number(v);
}

document.getElementById('addCourseBtn').addEventListener('click', () => openCourseDialog(null));
document.getElementById('cancelBtn').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const originalCode = document.getElementById('f-originalCode').value;
  const payload = {
    code: document.getElementById('f-code').value.trim(),
    title: document.getElementById('f-title').value.trim(),
    semester: Number(document.getElementById('f-semester').value),
    cycle: document.getElementById('f-cycle').value.trim(),
    category: document.getElementById('f-category').value,
    examType: document.getElementById('f-examType').value,
    credits: Number(document.getElementById('f-credits').value),
    assignment1: numOrNull(document.getElementById('f-assignment1').value),
    termEndTheory: numOrNull(document.getElementById('f-termEndTheory').value),
    termEndPractical: numOrNull(document.getElementById('f-termEndPractical').value),
    status: document.getElementById('f-status').value,
    notes: document.getElementById('f-notes').value.trim()
  };

  const dbRow = courseToDb(payload);
  const { error } = originalCode
    ? await supabaseClient
        .from('courses')
        .update(dbRow)
        .eq('user_id', state.userId)
        .eq('code', originalCode)
    : await supabaseClient
        .from('courses')
        .insert({ user_id: state.userId, ...dbRow });

  if (error) {
    alert(`Failed to save: ${error.message}`);
    return;
  }
  dialog.close();
  await loadData();
});

document.getElementById('deleteCourseBtn').addEventListener('click', async () => {
  const code = document.getElementById('f-originalCode').value;
  if (!code) return;
  if (!confirm(`Delete ${code}?`)) return;
  const { error } = await supabaseClient.from('courses').delete().eq('user_id', state.userId).eq('code', code);
  if (error) {
    alert(`Failed to delete: ${error.message}`);
    return;
  }
  dialog.close();
  await loadData();
});

document.getElementById('logoutBtn').addEventListener('click', signOut);

// --- Theme toggle ---

function applyTheme(theme) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

(function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch (e) {
    /* private mode / storage blocked — fall back to system theme */
  }
  applyTheme(saved);
})();

document.getElementById('themeToggle').addEventListener('click', () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = document.documentElement.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('theme', next);
  } catch (e) {
    /* ignore persistence failure */
  }
});

loadData();
