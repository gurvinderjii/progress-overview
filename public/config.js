// Fill these in after creating your Supabase project (Project Settings > API).
// The anon key is safe to expose publicly — Row Level Security in schema.sql
// is what actually protects your data, not keeping this key secret.
window.SUPABASE_CONFIG = {
  url: 'https://ukvpomznvpinyfmjuegh.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdnBvbXpudnBpbnlmbWp1ZWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NzQzNjcsImV4cCI6MjEwNjI1MDM2N30.6FiULUnfTyHAFP3t1RPAnAw3-IIChkDvkPmLnjlb8Q4'
};

// Sign-in uses this as the synthetic email domain behind your enrollment
// number, since Supabase Auth identities are always email-shaped.
window.AUTH_EMAIL_DOMAIN = 'bca.igurvinder.in';
