import { supabase } from '../config/supabase'

// The gold badge, "Verified" (verified.sql, the verify function). The ID check runs on Stripe's
// page; the walk-through video goes to a private bucket only the owner and Locappoint can open.
export const VIDEO_BUCKET = 'verification-videos'
export const VIDEO_MAX_MB = 50
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

const readError = async (error) => {
    try {
        const body = await error?.context?.json?.()
        if (body?.error) return body.error
    } catch { /* not JSON */ }
    return 'We could not reach the ID check. Check your connection and try again.'
}

const callVerify = async (action) => {
    const { data, error } = await supabase.functions.invoke('verify', { body: { action } })
    if (error) throw new Error(await readError(error))
    if (data?.error) throw new Error(data.error)
    return data
}

export const loadMyVerification = (businessId) => call('my_verification', { p_business: businessId })
export const startIdentity = () => callVerify('start')
export const checkIdentity = () => callVerify('check')

const extFor = (type) => (type === 'video/webm' ? 'webm' : type === 'video/quicktime' ? 'mov' : 'mp4')

// A recorded or picked video: checked here, uploaded to the business's own folder, then handed in.
export const sendVideo = async (businessId, blob) => {
    const type = (blob.type || '').split(';')[0] || 'video/mp4'
    if (!VIDEO_TYPES.includes(type)) throw new Error('Use an MP4, MOV or WebM video.')
    if (blob.size > VIDEO_MAX_MB * 1024 * 1024) throw new Error(`That video is over ${VIDEO_MAX_MB} MB. Record it here instead, or film a shorter one.`)
    const path = `${businessId}/${Date.now()}.${extFor(type)}`
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, blob, { contentType: type, upsert: false })
    if (error) throw new Error('The upload stopped. Check your connection and try again.')
    const view = await call('submit_verification_place', { p_business: businessId, p_kind: 'video', p_path: path })
    if (view?.delete_path) supabase.storage.from(VIDEO_BUCKET).remove([view.delete_path]).catch(() => {})
    return view
}

export const askForCall = (businessId) => call('submit_verification_place', { p_business: businessId, p_kind: 'call', p_path: null })

// Admin: the queue, the video, the decision, removal.
export const loadAdminVerifications = ({ view = 'submitted', offset = 0, limit = 50 } = {}) =>
    call('admin_verifications', { p_view: view, p_limit: limit, p_offset: offset })

export const videoUrl = async (path) => {
    const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, 15 * 60)
    if (error) throw error
    return data?.signedUrl
}

export const reviewVerification = async ({ businessId, decision, note }) => {
    const view = await call('admin_review_verification', { p_business: businessId, p_decision: decision, p_note: note?.trim() || null })
    // The video has done its job: it goes once we decide.
    if (view?.delete_path) await supabase.storage.from(VIDEO_BUCKET).remove([view.delete_path]).catch(() => {})
    return view
}

export const setGold = ({ businessId, action, note }) => call('admin_gold', { p_business: businessId, p_action: action, p_note: note?.trim() || null })
