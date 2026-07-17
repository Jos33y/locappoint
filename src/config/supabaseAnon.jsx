// supabaseAnon - Dedicated client for public, unauthenticated flows.
// Used by WaitlistModal, PartnershipModal, and analytics service.
// Skips persistSession so a logged-in user does not accidentally attach their JWT
// to public form submissions. Public inserts must always run as the anon role.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
})
