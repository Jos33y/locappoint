// The Android build Codemagic uploads to the public "downloads" bucket, with latest.json beside it:
// { "version": "1.0.12", "file": "locappoint-1.0.12.apk", "size": 6291456 }
const BASE = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/downloads`

export const releaseFile = (release) => `${BASE}/${release.file}`

export const loadRelease = async () => {
    if (typeof window !== 'undefined' && window.__locaRelease !== undefined) return window.__locaRelease
    try {
        const res = await fetch(`${BASE}/latest.json`, { cache: 'no-store' })
        if (!res.ok) return null
        const data = await res.json()
        return data?.version && data?.file ? data : null
    } catch {
        return null
    }
}
