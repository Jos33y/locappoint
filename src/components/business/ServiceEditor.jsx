import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, GripVertical, House, Plus, Store, Trash2, Users, Video } from 'lucide-react'
import { AffixInput, Button, Chip, ChipGroup, Field, Input, Switch, Textarea } from '../ui'
import { durationLabel, menuPrice } from '../../services/business'
import { DurationDial } from './DurationDial'
import '../../styles/business/editors.css'

const DURATIONS = [15, 30, 45, 60, 90, 120]

let nextKey = 0
export const newServiceKey = () => `new-${++nextKey}`

export const blankService = (name = '', minutes = 30) => ({
    key: newServiceKey(),
    service_name: name,
    duration_minutes: minutes,
    price: '',
    description: '',
    is_active: true,
    is_addon: false,
    modes: ['at_business'],
    travel_fee: '',
    max_people: 1,
    price_per: 'booking',
    extra_person_minutes: '',
})

export const serviceFromRow = (row) => ({
    key: row.id,
    id: row.id,
    service_name: row.service_name,
    duration_minutes: row.duration_minutes,
    price: String(row.price),
    description: row.description || '',
    is_active: row.is_active !== false,
    is_addon: row.is_addon === true,
    modes: Array.isArray(row.modes) && row.modes.length ? row.modes : ['at_business'],
    travel_fee: Number(row.travel_fee) > 0 ? String(row.travel_fee) : '',
    max_people: Number(row.max_people) || 1,
    price_per: row.price_per === 'person' ? 'person' : 'booking',
    extra_person_minutes: row.extra_person_minutes === null || row.extra_person_minutes === undefined ? '' : String(row.extra_person_minutes),
})

// Groups: off at one person. Turned on, four people priced per person, each taking the full time.
export const GROUP_SIZES = [2, 3, 4, 5, 6, 8, 10]
export const takesGroups = (service) => Number(service.max_people) > 1

// Where a service happens. Visits at the client's place come next.
export const MODES = [
    { value: 'at_business', label: 'At your place of business', short: 'In person', icon: Store },
    { value: 'at_client', label: "At the client's place", short: 'Home visits', icon: House },
    { value: 'online', label: 'Online', short: 'Online', icon: Video },
]
export const isOnline = (service) => (service.modes || []).includes('online')
export const visitsClients = (service) => (service.modes || []).includes('at_client')
export const modeTag = (service) => {
    const modes = service.modes || ['at_business']
    const where = modes.length === 1 && modes[0] === 'at_business' ? [] : MODES.filter((m) => modes.includes(m.value)).map((m) => m.short)
    return [...where, ...(takesGroups(service) ? [`Up to ${service.max_people} people`] : [])].join(', ')
}

const parsePrice = (price) => Number(String(price).replace(',', '.').trim())

export const serviceProblems = (service) => {
    const problems = {}
    const name = service.service_name.trim()
    if (!name) problems.service_name = 'Give it a name clients will recognise'
    else if (name.length > 80) problems.service_name = 'Keep the name under 80 characters'
    const minutes = Number(service.duration_minutes)
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) problems.duration_minutes = 'Between 5 minutes and 10 hours'
    const price = String(service.price).trim()
    if (price === '' || Number.isNaN(parsePrice(price)) || parsePrice(price) < 0) problems.price = 'Enter a price, or 0 if it is free'
    const travel = String(service.travel_fee ?? '').trim()
    if (visitsClients(service) && travel !== '' && (Number.isNaN(parsePrice(travel)) || parsePrice(travel) < 0 || parsePrice(travel) > 500)) problems.travel_fee = 'A travel fee between 0 and 500, or leave it empty'
    const extra = String(service.extra_person_minutes ?? '').trim()
    if (takesGroups(service) && extra !== '' && (!/^\d+$/.test(extra) || Number(extra) > 600)) problems.extra_person_minutes = 'Minutes between 0 and 600, or leave it empty'
    return problems
}

