import { useEffect, useState } from 'react'
import PT from 'country-flag-icons/string/3x2/PT'
import NG from 'country-flag-icons/string/3x2/NG'
import '../../styles/ui-kit.css'

const cache = { PT, NG }
let loading = null
const loadAll = () => {
    loading = loading || import('country-flag-icons/string/3x2').then((all) => Object.assign(cache, all))
    return loading
}

export const Flag = ({ code }) => {
    const [svg, setSvg] = useState(() => cache[code] || null)

    useEffect(() => {
        if (cache[code]) { setSvg(cache[code]); return undefined }
        let alive = true
        loadAll().then(() => { if (alive) setSvg(cache[code] || null) }).catch(() => {})
        return () => { alive = false }
    }, [code])

    return <span className="ui-flag" aria-hidden="true" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
}
