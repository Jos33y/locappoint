import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, MapPin, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Picker } from '../../ui'
import { PlaceSearch } from '../../common/PlaceSearch'
import { COUNTRIES, MARKETS, LABELS, TIMES, WHERE, bookingLink, countryOf, dayLabel, findMatches, keepEnginePlace, loadCountryZones, loadPopular, reasons, timeLabel, whenOptions, whenWords } from '../../../services/engine'
import { understand, without } from '../../../services/understand'
import { askAI, needsAI } from '../../../services/ai'
import { useCountry } from '../../../hooks/useCountry'
import { pickAddress, placesOn } from '../../../services/places'
import { payMoney } from '../../../services/payments'
import { withPeople } from '../../../services/formats'
import { USER_ERRORS } from '../../../services/booking'
import { ReliableBadge, VerifiedBadge } from '../../trust/Trust'
import { SERVED, countryName, maskContact, noteSearch, placeInterest, visitorCountry } from '../../../services/demand'
import { WEB_ORIGIN } from '../../../services/native'
import CityPattern from '../../brand/CityPattern'
import { patternOf } from '../../brand/world'
import { pickWorld } from '../../brand/worlds'
import { PT_MUNICIPALITIES, REGIONS } from '../../../constants/locations'
import { TellMeWhen } from './TellMeWhen'
import { AbroadScene, NotedScene, PlaceScene } from './Scenes'
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
// Read from the words for this search only: a place, a price limit, cheapest first.
const EXTRA = ['place', 'price', 'order']
const plain = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
// One of our cities named ("barber in Porto"): its country, and the city as the place to lift.
const cityNamed = (name) => {
    const m = MARKETS.find((x) => plain(x.name) === plain(name) || (x.code === 'lisbon' && plain(name) === 'lisboa'))
    return m ? { country: countryOf(m.code).code, name: m.name } : null
}
const withOption = (list, value, label) => (value && !list.some((o) => o.value === value) ? [...list, { value, label }] : list)

