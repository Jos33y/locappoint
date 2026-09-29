import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, User } from 'lucide-react'
import { PALETTE_PAGES, STAFF_PALETTE_PAGES } from './nav'
import { loadClients } from '../../services/clients'
import '../../styles/business/palette.css'

const CommandPalette = ({ open, onClose, actions, businessId, staff = false }) => {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const inputRef = useRef(null)
    const listRef = useRef(null)
    const [clients, setClients] = useState([])

    useEffect(() => {
        if (!open) return
        setQuery('')
        setActive(0)
    }, [open])

    // Clients load when the palette first opens, then stay for the session.
    useEffect(() => {
        if (!open || !businessId || clients.length) return
        loadClients(businessId)
            .then((list) => setClients((list || []).map((c) => ({
                key: c.key,
                label: c.name,
                icon: User,
                to: `/portal/clients?client=${encodeURIComponent(c.key)}`,
                keywords: [c.email, (c.phone || '').replace(/\D/g, '')].filter(Boolean).map((k) => k.toLowerCase()),
            }))))
            .catch((err) => console.error('Palette clients failed:', err))
    }, [open, businessId, clients.length])

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase()
        const digits = q.replace(/\D/g, '')
        const match = (item) => !q || item.label.toLowerCase().includes(q) || item.keywords?.some((k) => k.includes(q) || (digits.length >= 3 && k.includes(digits)))
        return [
            { label: 'Actions', items: actions.filter(match) },
            { label: 'Go to', items: (staff ? STAFF_PALETTE_PAGES : PALETTE_PAGES).filter(match) },
            { label: 'Clients', items: q.length >= 2 ? clients.filter(match).slice(0, 6) : [] },
        ].filter((g) => g.items.length)
    }, [query, actions, clients, staff])

    const flat = groups.flatMap((g) => g.items)

    useEffect(() => { setActive(0) }, [query])

    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    }, [active])

    if (!open) return null

    const run = (item) => {
        onClose()
        if (item.run) item.run()
        else navigate(item.to)
    }

    const onKeyDown = (event) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose() }
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
        if (event.key === 'Enter' && flat[active]) { event.preventDefault(); run(flat[active]) }
    }

    let index = -1
    return createPortal(
        <div className="lc-cmd" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <div className="lc-cmd__panel" role="dialog" aria-modal="true" aria-label="Jump to a page or action" onKeyDown={onKeyDown}>
                <div className="lc-cmd__search">
                    <Search size={18} aria-hidden="true" />
                    <input
                        ref={inputRef}
                        autoFocus
                        className="lc-cmd__input"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Jump to a page, action or client"
                        aria-label="Jump to a page or action"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="lc-cmd-list"
                        aria-activedescendant={flat[active] ? `lc-cmd-${active}` : undefined}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    <kbd className="lc-cmd__esc">Esc</kbd>
                </div>
                <div ref={listRef} id="lc-cmd-list" className="lc-cmd__list" role="listbox" aria-label="Results">
                    {flat.length === 0 && <p className="lc-cmd__empty">Nothing matches "{query}".</p>}
                    {groups.map((group) => (
                        <div key={group.label} role="group" aria-label={group.label}>
                            <p className="lc-cmd__group">{group.label}</p>
                            {group.items.map((item) => {
                                index += 1
                                const i = index
                                const Icon = item.icon
                                return (
                                    <div
                                        key={`${group.label}-${item.key || item.label}`}
                                        id={`lc-cmd-${i}`}
                                        role="option"
                                        aria-selected={i === active}
                                        className={`lc-cmd__item${i === active ? ' is-active' : ''}`}
                                        onMouseMove={() => setActive(i)}
                                        onClick={() => run(item)}
                                    >
                                        {Icon && <Icon size={17} aria-hidden="true" />}
                                        <span className="lc-cmd__label">{item.label}</span>
                                        {item.planned && <span className="biz-soon">Soon</span>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
                <p className="lc-cmd__foot">Type a name, phone or email to find a client.</p>
            </div>
        </div>,
        document.body
    )
}

export default CommandPalette
