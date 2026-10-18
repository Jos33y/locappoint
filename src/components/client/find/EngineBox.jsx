import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, MapPin, Search, X } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Picker } from '../../ui'
import { PlaceSearch } from '../../common/PlaceSearch'
import { MARKETS, LABELS, TIMES, WHERE, bookingLink, dayLabel, findMatches, keepEnginePlace, loadPopular, reasons, timeLabel, whenOptions, whenWords } from '../../../services/engine'
import { understand, without } from '../../../services/understand'
import { useCity } from '../../../hooks/useCity'
import { pickAddress, placesOn } from '../../../services/places'
import { loadZones } from '../../../services/setup'
import { payMoney } from '../../../services/payments'
import { withPeople } from '../../../services/formats'
import { USER_ERRORS } from '../../../services/booking'
import { ReliableBadge, VerifiedBadge } from '../../trust/Trust'
import { SERVED, countryName, noteSearch, visitorCountry } from '../../../services/demand'
import { TellMeWhen } from './TellMeWhen'
import '../../../styles/client/engine.css'

const WHEN_LABEL = { soonest: 'Soonest', today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', nextweek: 'Next week' }

// How many businesses offer it at all, free or not. Older answers without it: what had free times.
const offers = (data) => Number(data?.offered ?? data?.matched ?? 0)

// "Nobody is free on Tuesday 20 Oct. Next free:" or, the same day at another time, "These are free close to it".
const nobodyFree = (result, time, timeZone, count) => {
    const part = time === 'any' ? '' : `, ${timeLabel(time).toLowerCase()}`
    const when = whenWords(result.when || 'soonest', timeZone)
    if (result.data?.ahead) return `Nobody is free ${when === 'soon' ? 'soon' : when}${part}. Next free:`
    return `Nobody is free ${when === 'soon' ? 'then' : when}${part}. ${count === 1 ? 'One is free' : 'These are free'} close to it:`
}

const PEOPLE = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? 'Just me' : `${i + 1} people` }))

// Search that understands (doc 36). Every choice remembers where it came from: the words, a hand pick,
// or the default. Choices from the words reset when the words change, so a new search with no day goes
// back to Soonest; hand picks stay until changed.
const DEFAULTS = { when: 'soonest', time: 'any', people: '1', mode: '' }
const READ = { day: 'when', time: 'time', people: 'people', mode: 'mode' }
const withOption = (list, value, label) => (value && !list.some((o) => o.value === value) ? [...list, { value, label }] : list)

// One business: the service that fits the words best at its best time, the other free times that
// day, and its other services that fit, each with a time. One option alone carries no "Best match".
const Option = ({ o, timeZone, onBook, only = false }) => {
    const why = reasons(o)
    const more = (o.times || []).filter((t) => t !== o.time).slice(0, 6)
    const others = o.others || []
    return (
        <li className={`lc-eng__opt is-${o.label}${only ? ' is-only' : ''}`}>
            {!only && <span className="lc-eng__tag">{LABELS[o.label] || 'Free'}</span>}
            <span className="lc-eng__main">
                <b className="lc-eng__biz">{o.business_name}{o.verified && <> <VerifiedBadge small /></>}{o.reliable && <> <ReliableBadge small /></>}</b>
                {o.area && <span className="lc-eng__area">{o.area}</span>}
                <span className="lc-eng__svc">{withPeople(o.service_name, Number(o.people))}{o.mode === 'at_client' ? ', at your place' : o.mode === 'online' ? ', online' : ''}{o.minutes ? `, ${o.minutes} min` : ''}</span>
                <span className="lc-eng__when">{dayLabel(o.date, timeZone)} at <b>{o.time}</b></span>
                {why.length > 0 && <span className="lc-eng__why">{why.join(' · ')}</span>}
            </span>
            <span className="lc-eng__side">
                {o.price !== null && o.price !== undefined && <span className="lc-eng__price">{payMoney(o.price, o.currency || 'EUR')}</span>}
                <Button size="sm" iconRight={ArrowRight} onClick={() => onBook(o)}>{`Book ${o.time}`}</Button>
            </span>
            {more.length > 0 && (
                <span className="lc-eng__times" role="group" aria-label={`Other times for ${o.service_name}`}>
                    <span className="lc-eng__label">Other times</span>
                    {more.map((t) => <Button key={t} size="sm" variant="secondary" onClick={() => onBook({ ...o, time: t })}>{t}</Button>)}
                    <Button size="sm" variant="quiet" onClick={() => onBook(o)}>More times</Button>
                </span>
            )}
            {others.length > 0 && (
                <span className="lc-eng__also" role="group" aria-label="Other services here">
                    <span className="lc-eng__label">Also here</span>
                    {others.map((x) => (
                        <Button key={x.service_id} size="sm" variant="secondary" onClick={() => onBook({ ...o, service_id: x.service_id, service_name: x.service_name, date: x.date, time: x.time })}>
                            {`${x.service_name}, ${x.price !== null && x.price !== undefined ? `${payMoney(x.price, o.currency || 'EUR')}, ` : ''}${x.time}`}
                        </Button>
                    ))}
                </span>
            )}
        </li>
    )
}