export const servicesValid = (services) =>
    services.length > 0 && services.every((s) => Object.keys(serviceProblems(s)).length === 0)

const ServiceForm = ({ service, onChange, onDone, onRemove, showErrors, focusField, showVisibility }) => {
    const nameRef = useRef(null)
    const priceRef = useRef(null)
    const custom = !DURATIONS.includes(Number(service.duration_minutes))
    const [otherOpen, setOtherOpen] = useState(custom)
    const problems = showErrors ? serviceProblems(service) : {}
    const set = (patch) => onChange({ ...service, ...patch })

    useEffect(() => {
        const target = focusField === 'price' ? priceRef.current : nameRef.current
        target?.focus()
    }, [focusField])

    return (
        <div className="biz-svc__form">
            <Field label="Service name" error={problems.service_name}>
                <Input
                    ref={nameRef}
                    value={service.service_name}
                    onChange={(e) => set({ service_name: e.target.value })}
                    placeholder="Haircut"
                    maxLength={80}
                    autoComplete="off"
                />
            </Field>

            <div className="biz-svc__row">
                <Field label="How long it takes" error={problems.duration_minutes}>
                    <ChipGroup label="Duration">
                        {DURATIONS.map((m) => (
                            <Chip
                                key={m}
                                selected={!otherOpen && Number(service.duration_minutes) === m}
                                onClick={() => { setOtherOpen(false); set({ duration_minutes: m }) }}
                            >
                                <DurationDial minutes={m} size={16} className="biz-dial--chip" />
                                {durationLabel(m)}
                            </Chip>
                        ))}
                        <Chip selected={otherOpen} onClick={() => setOtherOpen(true)}>Other</Chip>
                    </ChipGroup>
                </Field>
                {otherOpen && (
                    <Field label="Minutes">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={5}
                            max={600}
                            step={5}
                            value={service.duration_minutes}
                            onChange={(e) => set({ duration_minutes: e.target.value === '' ? '' : Number(e.target.value) })}
                        />
                    </Field>
                )}
            </div>

            <Field label="Price" error={problems.price}>
                <AffixInput
                    prefix="€"
                    mono
                    ref={priceRef}
                    inputMode="decimal"
                    value={service.price}
                    onChange={(e) => set({ price: e.target.value.replace(/[^\d.,]/g, '') })}
                    placeholder="15"
                    autoComplete="off"
                />
            </Field>

            <Field label="Where it happens" hint={isOnline(service) ? 'Online clients get your meeting link once the booking is confirmed.' : 'Pick more than one if clients can choose.'}>
                <ChipGroup label="Where it happens">
                    {MODES.map(({ value, label, icon: Icon }) => {
                        const modes = service.modes || ['at_business']
                        const on = modes.includes(value)
                        return (
                            <Chip
                                key={value}
                                selected={on}
                                onClick={() => {
                                    const next = on ? modes.filter((m) => m !== value) : [...modes, value]
                                    if (next.length) set({ modes: MODES.map((m) => m.value).filter((m) => next.includes(m)) })
                                }}
                            >
                                <Icon size={15} aria-hidden="true" />{label}
                            </Chip>
                        )
                    })}
                </ChipGroup>
            </Field>

            {visitsClients(service) && (
                <Field label="Travel fee" optional error={problems.travel_fee} hint="Added to the price for visits at the client's place. Leave empty for none.">
                    <AffixInput
                        prefix="€"
                        mono
                        inputMode="decimal"
                        value={service.travel_fee ?? ''}
                        onChange={(e) => set({ travel_fee: e.target.value.replace(/[^\d.,]/g, '') })}
                        placeholder="0"
                        autoComplete="off"
                    />
                </Field>
            )}

            {showVisibility && (
                <Switch
                    checked={takesGroups(service)}
                    onChange={(on) => set(on ? { max_people: 4, price_per: 'person' } : { max_people: 1, extra_person_minutes: '' })}
                    label="Book for a group"
                    description={takesGroups(service)
                        ? 'One person books for several. You do them one after another, in one booking.'
                        : 'One person per booking.'}
                />
            )}

            {showVisibility && takesGroups(service) && (
                <div className="biz-svc__group">
                    <Field label="Up to how many people">
                        <ChipGroup label="Up to how many people">
                            {GROUP_SIZES.map((n) => (
                                <Chip key={n} selected={Number(service.max_people) === n} onClick={() => set({ max_people: n })}>
                                    <Users size={14} aria-hidden="true" />{n}
                                </Chip>
                            ))}
                        </ChipGroup>
                    </Field>
                    <Field label="Price" hint={service.price_per === 'person' ? `Three people pay ${menuPrice(parsePrice(service.price || 0) * 3)}.` : 'The same price however many come.'}>
                        <ChipGroup label="Price for a group">
                            <Chip selected={service.price_per === 'person'} onClick={() => set({ price_per: 'person' })}>Per person</Chip>
                            <Chip selected={service.price_per !== 'person'} onClick={() => set({ price_per: 'booking' })}>For the whole group</Chip>
                        </ChipGroup>
                    </Field>
                    <Field
                        label="Minutes for each extra person"
                        optional
                        error={problems.extra_person_minutes}
                        hint={`Leave empty if each person takes the full ${durationLabel(Number(service.duration_minutes) || 0)}.`}
                    >
                        <Input
                            inputMode="numeric"
                            value={service.extra_person_minutes ?? ''}
                            onChange={(e) => set({ extra_person_minutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                            placeholder={String(Number(service.duration_minutes) || '')}
                            autoComplete="off"
                        />
                    </Field>
                </div>
            )}

            <Field label="Description" optional hint="One line under the name on your page">
                <Textarea
                    value={service.description}
                    onChange={(e) => set({ description: e.target.value })}
                    maxLength={240}
                    rows={2}
                    placeholder="Clippers and scissors, finished with a hot towel"
                />
            </Field>

            {showVisibility && (
                <Switch
                    checked={service.is_active !== false}
                    onChange={(on) => set({ is_active: on })}
                    label="Show on your page"
                    description={service.is_active !== false ? 'Clients can book this service.' : 'Hidden. Clients cannot book it, and past bookings keep their details.'}
                />
            )}

            {showVisibility && (
                <Switch
                    checked={service.is_addon === true}
                    onChange={(on) => set({ is_addon: on })}
                    label="Offer as an extra"
                    description={service.is_addon ? 'Clients can add it to another service, in the same booking. It can still be booked on its own.' : 'Only booked on its own.'}
                />
            )}

            <div className="biz-svc__formactions">
                <Button variant="quiet" size="sm" icon={Trash2} onClick={onRemove}>Remove</Button>
                <Button variant="secondary" size="sm" icon={Check} onClick={onDone}>Done</Button>
            </div>
        </div>
    )
}

export { DurationDial, menuPrice }

export const PriceBoard = () => (
    <svg className="biz-board" width="140" height="108" viewBox="0 0 140 108" aria-hidden="true">
        <rect className="biz-board__frame" x="10" y="8" width="120" height="92" rx="12" />
        <rect className="biz-board__title" x="26" y="22" width="44" height="7" rx="3.5" />
        {[42, 58, 74].map((y, i) => (
            <g key={y}>
                <rect className="biz-board__line" x="26" y={y} width={[40, 30, 36][i]} height="5" rx="2.5" />
                <line className="biz-board__dots" x1={[70, 60, 66][i]} y1={y + 2.5} x2="96" y2={y + 2.5} />
                <rect className="biz-board__price" x="100" y={y - 1} width="16" height="7" rx="3.5" />
            </g>
        ))}
        <circle className="biz-board__tag" cx="118" cy="22" r="4" />
    </svg>
)

const SUGGEST_UNTIL = 3

const useDragOrder = (onMove) => {
    const listRef = useRef(null)
    const [drag, setDrag] = useState(null)

    const start = (event, index) => {
        if (event.button !== undefined && event.button !== 0) return
        const rows = [...listRef.current.children].map((el) => el.getBoundingClientRect())
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setDrag({ index, target: index, startY: event.clientY, dy: 0, rows })
    }

    const move = (event) => {
        if (!drag) return
        const dy = event.clientY - drag.startY
        const own = drag.rows[drag.index]
        const centre = own.top + own.height / 2 + dy
        let target = drag.rows.findIndex((r) => centre < r.top + r.height / 2)
        if (target === -1) target = drag.rows.length - 1
        else if (target > drag.index) target -= 1
        setDrag({ ...drag, dy, target })
    }

    const end = () => {
        if (!drag) return
        if (drag.target !== drag.index) onMove(drag.index, drag.target)
        setDrag(null)
    }

    const offset = (index) => {
        if (!drag) return undefined
        if (index === drag.index) return { transform: `translateY(${drag.dy}px)`, zIndex: 2 }
        const height = drag.rows[drag.index].height
        if (drag.index < drag.target && index > drag.index && index <= drag.target) return { transform: `translateY(${-height}px)` }
        if (drag.index > drag.target && index < drag.index && index >= drag.target) return { transform: `translateY(${height}px)` }
        return { transform: 'translateY(0)' }
    }

    return { listRef, drag, start, move, end, offset }
}

export const ServiceEditor = ({ services, onChange, suggestions = [], showErrors = false, showVisibility = false, onRemove }) => {
    const [editing, setEditing] = useState(() => (services.length === 1 && !services[0].id ? services[0].key : null))
    const [focusField, setFocusField] = useState('name')
    const handles = useRef(new Map())
    const [refocus, setRefocus] = useState(null)

    const replace = (key, next) => onChange(services.map((s) => (s.key === key ? next : s)))
    const drop = (key) => {
        onChange(services.filter((s) => s.key !== key))
        if (editing === key) setEditing(null)
    }
    const remove = (key) => {
        if (onRemove) onRemove(services.find((s) => s.key === key), () => drop(key))
        else drop(key)
    }
    const moveTo = (from, to) => {
        if (to < 0 || to >= services.length || from === to) return
        const next = [...services]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        onChange(next)
    }
    const add = (name, minutes) => {
        const service = blankService(name, minutes)
        onChange([...services, service])
        setFocusField(name ? 'price' : 'name')
        setEditing(service.key)
    }

    const order = useDragOrder(moveTo)

    useEffect(() => {
        if (!refocus) return
        handles.current.get(refocus)?.focus()
        setRefocus(null)
    }, [refocus, services])

    const onHandleKey = (event, index, key) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        moveTo(index, index + (event.key === 'ArrowUp' ? -1 : 1))
        setRefocus(key)
    }

    const taken = new Set(services.map((s) => s.service_name.trim().toLowerCase()))
    const open = services.length < SUGGEST_UNTIL ? suggestions.filter(([name]) => !taken.has(name.toLowerCase())) : []
    const sortable = services.length > 1

    return (
        <div className="biz-svc">
            <div className={`biz-svc__menu${order.drag ? ' is-dragging' : ''}`}>
                {services.length > 0 && (
                    <div className="biz-svc__cols" aria-hidden="true">
                        <span>Service</span>
                        <span>Time</span>
                        <span>Price</span>
                    </div>
                )}
                {services.length > 0 && (
                    <ol className="biz-svc__list" ref={order.listRef}>
                        {services.map((service, index) => {
                            const invalid = showErrors && Object.keys(serviceProblems(service)).length > 0
                            const isOpen = editing === service.key || invalid
                            const name = service.service_name.trim() || 'New service'
                            const hidden = service.is_active === false
                            const minutes = Number(service.duration_minutes)
                            const hasPrice = String(service.price).trim() !== '' && !Number.isNaN(parsePrice(service.price))
                            const dragging = order.drag?.index === index
                            return (
                                <li
                                    key={service.key}
                                    className={`biz-svc__item${isOpen ? ' is-open' : ''}${invalid ? ' has-error' : ''}${hidden ? ' is-hidden' : ''}${dragging ? ' is-lifted' : ''}`}
                                    style={order.offset(index)}
                                >
                                    {isOpen ? (
                                        <ServiceForm
                                            service={service}
                                            showErrors={showErrors}
                                            showVisibility={showVisibility}
                                            focusField={editing === service.key ? focusField : null}
                                            onChange={(next) => replace(service.key, next)}
                                            onDone={() => setEditing(null)}
                                            onRemove={() => remove(service.key)}
                                        />
                                    ) : (
                                        <div className="biz-svc__summary">
                                            {sortable && (
                                                <button
                                                    type="button"
                                                    ref={(el) => { if (el) handles.current.set(service.key, el); else handles.current.delete(service.key) }}
                                                    className="biz-svc__handle"
                                                    aria-label={`Reorder ${name}. Use the up and down arrow keys.`}
                                                    onPointerDown={(event) => order.start(event, index)}
                                                    onPointerMove={order.move}
                                                    onPointerUp={order.end}
                                                    onPointerCancel={order.end}
                                                    onKeyDown={(event) => onHandleKey(event, index, service.key)}
                                                >
                                                    <GripVertical size={18} aria-hidden="true" />
                                                </button>
                                            )}
                                            <button type="button" className="biz-svc__open" onClick={() => { setFocusField('name'); setEditing(service.key) }}>
                                                <DurationDial minutes={minutes} className="biz-svc__dial" />
                                                <span className="biz-svc__main">
                                                    <span className="biz-svc__name">{name}</span>
                                                    {hidden && <span className="biz-svc__hidden">Hidden</span>}
                                                    {service.is_addon && !hidden && <span className="biz-svc__hidden">Extra</span>}
                                                    {modeTag(service) && !hidden && <span className="biz-svc__hidden">{modeTag(service)}</span>}
                                                    {service.description?.trim() && <span className="biz-svc__desc">{service.description.trim()}</span>}
                                                </span>
                                                <span className="biz-svc__time">{minutes ? durationLabel(minutes) : 'No time'}</span>
                                                <span className="biz-svc__price">{hasPrice ? menuPrice(service.price) : 'No price'}</span>
                                                <ChevronRight size={16} aria-hidden="true" className="biz-svc__chevron" />
                                            </button>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                )}
                {services.length === 0 && (
                    <div className="biz-svc__empty">
                        <PriceBoard />
                        <div>
                            <h3 className="biz-svc__emptytitle">Your price board is empty</h3>
                            <p>Add what clients can book, how long it takes and what it costs.</p>
                        </div>
                    </div>
                )}
                <button type="button" className="biz-svc__addrow" onClick={() => add('', 30)}>
                    <span className="biz-svc__addicon" aria-hidden="true"><Plus size={16} /></span>
                    {services.length === 0 ? 'Add a service' : 'Add another service'}
                </button>
            </div>

            {open.length > 0 && (
                <div className="biz-svc__suggest">
                    <span className="biz-svc__suggestlabel">Popular for you</span>
                    <ChipGroup label="Suggested services">
                        {open.map(([name, minutes]) => (
                            <Chip key={name} onClick={() => add(name, minutes)}>
                                <Plus size={14} aria-hidden="true" />{name}
                                <span className="biz-svc__chipmeta"><DurationDial minutes={minutes} size={14} />{durationLabel(minutes)}</span>
                            </Chip>
                        ))}
                    </ChipGroup>
                </div>
            )}
        </div>
    )
}
