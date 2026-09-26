import { supabase } from '../config/supabase'

const BUCKET = 'business-media'
const MAX_INPUT_BYTES = 20 * 1024 * 1024

export const MEDIA_SHAPES = {
    logo: { width: 512, height: 512, column: 'logo_url' },
    cover: { width: 1600, height: 900, column: 'banner_url' },
}

const loadBitmap = async (file) => {
    if (typeof createImageBitmap === 'function') {
        try { return await createImageBitmap(file) } catch { /* noop */ }
    }
    const url = URL.createObjectURL(file)
    try {
        const img = new Image()
        img.decoding = 'async'
        img.src = url
        await img.decode()
        return img
    } finally {
        URL.revokeObjectURL(url)
    }
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

export const prepareImage = async (file, shape) => {
    if (!file || !file.type?.startsWith('image/')) throw new Error('Choose a photo, not another kind of file.')
    if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is over 20 MB. Choose a smaller one.')

    let source
    try {
        source = await loadBitmap(file)
    } catch {
        throw new Error('That photo format is not supported here. Try a JPEG or PNG.')
    }

    const { width, height } = MEDIA_SHAPES[shape]
    const scale = Math.max(width / source.width, height / source.height)
    const drawW = source.width * scale
    const drawH = source.height * scale
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
    source.close?.()

    // Safari can hand back PNG when asked for WebP; fall back to JPEG so the file stays small.
    let blob = await toBlob(canvas, 'image/webp', 0.86)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.88)
    if (!blob) throw new Error('We could not read that photo. Try another.')
    return blob
}

const pathFromUrl = (url) => {
    const marker = `/object/public/${BUCKET}/`
    const at = (url || '').indexOf(marker)
    return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length))
}

export const uploadBusinessImage = async (businessId, shape, blob, previousUrl) => {
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${businessId}/${shape}-${Date.now()}.${ext}`
    const store = supabase.storage.from(BUCKET)
    const { error } = await store.upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
    if (error) throw error
    const { data } = store.getPublicUrl(path)
    const old = pathFromUrl(previousUrl)
    if (old && old.startsWith(`${businessId}/`)) await store.remove([old])
    return data.publicUrl
}

export const removeBusinessImage = async (businessId, url) => {
    const old = pathFromUrl(url)
    if (!old || !old.startsWith(`${businessId}/`)) return
    const { error } = await supabase.storage.from(BUCKET).remove([old])
    if (error) throw error
}
