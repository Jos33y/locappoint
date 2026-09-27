import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { AffixInput, Button, Chip, ChipGroup, Field, Input, Switch, Textarea } from '../ui'
import { durationLabel } from '../../services/business'
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
})

export const serviceFromRow = (row) => ({
    key: row.id,
    id: row.id,
    service_name: row.service_name,
    duration_minutes: row.duration_minutes,
    price: String(row.price),
    description: row.description || '',
    is_active: row.is_active !== false,
})

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

            <div className="biz-svc__formactions">
                <Button variant="quiet" size="sm" icon={Trash2} onClick={onRemove}>Remove</Button>
                <Button variant="secondary" size="sm" icon={Check} onClick={onDone}>Done</Button>
            </div>
        </div>
    )
}

const priceFormat = new Map()

export const menuPrice = (value) => {
    const amount = parsePrice(value)
    const decimals = Number.isInteger(amount) ? 0 : 2
    if (!priceFormat.has(decimals)) {
        priceFormat.set(decimals, new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
    }
    return priceFormat.get(decimals).format(amount)
}

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
                                                <span className="biz-svc__main">
                                                    <span className="biz-svc__name">{name}</span>
                                                    {hidden && <span className="biz-svc__hidden">Hidden</span>}
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
                                <span className="biz-svc__chipmeta">{durationLabel(minutes)}</span>
                            </Chip>
                        ))}
                    </ChipGroup>
                </div>
            )}
        </div>
    )
}
