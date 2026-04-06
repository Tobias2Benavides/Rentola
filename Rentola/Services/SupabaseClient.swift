import Supabase

// The anon key is safe to ship in the binary; RLS enforces server-side access.
// TODO: Replace with actual Supabase project values before first run.
let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://YOUR_PROJECT_REF.supabase.co")!,
    supabaseKey: "YOUR_ANON_KEY"
)
