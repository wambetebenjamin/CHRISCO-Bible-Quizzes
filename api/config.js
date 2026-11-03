/**
 * Vercel serverless function: exposes the public Supabase credentials
 * to the frontend. The anon key is publishable by design (RLS protects
 * the database); never put the service_role key here.
 */
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
};
