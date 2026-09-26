import { useMemo } from 'react'
import QRCode from 'qrcode'
import '../../styles/ui-kit.css'

const QUIET = 2

const matrixFor = (value) => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' })
    return { size: modules.size, dark: (x, y) => modules.get(y, x) }
}

const pathFor = ({ size, dark }) => {
    let d = ''
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (dark(x, y)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
        }
    }
    return d
}

const safeMatrix = (value) => {
    try { return matrixFor(value) } catch { return null }
}

export const QrCode = ({ value, label, size = 176 }) => {
    const matrix = useMemo(() => safeMatrix(value), [value])
    if (!matrix) return null
    const box = matrix.size + QUIET * 2
    return (
        <span className="ui-qr" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
                <path className="ui-qr__modules" d={pathFor(matrix)} />
            </svg>
        </span>
    )
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export const downloadQr = (value, filename, pixels = 1024) => {
    const matrix = safeMatrix(value)
    if (!matrix) return
    const box = matrix.size + QUIET * 2
    const scale = Math.floor(pixels / box)
    const canvas = document.createElement('canvas')
    canvas.width = box * scale
    canvas.height = box * scale
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = cssVar('--text-primary')
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = cssVar('--ink')
    for (let y = 0; y < matrix.size; y++) {
        for (let x = 0; x < matrix.size; x++) {
            if (matrix.dark(x, y)) ctx.fillRect((x + QUIET) * scale, (y + QUIET) * scale, scale, scale)
        }
    }
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
}
