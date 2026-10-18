import { supabase } from '../config/supabase'

// R1b (doc 36): a sentence into search fields with a small model, through the "understand" function.
// Used only when the rules cannot read it all. Returns null when the AI is off, over its daily cap,
// busy or slow: search then works on the rules alone.
export const askAI = async ({ text, market }) => {
    try {
        const call = supabase.functions.invoke('understand', { body: { text, market } })
        const slow = new Promise((resolve) => setTimeout(() => resolve({ data: null }), 6000))
        const { data, error } = await Promise.race([call, slow])
        if (error || !data?.on || !data.fields || data.fields.understood === false) return null
        return data.fields
    } catch {
        return null
    }
}

// More words left than a service name: the rules could not read the whole sentence.
export const needsAI = (what) => String(what || '').split(/\s+/).filter((w) => w.length > 1).length >= 5
