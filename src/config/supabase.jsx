import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please check your env file.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
    if (error) {
        console.error('Supabase error:', error)

        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
            return 'Invalid email or password'
        }
        if (error.message.includes('Email not confirmed')) {
            return 'Please verify your email address'
        }
        if (error.message.includes('User already registered')) {
            return 'This email is already registered'
        }

        return error.message || 'An error occurred'
    }
    return null
}