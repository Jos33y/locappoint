import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { AffixInput, Button, Chip, ChipGroup, Field, IconButton, Input, Textarea } from '../ui'
import { durationLabel, formatMoney } from '../../services/business'
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

const ServiceForm = ({ service, onChange, onDone, onRemove, showErrors, focusField }) => {
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

            <div className="biz-svc__formactions">
                <Button variant="quiet" size="sm" icon={Trash2} onClick={onRemove}>Remove</Button>
                <Button variant="secondary" size="sm" icon={Check} onClick={onDone}>Done</Button>
            </div>
        </div>
    )
}

export const ServiceEditor = ({ services, onChange, suggestions = [], showErrors = false }) => {
    const [editing, setEditing] = useState(() => (services.length === 1 && !services[0].id ? services[0].key : null))
    const [focusField, setFocusField] = useState('name')

    const replace = (key, next) => onChange(services.map((s) => (s.key === key ? next : s)))
    const remove = (key) => {
        onChange(services.filter((s) => s.key !== key))
        if (editing === key) setEditing(null)
    }
    const move = (index, by) => {
        const next = [...services]
        const [item] = next.splice(index, 1)
        next.splice(index + by, 0, item)
        onChange(next)
    }
    const add = (name, minutes) => {
        const service = blankService(name, minutes)
        onChange([...services, service])
        setFocusField(name ? 'price' : 'name')
        setEditing(service.key)
    }

    const taken = new Set(services.map((s) => s.service_name.trim().toLowerCase()))
    const open = suggestions.filter(([name]) => !taken.has(name.toLowerCase()))

    return (
        <div className="biz-svc">
            {services.length > 0 && (
                <ol className="biz-svc__list">
                    {services.map((service, index) => {
                        const invalid = showErrors && Object.keys(serviceProblems(service)).length > 0
                        const isOpen = editing === service.key || invalid
                        const name = service.service_name.trim() || 'New service'
                        return (
                            <li key={service.key} className={`biz-svc__item${isOpen ? ' is-open' : ''}${invalid ? ' has-error' : ''}`}>
                                {isOpen ? (
                                    <ServiceForm
                                        service={service}
                                        showErrors={showErrors}
                                        focusField={editing === service.key ? focusField : null}
                                        onChange={(next) => replace(service.key, next)}
                                        onDone={() => setEditing(null)}
                                        onRemove={() => remove(service.key)}
                                    />
                                ) : (
                                    <div className="biz-svc__summary">
                                        <button type="button" className="biz-svc__open" onClick={() => { setFocusField('name'); setEditing(service.key) }}>
                                            <span className="biz-svc__name">{name}</span>
                                            <span className="biz-svc__meta">
                                                {Number(service.duration_minutes) ? durationLabel(Number(service.duration_minutes)) : 'No duration'}
                                            </span>
                                            <span className="biz-svc__price">
                                                {String(service.price).trim() === '' ? 'No price' : formatMoney(parsePrice(service.price))}
                                            </span>
                                            <ChevronRight size={16} aria-hidden="true" className="biz-svc__chevron" />
                                        </button>
                                        {services.length > 1 && (
                                            <span className="biz-svc__order">
                                                <IconButton icon={ArrowUp} variant="quiet" size="sm" label={`Move ${name} up`} disabled={index === 0} onClick={() => move(index, -1)} />
                                                <IconButton icon={ArrowDown} variant="quiet" size="sm" label={`Move ${name} down`} disabled={index === services.length - 1} onClick={() => move(index, 1)} />
                                            </span>
                                        )}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ol>
            )}

            <div className="biz-svc__add">
                <Button variant="secondary" icon={Plus} onClick={() => add('', 30)}>
                    {services.length === 0 ? 'Add a service' : 'Add another service'}
                </Button>
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
        </div>
    )
}
