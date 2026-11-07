// Serverless function: returns Supabase credentials to the client.
// Env vars are set on Vercel; the fallback is the real public project so local
// static previews also work. The anon key is public-safe (client-only).
export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || 'https://hsluwsyabelecjjqbuzo.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHV3c3lhYmVsZWNqanFidXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDgxMjQsImV4cCI6MjA5NTA4NDEyNH0.zd_iw9WfS-raKjpSc7qZy0jf114VRwXx3scFi0JqumU'
  });
}
