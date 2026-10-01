import { supabase } from '../config/supabase'

// What deleting would take with it, and what stands in the way, before anything is asked.
export const checkDeletion = async () => {
    const { data, error } = await supabase.rpc('account_deletion_check')
    if (error) throw error
    return data
}

export const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account', { p_confirm: 'DELETE' })
    if (error) throw error
    // The sign-in no longer exists; clear what this device still holds.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}
