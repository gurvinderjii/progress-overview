// Fill these in after creating your Supabase project (Project Settings > API).
// The anon key is safe to expose publicly — Row Level Security in schema.sql
// is what actually protects your data, not keeping this key secret.
window.SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY'
};

// Sign-in uses this as the synthetic email domain behind your enrollment
// number, since Supabase Auth identities are always email-shaped.
window.AUTH_EMAIL_DOMAIN = 'bca.igurvinder.in';
