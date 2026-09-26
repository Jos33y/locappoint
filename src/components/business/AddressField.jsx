import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import '../../styles/business/editors.css'

const lineOne = (p) => (p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : p.name || '')
const lineTwo = (p) => [p.postcode, p.city || p.town || p.village || p.locality].filter(Boolean).join(' ')
const fullAddress = (p) => [lineOne(p), lineTwo(p)].filter(Boolean).join(', ')

export const AddressField = ({ id, value, onChange, country, city, placeholder, 'aria-describedby': describedBy }) => {
    const listId = useId()
    const [results, setResults] = useState([])
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(-1)
    const typedRef = useRef(false)

    useEffect(() => {
        const q = value.trim()
        if (!typedRef.current || q.length < 4 || typeof fetch !== 'function') { setResults([]); return undefined }
        const controller = new AbortController()
        const timer = setTimeout(async () => {
            try {
                const query = encodeURIComponent(city ? `${q}, ${city}` : q)
                const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=6&lang=en`, { signal: controller.signal })
                if (!res.ok) return
                const data = await res.json()
                const found = (data.features || [])
                    .map((f) => f.properties || {})
                    .filter((p) => !country || (p.countrycode || '').toUpperCase() === country)
                    .filter((p) => lineOne(p))
                const unique = [...new Map(found.map((p) => [fullAddress(p), p])).values()].slice(0, 5)
                setResults(unique)
                setActive(-1)
                setOpen(unique.length > 0)
            } catch {
                setResults([])
            }
        }, 300)
        return () => { clearTimeout(timer); controller.abort() }
    }, [value, country, city])

    const choose = (p) => {
        typedRef.current = false
        onChange(fullAddress(p))
        setOpen(false)
        setResults([])
    }

    const onKeyDown = (event) => {
        if (!open || results.length === 0) return
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((a) => (a + 1) % results.length) }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)) }
        else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(results[active]) }
        else if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    }

    return (
        <span className="biz-address">
            <input
                id={id}
                className="ui-input"
                value={value}
                maxLength={200}
                autoComplete="street-address"
                placeholder={placeholder}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                aria-describedby={describedBy}
                onChange={(e) => { typedRef.current = true; onChange(e.target.value) }}
                onKeyDown={onKeyDown}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onFocus={() => { if (results.length) setOpen(true) }}
            />
            {open && (
                <span className="biz-address__pop">
                    <span id={listId} role="listbox" aria-label="Address suggestions" className="biz-address__list">
                        {results.map((p, i) => (
                            <span
                                key={fullAddress(p)}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className={`biz-address__option${i === active ? ' is-active' : ''}`}
                                onMouseDown={(e) => { e.preventDefault(); choose(p) }}
                                onMouseMove={() => setActive(i)}
                            >
                                <MapPin size={16} aria-hidden="true" />
                                <span>
                                    <span className="biz-address__one">{lineOne(p)}</span>
                                    <span className="biz-address__two">{lineTwo(p)}</span>
                                </span>
                            </span>
                        ))}
                    </span>
                    <span className="biz-address__credit">Suggestions from OpenStreetMap contributors</span>
                </span>
            )}
        </span>
    )
}