// "What do you need?": what, where, when and how many, then up to three people free, each for a
// different reason. A tap opens that business's booking sheet at that time.
// compact: the one line and the popular chips first; when, what time, how many and where open behind
// "More options", with what is picked said in words, so a short list never sits under a long form.
export const EngineBox = ({ title = 'What do you need?', browseTo = '/client/search', compact = false }) => {
    const navigate = useNavigate()
    // The same city as the header switcher: changing it in either place changes both.
    const [market, pickMarket] = useCity()
    const city = market.code
    const [text, setText] = useState('')
    const [mode, setMode] = useState('')
    const [when, setWhen] = useState('soonest')
    const [time, setTime] = useState('any')
    const [people, setPeople] = useState('1')
    const [place, setPlace] = useState(null)
    const [zone, setZone] = useState('')
    const [zones, setZones] = useState([])
    const [search, setSearch] = useState('checking')
    const [popular, setPopular] = useState([])
    const [result, setResult] = useState({ status: 'idle', data: null, error: '' })
    const [more, setMore] = useState(false)
    const [from, setFrom] = useState({ when: 'default', time: 'default', people: 'default', mode: 'default' })
    const byHand = (field, set) => (v) => { set(v); setFrom((f) => ({ ...f, [field]: 'hand' })) }
    // Someone searching from a country we are not in: they may be booking for someone here, or asking
    // for Locappoint at home. Either way they are told, and can ask for their country.
    const [abroad, setAbroad] = useState(null)
    const [askHome, setAskHome] = useState(false)

    useEffect(() => {
        let cancelled = false
        visitorCountry().then((c) => { if (!cancelled && c && !SERVED.includes(c)) setAbroad(c) })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        let cancelled = false
        setPlace(null)
        setZone('')
        setResult({ status: 'idle', data: null, error: '' })
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

    const pickCity = (code) => pickMarket(code)
    const whenText = (v) => (String(v).startsWith('d:') ? dayLabel(String(v).slice(2), market.timeZone) : WHEN_LABEL[v] || v)
    const whens = withOption(whenOptions(market.timeZone), when, whenText(when))
    const times = withOption(TIMES, time, timeLabel(time))

    const run = async (over = {}) => {
        const typed = (over.text ?? text).trim()
        if (!typed) { setResult({ status: 'error', data: null, error: 'Say what you need, like "haircut" or "nails".' }); return }
        // Read the day, time, people and where from the words; what is left is what they want.
        const u = understand(typed, market.timeZone)
        const next = { when: over.when ?? when, time, people, mode }
        const src = { ...from }
        Object.entries(READ).forEach(([k, f]) => {
            if (u[k] != null) { next[f] = u[k]; src[f] = 'words' } else if (src[f] === 'words') { next[f] = DEFAULTS[f]; src[f] = 'default' }
        })
        if (over.when) { next.when = over.when; src.when = 'hand' }
        setWhen(next.when); setTime(next.time); setPeople(next.people); setMode(next.mode); setFrom(src)
        const understood = Object.entries(READ).filter(([k]) => u[k] != null).map(([k]) => ({ field: k, label: k === 'day' ? whenText(u.day) : u.labels[k] }))
        const asked = { understood, spans: u.spans, text: typed, when: next.when }
        if (next.mode === 'at_client' && !place && !zone) {
            if (compact) setMore(true)
            setResult({ status: 'error', data: null, error: 'Tell us where you are, so we only show people who come to you.', ...asked })
            return
        }
        setResult({ status: 'loading', data: null, error: '', ...asked })
        try {
            const data = await findMatches({ market: city, text: u.what, mode: next.mode, when: next.when, time: next.time, people: Number(next.people), place, zone })
            setResult({ status: 'ready', data, error: '', ...asked })
            noteSearch({ market: city, text: typed, mode: next.mode, people: next.people, place, zone, data })
        } catch (err) {
            console.error('Engine failed:', err)
            setResult({ status: 'error', data: null, error: USER_ERRORS.includes(err?.code) || err?.code === '22023' ? err.message : 'We could not search right now. Try again.', ...asked })
        }
    }

    // A chip's remove takes its phrase out of the words and searches again.
    const drop = (field) => {
        const next = without(result.text, result.spans || [], field)
        setText(next)
        run({ text: next })
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
                {compact && (
                    <button type="button" className="lc-eng__more" aria-expanded={more} aria-controls="lc-eng-options" onClick={() => setMore((m) => !m)}>
                        <span>{more ? 'Fewer options' : 'More options'}</span>
                        <span className="lc-eng__picked">{[whens.find((w) => w.value === when)?.label, timeLabel(time), PEOPLE.find((n) => n.value === people)?.label, WHERE.find((w) => w.value === mode)?.label].filter(Boolean).join(', ')}</span>
                    </button>
                )}
                {result.understood?.length > 0 && (
                    <div className="lc-eng__understood" role="group" aria-label="What we understood">
                        <span className="lc-eng__label">Understood</span>
                        {result.understood.map((c) => (
                            <button key={c.field} type="button" className="lc-eng__read" onClick={() => drop(c.field)} aria-label={`Remove ${c.label}`}>
                                {c.label}
                                <X size={14} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                )}
                <div className="lc-eng__row" id="lc-eng-options" hidden={compact && !more}>
                    <Picker value={city} onChange={pickCity} title="City" options={MARKETS.map((m) => ({ value: m.code, label: m.name }))} />
                    <Picker value={when} onChange={byHand('when', setWhen)} title="When" options={whens} />
                    <Picker value={time} onChange={byHand('time', setTime)} title="What time" options={times} />
                    <Picker value={people} onChange={byHand('people', setPeople)} title="How many people" options={PEOPLE} />
                    <Picker value={mode} onChange={(v) => { byHand('mode', setMode)(v); setResult((r) => ({ ...r, error: '' })) }} title="Where" options={WHERE} />
                </div>
                {mode === 'at_client' && (!compact || more) && (
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
                                    placeholder={market.street}
                                />
                            </Field>
                        ) : search === 'off' && zones.length > 0 ? (
                            <Field label="Your area">
                                <Picker value={zone} onChange={setZone} title="Your area" placeholder="Pick your area" searchable={zones.length > 12} searchPlaceholder="Search your area" options={zones.map((z) => ({ value: z, label: z }))} />
                            </Field>
                        ) : null}
                    </div>
                )}
            </form>

            {abroad && (
                <div className="lc-eng__abroad">
                    <p className="lc-eng__note">
                        <Globe size={16} aria-hidden="true" />
                        <span>{`You are in ${countryName(abroad)}. Locappoint books businesses in Nigeria and Portugal, so search here to book for someone there.`}</span>
                    </p>
                    {askHome
                        ? <TellMeWhen country={abroad} label={`Ask for ${countryName(abroad)}`} done={`Done. We will tell you when Locappoint opens in ${countryName(abroad)}.`} />
                        : <Button size="sm" variant="quiet" onClick={() => setAskHome(true)}>{`Want Locappoint in ${countryName(abroad)}?`}</Button>}
                </div>
            )}

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
                        {options.map((o) => <Option key={o.business_id} o={o} timeZone={market.timeZone} onBook={book} only={options.length === 1} />)}
                    </ul>
                )}
                {result.status === 'ready' && options.length === 0 && later.length > 0 && (
                    <>
                        <p className="lc-eng__note">{nobodyFree(result, time, market.timeZone, later.length)}</p>
                        <ul className="lc-eng__opts">
                            {later.map((o) => <Option key={o.business_id} o={o} timeZone={market.timeZone} onBook={book} />)}
                        </ul>
                    </>
                )}
                {result.status === 'ready' && options.length === 0 && later.length === 0 && (
                    <div className="lc-eng__none">
                        <p className="lc-eng__note">
                            {offers(result.data) > 0
                                ? 'Everyone who does this is fully booked for the next 3 weeks.'
                                : `Nobody in ${market.name} offers that yet${mode === 'at_client' ? ' at your place' : ''}. Try other words, or browse every place.`}
                        </p>
                        <span className="lc-eng__noneactions">
                            <Button size="sm" variant="quiet" to={browseTo}>Browse every place</Button>
                        </span>
                        <p className="lc-eng__note">{offers(result.data) > 0 ? 'Want to know when a time opens up?' : 'Want to know when someone near you offers it?'}</p>
                        <TellMeWhen key={`${result.text}-${city}`} text={result.text} market={city} zone={place?.zone || zone} done={offers(result.data) > 0 ? 'Done. We will tell you when a time opens up.' : undefined} />
                    </div>
                )}
            </div>
        </section>
    )
}