// One business, in full: its world as a strap, who and where, the time it is free, the service that
// fits the words with its length and price, the other free times that day, its other services that
// fit, and one button. One option alone carries no "Best match".
const Option = ({ o, timeZone, onBook, market, only = false }) => {
    const why = reasons(o)
    const more = (o.times || []).filter((t) => t !== o.time).slice(0, 4)
    const others = o.others || []
    const day = dayLabel(o.date, timeZone)
    return (
        <li className={`lc-eng__opt is-lead is-${o.label}${only ? ' is-only' : ''}`}>
            <span className="lc-eng__strap" aria-hidden="true"><CityPattern world={patternOf({ id: o.business_id, city: o.city, market })} centred size={12} /></span>
            <span className="lc-eng__head">
                <span className="lc-eng__main">
                    {!only && <span className="lc-eng__tag">{LABELS[o.label] || 'Free'}</span>}
                    <b className="lc-eng__biz">{o.business_name}{o.verified && <> <VerifiedBadge small /></>}{o.reliable && <> <ReliableBadge small /></>}</b>
                    {o.area && <span className="lc-eng__area">{o.area}</span>}
                </span>
                <span className="lc-eng__at">
                    <b className="lc-eng__time">{o.time}</b>
                    <span className="lc-eng__when">{day}</span>
                </span>
            </span>
            <span className="lc-eng__svcbox">
                <span className="lc-eng__svcwords">
                    <span className="lc-eng__svc">{withPeople(o.service_name, Number(o.people))}{o.mode === 'at_client' ? ', at your place' : o.mode === 'online' ? ', online' : ''}</span>
                    {o.minutes ? <span className="lc-eng__mins">{`${o.minutes} min`}</span> : null}
                </span>
                {o.price !== null && o.price !== undefined && <span className="lc-eng__price">{payMoney(o.price, o.currency || 'EUR')}</span>}
            </span>
            {more.length > 0 && (
                <span className="lc-eng__times" role="group" aria-label={`Other times for ${o.service_name}`}>
                    <span className="lc-eng__label">{`Other times, ${day.split(',')[0]}`}</span>
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
            {why.length > 0 && <span className="lc-eng__why">{why.join(' · ')}</span>}
            <span className="lc-eng__go"><Button iconRight={ArrowRight} full onClick={() => onBook(o)}>{`Book ${o.time}`}</Button></span>
        </li>
    )
}

// The others, one line each: their world down the side, who, what and where, and the time as the button.
const OptionRow = ({ o, timeZone, onBook, market }) => {
    const why = reasons(o)
    const price = o.price !== null && o.price !== undefined ? payMoney(o.price, o.currency || 'EUR') : null
    return (
        <li className={`lc-eng__opt is-row is-${o.label}`}>
            <span className="lc-eng__side-strap" aria-hidden="true"><CityPattern world={patternOf({ id: o.business_id, city: o.city, market })} centred size={12} /></span>
            <span className="lc-eng__main">
                <span className="lc-eng__tag">{LABELS[o.label] || 'Free'}</span>
                <b className="lc-eng__biz">{o.business_name}{o.verified && <> <VerifiedBadge small /></>}{o.reliable && <> <ReliableBadge small /></>}</b>
                <span className="lc-eng__svc">{[withPeople(o.service_name, Number(o.people)), price, o.area].filter(Boolean).join(' · ')}</span>
                {why.length > 0 && <span className="lc-eng__why">{why.join(' · ')}</span>}
            </span>
            <span className="lc-eng__at">
                <Button size="sm" variant="secondary" onClick={() => onBook(o)}><span className="sr-only">Book </span>{o.time}</Button>
                <span className="lc-eng__when">{dayLabel(o.date, timeZone).split(', ').pop()}</span>
            </span>
        </li>
    )
}

const Options = ({ list, timeZone, onBook, market }) => (
    <ul className="lc-eng__opts">
        {list.map((o, i) => (i === 0
            ? <Option key={o.business_id} o={o} timeZone={timeZone} onBook={onBook} market={market} only={list.length === 1} />
            : <OptionRow key={o.business_id} o={o} timeZone={timeZone} onBook={onBook} market={market} />))}
    </ul>
)

// The world a place wears in the empty screens: its home region's, else a stable pick by its name.
const placeWorld = (place, market) => pickWorld({ id: `place|${place}`, city: place, country: countryOf(market).iso }, { municipalities: PT_MUNICIPALITIES })

// "What do you need?": what, where, when and how many, then up to three people free, each for a
// different reason. A tap opens that business's booking sheet at that time.
// compact: the one line and the popular chips first; when, what time, how many and where open behind
// "More options", with what is picked said in words, so a short list never sits under a long form.
export const EngineBox = ({ title = 'What do you need?', browseTo = '/client/search', compact = false }) => {
    const navigate = useNavigate()
    // The same country as the header switch: changing it in either place changes both.
    const [market, pickMarket] = useCountry()
    const city = market.code
    const [text, setText] = useState('')
    const [mode, setMode] = useState('')
    const [when, setWhen] = useState('soonest')
    const [time, setTime] = useState('any')
    const [people, setPeople] = useState('1')
    const [place, setPlace] = useState(null)
    const [zone, setZone] = useState('')
    // A state (Nigeria) or district (Portugal) picked in More options: only businesses there.
    const [region, setRegion] = useState('')
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
    // The empty screens: how many asked here before, and the contact once "Tell me when" is done.
    const [interest, setInterest] = useState({ missed: 0, waiting: 0 })
    const [noted, setNoted] = useState(null)

    useEffect(() => {
        let cancelled = false
        visitorCountry().then((c) => { if (!cancelled && c && !SERVED.includes(c)) setAbroad(c) })
        return () => { cancelled = true }
    }, [])

    // Numbers for the empty screens, asked only when one shows. A place for "nobody near", the
    // visitor's country before they search from abroad.
    const emptyAt = result.status === 'ready' && (result.data?.options || []).length === 0 && (result.data?.later || []).length === 0
        ? (result.near || result.region || '') : ''
    useEffect(() => {
        let cancelled = false
        setNoted(null)
        const ask = emptyAt ? { market: city, zone: emptyAt } : abroad && result.status === 'idle' ? { country: abroad } : null
        if (!ask) { setInterest({ missed: 0, waiting: 0 }); return undefined }
        placeInterest(ask).then((n) => { if (!cancelled) setInterest(n) })
        return () => { cancelled = true }
    }, [emptyAt, abroad, result.status, result.text, city])

    useEffect(() => {
        let cancelled = false
        setPlace(null)
        setZone('')
        setRegion('')
        setResult({ status: 'idle', data: null, error: '' })
        loadPopular(city).then((list) => { if (!cancelled) setPopular(list) }).catch(() => { if (!cancelled) setPopular([]) })
        loadCountryZones(city).then((list) => { if (!cancelled) setZones(list) }).catch(() => { if (!cancelled) setZones([]) })
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
        if (over.clear) { next[READ[over.clear] || over.clear] = DEFAULTS[READ[over.clear] || over.clear]; src[READ[over.clear] || over.clear] = 'hand' }
        const ex = Object.fromEntries(EXTRA.map((k) => [k, over.clear === k ? null : u[k] ?? null]))
        const understood = [...Object.keys(READ), ...EXTRA].filter((k) => u[k] != null && over.clear !== k).map((k) => ({ field: k, label: k === 'day' ? whenText(u.day) : k === 'price' ? null : u.labels[k] }))
        let what = u.what
        let byAI = false
        // The AI reads what the rules could not, and fills only what they left empty; the rules' own
        // readings stand. Its fields reset with the words, like the rules'.
        const withAI = (ai) => {
            if (!ai) return false
            let used = false
            const fill = (k, f, value, label) => {
                if (value == null || u[k] != null || src[f] === 'hand') return
                next[f] = value; src[f] = 'words'; used = true
                understood.push({ field: k, label, ai: true })
            }
            fill('day', 'when', ai.when, ai.when && whenText(ai.when))
            fill('time', 'time', ai.time, ai.time && timeLabel(ai.time))
            fill('people', 'people', ai.people, ai.people && `For ${ai.people}`)
            fill('mode', 'mode', ai.mode, ai.mode && WHERE.find((w) => w.value === ai.mode)?.label)
            const extra = (k, value, label) => {
                if (value == null || ex[k] != null) return
                ex[k] = value; used = true
                understood.push({ field: k, label, ai: true })
            }
            extra('place', ai.place, ai.place && `Near ${ai.place}`)
            extra('price', ai.max_price, null)
            extra('order', ai.cheapest ? 'price' : null, 'Cheapest')
            if (ai.what && ai.what.toLowerCase() !== u.what.toLowerCase()) {
                what = ai.what; used = true
                understood.unshift({ field: 'what', label: ai.what, ai: true })
            }
            byAI = byAI || used
            return used
        }
        // Where: one of our cities named ("barber in Porto") lifts the businesses there, in its country;
        // an area ("in Lekki") goes first; any other place ("at Abeokuta") is said plainly and kept in Demand.
        let mk = market
        let zoneHere = zone
        let near = null
        const resolvePlace = () => {
            mk = market; zoneHere = zone || region; near = null
            if (!ex.place) return
            const named = cityNamed(ex.place)
            if (named) { mk = countryOf(named.country); if (named.country !== city) pickMarket(named.country); zoneHere = named.name; return }
            // A state or district ("in Kano", "Braga"): the search stays inside it, in its country.
            const inRegion = Object.entries(REGIONS).map(([code, r]) => [code, r.list.find((x) => plain(x) === plain(ex.place))]).find(([, x]) => x)
            if (inRegion) { mk = countryOf(inRegion[0]); if (inRegion[0] !== city) pickMarket(inRegion[0]); zoneHere = inRegion[1]; return }
            const z = zones.find((x) => plain(x) === plain(ex.place))
            if (z) zoneHere = z
            else near = ex.place
        }
        const priceText = (v) => `Under ${payMoney(v, (mk || market).currency || 'EUR')}`
        const settle = () => { setWhen(next.when); setTime(next.time); setPeople(next.people); setMode(next.mode); setFrom(src) }
        const asked = () => ({
            understood: understood.map((c) => (c.field === 'price' ? { ...c, label: priceText(ex.price) } : c)),
            spans: u.spans, text: typed, what, when: next.when, byAI, near, region: Object.values(REGIONS).some((r) => r.list.includes(zoneHere)) ? zoneHere : '', price: ex.price, cityName: mk.name,
        })
        resolvePlace()
        settle()
        if (next.mode === 'at_client' && !place && !zoneHere) {
            if (compact) setMore(true)
            setResult({ status: 'error', data: null, error: 'Tell us where you are, so we only show people who come to you.', ...asked() })
            return
        }
        setResult({ status: 'loading', data: null, error: '', ...asked() })
        const search = (withPrice = true) => findMatches({ market: mk.code, text: what, mode: next.mode, when: next.when, time: next.time, people: Number(next.people), place, zone: zoneHere, maxPrice: withPrice ? ex.price : null, order: ex.order || '' })
        try {
            // A long sentence: the AI first. A short one the engine cannot place: the AI after.
            let asking = !over.noAI && needsAI(u.what)
            if (asking) { withAI(await askAI({ text: typed, market: city })); resolvePlace(); settle() }
            let data = await search().catch((err) => { if (!over.noAI && !asking && err?.code === '22023') return null; throw err })
            if (!over.noAI && !asking && (!data || offers(data) === 0)) {
                asking = true
                if (withAI(await askAI({ text: typed, market: city }))) { resolvePlace(); settle(); data = await search() }
            }
            if (!data) throw Object.assign(new Error('Say what you need, like "haircut" or "nails"'), { code: '22023' })
            // Loosen one thing and say which: nothing under the price asked, so what costs more.
            let loosened = null
            if (ex.price && offers(data) === 0) {
                const dearer = await search(false)
                if (offers(dearer) > 0) { data = dearer; loosened = 'price' }
            }
            setResult({ status: 'ready', data, error: '', loosened, ...asked() })
            noteSearch({ market: mk.code, text: typed, mode: next.mode, people: next.people, place, zone: near || zoneHere, data })
        } catch (err) {
            console.error('Engine failed:', err)
            setResult({ status: 'error', data: null, error: USER_ERRORS.includes(err?.code) || err?.code === '22023' ? err.message : 'We could not search right now. Try again.', ...asked() })
        }
    }

    // A chip's remove takes its phrase out of the words and searches again.
    // An AI reading has no words of its own to take out: it is cleared and the search runs on the rules.
    const drop = (chip) => {
        if (chip.ai) { run({ text: result.text, noAI: true, clear: chip.field === 'what' ? undefined : chip.field }); return }
        const next = without(result.text, result.spans || [], chip.field)
        setText(next)
        run({ text: next })
    }

    const book = (o) => {
        keepEnginePlace(o.mode === 'at_client' ? place : null)
        navigate(bookingLink(o))
    }

    const options = result.data?.options || []
    const later = result.data?.later || []
    const world = market.world
    const askedFor = String(result.what || result.text || '').trim()
    // The place an empty screen speaks of: a place named in the words, or the state or district picked.
    const here = result.near || result.region || ''
    const shareText = `Take bookings on Locappoint, free: ${WEB_ORIGIN}`
    const missedLine = (place) => (interest.missed > 0 ? `${interest.missed} searches in ${place} found nobody to book this month.` : '')

    return (
        <section className="lc-eng" aria-labelledby="lc-eng-title">
            <span className="lc-eng__band" aria-hidden="true"><CityPattern world={world} centred size={40} /></span>
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
                    <button type="button" className={`lc-eng__more${more ? ' is-open' : ''}`} aria-expanded={more} aria-controls="lc-eng-options" onClick={() => setMore((m) => !m)}>
                        <SlidersHorizontal size={16} aria-hidden="true" />
                        <span>{more ? 'Fewer options' : 'More options'}</span>
                        <span className="lc-eng__picked">{[region || null, when !== 'soonest' ? whens.find((w) => w.value === when)?.label : null, time !== 'any' ? timeLabel(time) : null, people !== '1' ? PEOPLE.find((n) => n.value === people)?.label : null, mode ? WHERE.find((w) => w.value === mode)?.label : null].filter(Boolean).join(', ') || 'Soonest, anywhere'}</span>
                    </button>
                )}
                {result.understood?.length > 0 && (
                    <div className="lc-eng__understood" role="group" aria-label="What we understood">
                        <span className="lc-eng__label">{result.byAI ? 'Understood with AI' : 'Understood'}</span>
                        {result.understood.map((c) => (
                            <button key={c.field} type="button" className={`lc-eng__read${c.ai ? ' is-ai' : ''}`} onClick={() => drop(c)} aria-label={`Remove ${c.label}`}>
                                {c.label}
                                <X size={14} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                )}
                <div className="lc-eng__row" id="lc-eng-options" hidden={compact && !more}>
                    <Picker value={city} onChange={pickCity} title="Country" options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
                    <Picker value={region} onChange={setRegion} title={REGIONS[city]?.word || 'Region'} searchable searchPlaceholder={`Search ${(REGIONS[city]?.word || 'region').toLowerCase()}s`} options={[{ value: '', label: REGIONS[city]?.all || 'Everywhere' }, ...(REGIONS[city]?.list || []).map((r) => ({ value: r, label: r }))]} />
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

            {abroad && result.status === 'idle' && (
                <div className="lc-eng__abroad is-scene">
                    <AbroadScene country={countryName(abroad)} />
                    <h3 className="lc-eng__headline">{`We are in Nigeria and Portugal. ${countryName(abroad)} is on the list.`}</h3>
                    <p className="lc-eng__lede">
                        {`Booking for someone in Nigeria or Portugal? Search here.`}
                        {interest.missed > 0 ? ` ${interest.missed} searches came from ${countryName(abroad)} this month.` : ''}
                    </p>
                    {askHome
                        ? <TellMeWhen country={abroad} title={`Tell me when ${countryName(abroad)} opens`} label="Tell me" done={`Done. We will tell you when Locappoint opens in ${countryName(abroad)}.`} />
                        : <Button size="sm" variant="secondary" onClick={() => setAskHome(true)}>{`Want Locappoint in ${countryName(abroad)}?`}</Button>}
                    <span className="lc-eng__pick">
                        <button type="button" className="lc-eng__country" onClick={() => pickCity('ng')}><span className="lc-eng__countryart" aria-hidden="true"><CityPattern world="adire" centred size={14} /></span><span>Book in <b>Nigeria</b></span></button>
                        <button type="button" className="lc-eng__country" onClick={() => pickCity('pt')}><span className="lc-eng__countryart" aria-hidden="true"><CityPattern world="azulejo" centred size={14} /></span><span>Book in <b>Portugal</b></span></button>
                    </span>
                </div>
            )}
            {abroad && result.status !== 'idle' && (
                <div className="lc-eng__abroad">
                    <p className="lc-eng__note">
                        <Globe size={16} aria-hidden="true" />
                        <span>{`You are in ${countryName(abroad)}. Locappoint books businesses in Nigeria and Portugal, so search here to book for someone there.`}</span>
                    </p>
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
                {result.status === 'ready' && (options.length > 0 || later.length > 0) && result.near && (
                    <PlaceScene world={placeWorld(result.near, city)} place={result.near} toCity={result.cityName} small />
                )}
                {result.status === 'ready' && (options.length > 0 || later.length > 0) && (result.near || result.loosened) && (
                    <p className="lc-eng__note">
                        {[
                            result.near ? `Nobody near ${result.near} is on Locappoint yet. These are in ${result.cityName}:` : '',
                            result.loosened === 'price' ? `Nothing ${(result.understood.find((c) => c.field === 'price')?.label || '').toLowerCase()}. These cost more:` : '',
                        ].filter(Boolean).join(' ')}
                    </p>
                )}
                {result.status === 'ready' && options.length > 0 && (
                    <>
                        {!result.near && !result.loosened && (
                            <p className="lc-eng__count">
                                <b>{[result.when && result.when !== 'soonest' ? whenText(result.when) : 'Soonest free', time !== 'any' ? timeLabel(time).toLowerCase() : ''].filter(Boolean).join(', ')}</b>
                                <span>{`${options.length === 1 ? '1 place' : `${options.length} places`}, ${options.reduce((n, o) => n + Math.max(1, (o.times || []).length), 0)} times`}</span>
                            </p>
                        )}
                        <Options list={options} timeZone={market.timeZone} onBook={book} market={city} />
                    </>
                )}
                {result.status === 'ready' && options.length === 0 && later.length > 0 && (
                    <>
                        <p className="lc-eng__note">{nobodyFree(result, time, market.timeZone, later.length)}</p>
                        <Options list={later} timeZone={market.timeZone} onBook={book} market={city} />
                    </>
                )}
                {result.status === 'ready' && options.length === 0 && later.length === 0 && (noted ? (
                    <div className="lc-eng__none is-noted" role="status">
                        <NotedScene world={here ? placeWorld(here, city) : world} place={here || market.name} />
                        <h3 className="lc-eng__headline">Noted. You will be the first to know.</h3>
                        <p className="lc-eng__lede">
                            {offers(result.data) > 0
                                ? 'When a time opens up, we let you know.'
                                : `When someone in ${here || market.name} starts taking bookings for this, we let you know.`}
                        </p>
                        <dl className="lc-eng__facts">
                            <div><dt>Looking for</dt><dd>{[askedFor, here || market.name].filter(Boolean).join(', ')}</dd></div>
                            <div><dt>We tell you on</dt><dd className="is-mono">{`${noted.includes('@') ? 'Email' : 'WhatsApp'} ${maskContact(noted)}`}</dd></div>
                            {interest.waiting > 0 && <div><dt>{`Asking for ${here || market.name}`}</dt><dd>{`You and ${interest.waiting} others`}</dd></div>}
                        </dl>
                        <span className="lc-eng__noneactions">
                            <Button variant="secondary" to={browseTo}>Browse every place</Button>
                            <Button variant="secondary" icon={MessageCircle} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">Share with a business</Button>
                        </span>
                        <p className="lc-eng__small">We use this contact only to tell you about this search, and delete it within 24 months.</p>
                    </div>
                ) : (
                    <div className="lc-eng__none">
                        <PlaceScene world={here ? placeWorld(here, city) : world} place={here || market.name} full={offers(result.data) > 0} />
                        <h3 className="lc-eng__headline">
                            {offers(result.data) > 0
                                ? 'Everyone who does this is fully booked for the next 3 weeks.'
                                : here
                                    ? `Nobody ${result.near ? 'near' : 'in'} ${here} offers that yet.`
                                    : `Nobody in ${market.name} offers that yet${mode === 'at_client' ? ' at your place' : ''}.`}
                        </h3>
                        {(offers(result.data) > 0 || !here || missedLine(here)) && (
                            <p className="lc-eng__lede">
                                {offers(result.data) > 0
                                    ? 'Times open up when people move or cancel.'
                                    : here ? missedLine(here) : 'Try other words, or browse every place.'}
                            </p>
                        )}
                        <TellMeWhen
                            key={`${result.text}-${city}`}
                            text={result.text}
                            market={city}
                            zone={here || place?.zone || zone}
                            title={offers(result.data) > 0 ? 'Want to know when a time opens up?' : 'Want to know when someone near you offers it?'}
                            onDone={setNoted}
                        />
                        <span className="lc-eng__noneactions">
                            <Button size="sm" variant="quiet" to={browseTo}>Browse every place</Button>
                        </span>
                        {offers(result.data) === 0 && (
                            <p className="lc-eng__small">
                                {`Do this work${here ? ` in ${here}` : ''}? `}
                                <Link to="/auth">List your business free</Link>.
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}
