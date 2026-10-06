import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, RotateCw, Search } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Picker } from '../../ui'
import { PlaceSearch } from '../../common/PlaceSearch'
import { MARKETS, LABELS, TIMES, WHEN, WHERE, bookingLink, dayWord, findMatches, keepEnginePlace, loadPopular, marketOf, reasons, saveCity, savedCity } from '../../../services/engine'
import { pickAddress, placesOn } from '../../../services/places'
import { loadZones } from '../../../services/setup'
import { payMoney } from '../../../services/payments'
import { withPeople } from '../../../services/formats'
import { USER_ERRORS } from '../../../services/booking'
import '../../../styles/client/engine.css'

const PEOPLE = Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? 'Just me' : `${i + 1} people` }))

const Option = ({ o, timeZone, onBook }) => {
    const why = reasons(o)
    return (
        <li className={`lc-eng__opt is-${o.label}`}>
            <span className="lc-eng__tag">{LABELS[o.label] || 'Free'}</span>
            <span className="lc-eng__main">
                <b className="lc-eng__biz">{o.business_name}</b>
                <span className="lc-eng__svc">{withPeople(o.service_name, Number(o.people))}{o.mode === 'at_client' ? ', at your place' : o.mode === 'online' ? ', online' : ''}</span>
                <span className="lc-eng__when">{dayWord(o.date, timeZone)} at <b>{o.time}</b></span>
                {why.length > 0 && <span className="lc-eng__why">{why.join(' · ')}</span>}
            </span>
            <span className="lc-eng__side">
                {o.price !== null && o.price !== undefined && <span className="lc-eng__price">{payMoney(o.price, o.currency || 'EUR')}</span>}
                <Button size="sm" iconRight={ArrowRight} onClick={() => onBook(o)}>{`Book ${o.time}`}</Button>
            </span>
        </li>
    )
}

