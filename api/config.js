export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || 'https://wambetebenjamin-project.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'public-safe-anon-key-placeholder'
  });
}