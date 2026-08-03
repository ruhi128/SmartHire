// backend/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Regular client (used everywhere else for service-role data access).
// persistSession/autoRefreshToken are disabled so this client ALWAYS uses the
// service key and its auth state can never be mutated by a sign-in elsewhere.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    }
  }
);

// Dedicated client used ONLY for password sign-in (credential verification).
// Isolated so signInWithPassword never pollutes the shared service client's
// auth session (which would otherwise downgrade subsequent queries to the
// logged-in user and break RLS-protected reads).
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    }
  }
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
module.exports.supabaseAuth  = supabaseAuth;  // ✅ isolated sign-in client