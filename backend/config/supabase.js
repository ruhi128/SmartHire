// backend/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Regular client (used everywhere else)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// ✅ Admin client for storage uploads
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    }
  }
);

module.exports         = supabase;
module.exports.supabaseAdmin = supabaseAdmin; // ✅ named export