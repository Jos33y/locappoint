import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, Settings } from 'lucide-react'
import { NAV_FOOT, NAV_ITEMS } from './nav'
import '../../styles/business/palette.css'

const PAGES = [...NAV_ITEMS, ...NAV_FOOT, { to: '/portal/settings', label: 'Settings', icon: Settings }]

const CommandPalette = ({ open, onClose, actions }) => {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const inputRef = useRef(null)
    const listRef = useRef(null)

    useEffect(() => {
        if (!open) return
        setQuery('')
        setActive(0)
    }, [open])

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase()
        const match = (item) => !q || item.label.toLowerCase().includes(q) || item.keywords?.some((k) => k.includes(q))
        return [
            { label: 'Actions', items: actions.filter(match) },
            { label: 'Go to', items: PAGES.filter(match) },
        ].filter((g) => g.items.length)
    }, [query, actions])

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
                        placeholder="Jump to a page or action"
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
                                        key={`${group.label}-${item.label}`}
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
                <p className="lc-cmd__foot">Searching clients and bookings arrives with Clients.</p>
            </div>
        </div>,
        document.body
    )
}

export default CommandPalette