// "What do you need?": what, where, when and how many, then up to three people free, each for a
// different reason. A tap opens that business's booking sheet at that time.
export const EngineBox = ({ title = 'What do you need?', browseTo = '/client/search' }) => {
    const navigate = useNavigate()
    const [city, setCity] = useState(savedCity)
    const market = marketOf(city)
    const [text, setText] = useState('')
    const [mode, setMode] = useState('')
    const [when, setWhen] = useState('today')
    const [time, setTime] = useState('any')
    const [people, setPeople] = useState('1')
    const [place, setPlace] = useState(null)
    const [zone, setZone] = useState('')
    const [zones, setZones] = useState([])
    const [search, setSearch] = useState('checking')
    const [popular, setPopular] = useState([])
    const [result, setResult] = useState({ status: 'idle', data: null, error: '' })

    useEffect(() => {
        let cancelled = false
        loadPopular(city).then((list) => { if (!cancelled) setPopular(list) }).catch(() => { if (!cancelled) setPopular([]) })
        loadZones(city).then((list) => { if (!cancelled) setZones(list) }).catch(() => { if (!cancelled) setZones([]) })
        return () => { cancelled = true }
    }, [city])

    useEffect(() => {
        if (mode !== 'at_client') return undefined
        let cancelled = false
        placesOn().then((on) => { if (!cancelled) setSearch(on ? 'on' : 'off') })
        return () => { cancelled = true }
    }, [mode])

    const pickCity = (code) => {
        setCity(code)
        saveCity(code)
        setPlace(null)
        setZone('')
        setResult({ status: 'idle', data: null, error: '' })
    }

    const run = async (over = {}) => {
        const what = (over.text ?? text).trim()
        const days = over.when ?? when
        if (!what) { setResult({ status: 'error', data: null, error: 'Say what you need, like "haircut" or "nails".' }); return }
        if (mode === 'at_client' && !place && !zone) { setResult({ status: 'error', data: null, error: 'Tell us where you are, so we only show people who come to you.' }); return }
        setResult({ status: 'loading', data: null, error: '' })
        try {
            const data = await findMatches({ market: city, text: what, mode, when: days, time, people: Number(people), place, zone })
            setResult({ status: 'ready', data, error: '' })
        } catch (err) {
            console.error('Engine failed:', err)
            setResult({ status: 'error', data: null, error: USER_ERRORS.includes(err?.code) || err?.code === '22023' ? err.message : 'We could not search right now. Try again.' })
        }
    }

    const book = (o) => {
        keepEnginePlace(o.mode === 'at_client' ? place : null)
        navigate(bookingLink(o))
    }

    const options = result.data?.options || []
    const later = result.data?.later || []

    return (
        <section className="lc-eng" aria-labelledby="lc-eng-title">
            <h2 id="lc-eng-title" className="lc-eng__title">{title}</h2>
            <form className="lc-eng__form" role="search" onSubmit={(e) => { e.preventDefault(); run() }}>
                <span className="lc-eng__what">
                    <Search size={18} aria-hidden="true" />
                    <input
                        type="search"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Haircut, gel nails, a cleaner, a tutor"
                        aria-label="What do you need"
                        autoComplete="off"
                        enterKeyHint="search"
                        maxLength={120}
                    />
                    <Button type="submit" size="sm" loading={result.status === 'loading'}>Find a time</Button>
                </span>
                {popular.length > 0 && (
                    <ChipGroup label="Popular">
                        {popular.map((c) => <Chip key={c.value} onClick={() => { setText(c.words); run({ text: c.words }) }}>{c.label}</Chip>)}
                    </ChipGroup>
                )}
                <div className="lc-eng__row">
                    <Picker value={city} onChange={pickCity} title="City" options={MARKETS.map((m) => ({ value: m.code, label: m.name }))} />
                    <Picker value={when} onChange={setWhen} title="When" options={WHEN} />
                    <Picker value={time} onChange={setTime} title="What time" options={TIMES} />
                    <Picker value={people} onChange={setPeople} title="How many people" options={PEOPLE} />
                    <Picker value={mode} onChange={(v) => { setMode(v); setResult((r) => ({ ...r, error: '' })) }} title="Where" options={WHERE} />
                </div>
                {mode === 'at_client' && (
                    <div className="lc-eng__place">
                        {place ? (
                            <div className="lc-place-picked">
                                <MapPin size={16} aria-hidden="true" />
                                <span className="lc-place-picked__text">{place.address}</span>
                                <button type="button" className="lc-place-picked__change" onClick={() => setPlace(null)}>Change</button>
                            </div>
                        ) : search === 'on' ? (
                            <Field label="Your address" hint="Only people who come to this address are shown">
                                <PlaceSearch
                                    market={city}
                                    resolve={(placeId, session) => pickAddress({ market: city, placeId, session })}
                                    onPicked={(p) => { setPlace(p); if (p.zone) setZone(p.zone) }}
                                    onOff={() => setSearch('off')}
                                    placeholder="Rua de Santa Catarina 120"
                                />
                            </Field>
                        ) : search === 'off' && zones.length > 0 ? (
                            <Field label="Your area">
                                <Picker value={zone} onChange={setZone} title="Your area" placeholder="Pick your area" options={zones.map((z) => ({ value: z, label: z }))} />
                            </Field>
                        ) : null}
                    </div>
                )}
            </form>

            <div className="lc-eng__out" aria-live="polite">
                {result.status === 'loading' && (
                    <ul className="lc-eng__opts" aria-hidden="true">
                        {[0, 1, 2].map((i) => <li key={i} className="lc-eng__opt is-skeleton"><span className="lc-skel" style={{ width: '70%', height: 16 }} /><span className="lc-skel" style={{ width: '40%', height: 12 }} /></li>)}
                    </ul>
                )}
                {result.status === 'error' && result.error && (
                    <p className="lc-eng__note" role="alert">{result.error}</p>
                )}
                {result.status === 'ready' && options.length > 0 && (
                    <ul className="lc-eng__opts">
                        {options.map((o) => <Option key={o.business_id} o={o} timeZone={market.timeZone} onBook={book} />)}
                    </ul>
                )}
                {result.status === 'ready' && options.length === 0 && later.length > 0 && (
                    <>
                        <p className="lc-eng__note">{`Nobody is free ${time === 'any' ? 'then' : TIMES.find((t) => t.value === time)?.label.toLowerCase() || 'then'}. ${later.length === 1 ? 'One is free' : 'These are free'} close to it:`}</p>
                        <ul className="lc-eng__opts">
                            {later.map((o) => <Option key={o.business_id} o={o} timeZone={market.timeZone} onBook={book} />)}
                        </ul>
                    </>
                )}
                {result.status === 'ready' && options.length === 0 && later.length === 0 && (
                    <div className="lc-eng__none">
                        <p className="lc-eng__note">
                            {Number(result.data?.matched) > 0
                                ? `Nobody that does this has a free time ${WHEN.find((w) => w.value === when)?.label.toLowerCase()}. Try another day.`
                                : `Nobody in ${market.name} offers that yet${mode === 'at_client' ? ' at your place' : ''}. Try other words, or browse every place.`}
                        </p>
                        <span className="lc-eng__noneactions">
                            {when !== 'soon' && Number(result.data?.matched) > 0 && <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => { setWhen('soon'); run({ when: 'soon' }) }}>Look at the next 3 days</Button>}
                            <Button size="sm" variant="quiet" to={browseTo}>Browse every place</Button>
                        </span>
                    </div>
                )}
            </div>
        </section>
    )
}
