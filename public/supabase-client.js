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

// --- One-time seed data, transcribed from the IGNOU BCA grade card/course
// list. Used only to bootstrap a brand-new profile on first sign-in; after
// that, Supabase is the source of truth and this is never referenced again.

const SEED_PROFILE = {
  name: 'STUDENT_NAME',
  enrolment_number: '0000000000',
  program: 'BCA - Bachelor of Computer Applications',
  institution: 'IGNOU (Indira Gandhi National Open University)',
  study_center: '2900: IGNOU Regional Centre Delhi2 LSC Code 2900',
  admission_cycle: '2022-JULY',
  delivery_mode: 'Open Distance Learning'
};

const SEED_COURSES = [
  { code: 'BCS11', title: 'Computer Basics and PC Software', category: 'COMPULSORY', credits: 3, semester: 1, cycle: 'JULY 2022', exam_type: 'THEORY', assignment1: 79, term_end_theory: 40, term_end_practical: null, status: 'COMPLETED', notes: '' },
  { code: 'BCS12', title: 'Mathematics', category: 'COMPULSORY', credits: 4, semester: 1, cycle: 'JULY 2022', exam_type: 'THEORY', assignment1: 72, term_end_theory: 7, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'BCSL13', title: 'Computer Basics and PC Software Lab', category: 'COMPULSORY', credits: 2, semester: 1, cycle: 'JULY 2022', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: 80, status: 'NOT COMPLETED', notes: '' },
  { code: 'ECO1', title: 'Business Organization', category: 'COMPULSORY', credits: 4, semester: 1, cycle: 'JULY 2022', exam_type: 'THEORY', assignment1: 69, term_end_theory: 36, term_end_practical: null, status: 'COMPLETED', notes: '' },
  { code: 'FEG2', title: 'Foundation Course in English 2', category: 'COMPULSORY', credits: 4, semester: 1, cycle: 'JULY 2022', exam_type: 'THEORY', assignment1: 65, term_end_theory: 36, term_end_practical: null, status: 'COMPLETED', notes: '' },

  { code: 'MCS11', title: 'Problem Solving and Programming', category: 'COMPULSORY', credits: 3, semester: 2, cycle: 'JULY 2025', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'MCS12', title: 'Computer Org and Assembly Language Programming', category: 'COMPULSORY', credits: 4, semester: 2, cycle: 'JULY 2025', exam_type: 'THEORY', assignment1: null, term_end_theory: 1, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'MCS13', title: 'Discrete Mathematics', category: 'COMPULSORY', credits: 2, semester: 2, cycle: 'JULY 2025', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'MCS15', title: 'Communication Skills', category: 'COMPULSORY', credits: 2, semester: 2, cycle: 'JULY 2025', exam_type: 'THEORY', assignment1: null, term_end_theory: 64, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'ECO2', title: 'Accountancy-1', category: 'COMPULSORY', credits: 4, semester: 2, cycle: 'JULY 2025', exam_type: 'THEORY', assignment1: null, term_end_theory: 12, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'BCSL21', title: 'C Language Programming Lab', category: 'COMPULSORY', credits: 1, semester: 2, cycle: 'JULY 2025', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCSL22', title: 'Assembly Language Programming Lab', category: 'COMPULSORY', credits: 1, semester: 2, cycle: 'JULY 2025', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },

  { code: 'MCS14', title: 'System Analysis and Design', category: 'COMPULSORY', credits: 3, semester: 3, cycle: 'JANUARY 2026', exam_type: 'THEORY', assignment1: 83, term_end_theory: null, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'MCS21', title: 'Data and File Structures', category: 'COMPULSORY', credits: 4, semester: 3, cycle: 'JANUARY 2026', exam_type: 'THEORY', assignment1: 82, term_end_theory: 16, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'MCS23', title: 'Introduction to Database Management Systems', category: 'COMPULSORY', credits: 3, semester: 3, cycle: 'JANUARY 2026', exam_type: 'THEORY', assignment1: 76, term_end_theory: 3, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'BCS31', title: 'Programming in C++', category: 'COMPULSORY', credits: 3, semester: 3, cycle: 'JANUARY 2026', exam_type: 'THEORY', assignment1: 80, term_end_theory: 46, term_end_practical: null, status: 'COMPLETED', notes: '' },
  { code: 'BCSL32', title: 'C++ Programming Lab', category: 'COMPULSORY', credits: 1, semester: 3, cycle: 'JANUARY 2026', exam_type: 'PRACTICAL', assignment1: 86, term_end_theory: null, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'BCSL33', title: 'Data and File Structures Lab', category: 'COMPULSORY', credits: 1, semester: 3, cycle: 'JANUARY 2026', exam_type: 'PRACTICAL', assignment1: 79, term_end_theory: null, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },
  { code: 'BCSL34', title: 'DBMS Lab', category: 'COMPULSORY', credits: 1, semester: 3, cycle: 'JANUARY 2026', exam_type: 'PRACTICAL', assignment1: 80, term_end_theory: null, term_end_practical: null, status: 'NOT COMPLETED', notes: '' },

  { code: 'MCSL16', title: 'Internet Concepts and Web Design', category: 'COMPULSORY', credits: 2, semester: 4, cycle: 'JULY 2026', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'MCS24', title: 'Object Oriented Tech. and Java Prog', category: 'COMPULSORY', credits: 3, semester: 4, cycle: 'JULY 2026', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCS40', title: 'Statistical Techniques', category: 'COMPULSORY', credits: 4, semester: 4, cycle: 'JULY 2026', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCS41', title: 'Fundamentals of Computer Networks', category: 'COMPULSORY', credits: 4, semester: 4, cycle: 'JULY 2026', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCS42', title: 'Introduction to Algorithm Design', category: 'COMPULSORY', credits: 2, semester: 4, cycle: 'JULY 2026', exam_type: 'THEORY', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCSL43', title: 'Java Programming Lab', category: 'COMPULSORY', credits: 1, semester: 4, cycle: 'JULY 2026', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCSL44', title: 'Statistical Techniques Lab', category: 'COMPULSORY', credits: 1, semester: 4, cycle: 'JULY 2026', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' },
  { code: 'BCSL45', title: 'Algorithms Design Lab', category: 'COMPULSORY', credits: 1, semester: 4, cycle: 'JULY 2026', exam_type: 'PRACTICAL', assignment1: null, term_end_theory: null, term_end_practical: null, status: 'NOT STARTED', notes: '' }
];

// On first sign-in ever (no profile row yet), populate this user's data
// from the seed above. Every sign-in after that is a no-op here.
async function ensureSeeded(userId) {
  const { data: existing } = await supabaseClient
    .from('profile')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return;

  await supabaseClient.from('profile').insert({ user_id: userId, ...SEED_PROFILE });
  await supabaseClient
    .from('courses')
    .insert(SEED_COURSES.map((c) => ({ user_id: userId, ...c })));
}
