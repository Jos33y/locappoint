import { useEffect, useId, useRef, useState } from 'react'
import { LoaderCircle, MapPin } from 'lucide-react'
import { newSession, suggestAddresses } from '../../services/places'
import '../../styles/client/places.css'

// An address field with Google's suggestions under it, in the flow of the page (no floating list, so
// it works inside a sheet on a phone). Picking one resolves it through `resolve`; when search is off
// or fails, `onOff` lets the parent fall back to a plain address field.
export const PlaceSearch = ({ id, businessId = null, market = null, resolve, onPicked, onOff, placeholder, 'aria-invalid': invalid, 'aria-describedby': describedBy }) => {
    const listId = useId()
    const [text, setText] = useState('')
    const [items, setItems] = useState([])
    const [active, setActive] = useState(-1)
    const [state, setState] = useState('idle')
    const session = useRef(newSession())
    const typed = useRef(false)

    useEffect(() => {
        const q = text.replace(/\s+/g, ' ').trim()
        if (!typed.current || q.length < 3) { setItems([]); setState('idle'); return undefined }
        let cancelled = false
        const timer = setTimeout(async () => {
            setState('searching')
            try {
                const found = await suggestAddresses({ businessId, market, input: q, session: session.current })
                if (cancelled) return
                if (found === null) { onOff?.(); return }
                setItems(found)
                setActive(-1)
                setState(found.length ? 'idle' : 'none')
            } catch (err) {
                console.error('Address search failed:', err)
                if (!cancelled) onOff?.()
            }
        }, 300)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [text, businessId, market]) // eslint-disable-line react-hooks/exhaustive-deps

    const choose = async (item) => {
        setState('picking')
        try {
            const place = await resolve(item.id, session.current)
            session.current = newSession()
            if (!place) { onOff?.(); return }
            typed.current = false
            setItems([])
            setState('idle')
            onPicked(place)
        } catch (err) {
            console.error('Address pick failed:', err)
            setState('failed')
        }
    }

    const onKeyDown = (event) => {
        if (!items.length) return
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((a) => (a + 1) % items.length) }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)) }
        else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(items[active]) }
        else if (event.key === 'Escape') { event.preventDefault(); setItems([]) }
    }

    const open = items.length > 0
    return (
        <div className="lc-place">
            <span className="lc-place__box">
                <input
                    id={id}
                    className="ui-input"
                    value={text}
                    maxLength={120}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={placeholder}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => { typed.current = true; setText(e.target.value) }}
                    onKeyDown={onKeyDown}
                />
                {(state === 'searching' || state === 'picking') && <LoaderCircle className="lc-place__spin" size={16} aria-hidden="true" />}
            </span>
            {open && (
                <div className="lc-place__pop">
                    <ul id={listId} role="listbox" aria-label="Addresses" className="lc-place__list">
                        {items.map((item, i) => (
                            <li
                                key={item.id}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className={`lc-place__option${i === active ? ' is-active' : ''}`}
                                onMouseDown={(e) => { e.preventDefault(); choose(item) }}
                                onMouseMove={() => setActive(i)}
                            >
                                <MapPin size={16} aria-hidden="true" />
                                <span>
                                    <span className="lc-place__one">{item.main}</span>
                                    {item.rest && <span className="lc-place__two">{item.rest}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <span className="lc-place__credit" translate="no">Google Maps</span>
                </div>
            )}
            {state === 'none' && <p className="lc-place__note">No address found. Try the street name and number.</p>}
            {state === 'failed' && <p className="lc-place__note" role="alert">That address did not open. Pick it again.</p>}
        </div>
    )
}
