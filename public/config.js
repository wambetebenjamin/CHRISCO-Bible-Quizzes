// Legacy public config (used as fallback when the serverless /api/config is
// unavailable, e.g. local static preview). The anon key is public-safe.
const SUPABASE_URL = 'https://hsluwsyabelecjjqbuzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHV3c3lhYmVsZWNqanFidXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDgxMjQsImV4cCI6MjA5NTA4NDEyNH0.zd_iw9WfS-raKjpSc7qZy0jf114VRwXx3scFi0JqumU';

window.CHRISCO_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY
};

console.log('CHRISCO Config Loaded: Pursue, Overtake, Recover All');
