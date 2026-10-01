import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Chip, ChipGroup, Sheet } from '../ui'
import { DurationDial } from '../business/DurationDial'
import { useNow } from '../business/ShopClock'
import { useAuth } from '../../hooks/useAuth'
import { durationLabel, menuPrice } from '../../services/business'
import { trackPage } from '../../services/pageStats'
import { USER_ERRORS, bookingDays, clearPending, firstOnOrAfter, hasTimeLeft, loadExtras, loadSlots, monthShort, requestBooking, rescheduleMyBooking, savePending, windowsFor } from '../../services/booking'
import { parsePhone } from '../ui/PhoneField'
import { clock } from '../../services/hours'
import { parseDateKey, toMinutes } from '../../services/dates'
import { DayStrip } from './sheet/DayStrip'
import { TimeGrid } from './sheet/TimeGrid'
import { BookingTicket } from './sheet/BookingTicket'
import { AddToCalendar } from './AddToCalendar'
import { BookingDetails } from './sheet/BookingDetails'
import { OwnerNote } from './sheet/OwnerNote'
import { RebookNote } from './sheet/RebookNote'
import '../../styles/client/booking-sheet.css'

const TITLES = { time: 'Pick a time', review: 'Check and confirm', done: 'Booking requested' }
const AGAIN_TITLES = { ...TITLES, time: 'Book again' }
const MOVE_TITLES = { time: 'Pick a new time', review: 'Check the new time', done: 'Booking moved' }
const TAKEN = ['23P01']

const hasPrice = (price) => String(price ?? '').trim() !== '' && !Number.isNaN(Number(String(price).replace(',', '.')))
const dayLabel = (day) => day.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const dayShort = (day) => `${day.date.toLocaleDateString('en-GB', { weekday: 'short' })} ${day.date.getDate()} ${monthShort(day.date)}`

const firstBookable = (days, duration, nowMinutes) =>
    days.find((d) => d.windows.length > 0 && hasTimeLeft(d, duration, nowMinutes))

export const BookingSheet = ({ business, service: baseService, extras: givenExtras, week, resume, owner = false, move = null, rebook = null, mover, onMoved, onClose }) => {
    const navigate = useNavigate()
    const { user, userProfile } = useAuth()
    const timeZone = business.timezone || 'Europe/Lisbon'
    const now = useNow(timeZone)
    const nowMinutes = now?.minutes ?? 0
    // Extras come with the page; every other way in (Book again, bookings, the manage link) loads them here.
    const [loadedExtras, setLoadedExtras] = useState([])
    const offerExtras = !move && !owner
    useEffect(() => {
        if (givenExtras || !offerExtras) return undefined
        let cancelled = false
        loadExtras(business.id)
            .then((rows) => { if (!cancelled) setLoadedExtras(rows) })
            .catch((err) => console.error('Extras failed:', err))
        return () => { cancelled = true }
    }, [givenExtras, offerExtras, business.id])
    const extras = useMemo(() => (givenExtras || loadedExtras).filter((e) => e.id !== baseService.id), [givenExtras, loadedExtras, baseService.id])
    const [chosen, setAddonIds] = useState(() => resume?.addonIds || rebook?.addonIds || [])
    const addonIds = useMemo(() => chosen.filter((id) => extras.some((e) => e.id === id)), [chosen, extras])
    const addonKey = addonIds.join(',')
    const picked = extras.filter((e) => addonIds.includes(e.id))
    // One booking, one slot: the extras' time and price sit on top of the service's.
    const service = picked.length ? {
        ...baseService,
        service_name: [baseService.service_name.trim(), ...picked.map((e) => e.service_name.trim())].join(' + '),
        duration_minutes: Number(baseService.duration_minutes) + picked.reduce((s, e) => s + Number(e.duration_minutes), 0),
        price: hasPrice(baseService.price) ? Number(baseService.price) + picked.reduce((s, e) => s + (Number(e.price) || 0), 0) : baseService.price,
    } : baseService
    const duration = Number(move?.duration_minutes) || Number(service.duration_minutes) || 30
    const days = useMemo(() => bookingDays(timeZone, week), [timeZone, week])
    const held = resume && days.some((d) => d.key === resume.dateKey && d.windows.length > 0) ? resume : null
    const was = move ? { dateKey: move.appointment_date, minutes: toMinutes(move.appointment_time) } : null
    const auto = business.auto_confirm === true
    const [staffId, setStaffId] = useState(rebook?.staffId || null)
    const usual = rebook?.suggested ? firstOnOrAfter(days, rebook.suggested)?.key || null : null

    const [step, setStep] = useState(held ? 'review' : 'time')
    const [dayKey, setDayKey] = useState(() => held?.dateKey
        || (was && days.some((d) => d.key === was.dateKey) ? was.dateKey : null)
        || (usual && days.find((d) => d.key === usual && hasTimeLeft(d, duration, nowMinutes))?.key)
        || firstBookable(days, duration, nowMinutes)?.key || days[0].key)
    const [minutes, setMinutes] = useState(held?.minutes ?? null)
    const [busy, setBusy] = useState({})
    const [notice, setNotice] = useState('')
    const [sending, setSending] = useState(false)
    const [errors, setErrors] = useState({})
    const [details, setDetails] = useState(() => {
        const last = rebook?.client || {}
        const phone = parsePhone(userProfile?.phone || last.phone || '', business.country || 'PT')
        return { name: userProfile?.full_name || last.name || '', email: last.email || '', phone: phone.e164, phoneValid: phone.valid, country: phone.country || business.country || 'PT', notes: '' }
    })

    const day = days.find((d) => d.key === dayKey) || days[0]
    const entry = busy[dayKey]

    const counts = !move && !owner
    useEffect(() => {
        if (counts) trackPage(business.id, 'start')
    }, [counts, business.id])
    useEffect(() => {
        if (counts && step === 'review') trackPage(business.id, 'time')
    }, [counts, step, business.id])

    const fetchDay = useCallback(async (key) => {
        setBusy((b) => ({ ...b, [key]: { state: 'loading' } }))
        try {
            const free = await loadSlots({ businessId: business.id, serviceId: service.id, dateKey: key, staffId, ignore: move?.id || null, addonIds })
            setBusy((b) => ({ ...b, [key]: { state: 'ready', free } }))
        } catch (err) {
            console.error('Busy times failed:', err)
            setBusy((b) => ({ ...b, [key]: { state: 'error' } }))
        }
    }, [business.id, service.id, staffId, move?.id, addonIds])

    useEffect(() => {
        if (!busy[dayKey]) fetchDay(dayKey)
    }, [dayKey, busy, fetchDay])

    // Extras picked last time arrive after the sheet opens; the times must fit the whole booking.
    useEffect(() => { setBusy({}) }, [addonKey])

    const pickStaff = (id) => {
        setStaffId(id)
        setMinutes(null)
        setBusy({})
    }

    const toggleExtra = (id) => {
        setAddonIds(addonIds.includes(id) ? addonIds.filter((x) => x !== id) : [...addonIds, id].slice(0, 3))
        setMinutes(null)
        setBusy({})
    }

    const windows = useMemo(() => (entry?.state === 'ready'
        ? windowsFor({ windows: day.windows, free: entry.free, after: day.today ? nowMinutes : -1 })
        : []), [entry, day, nowMinutes])

    const next = useMemo(() => {
        const rest = days.slice(days.indexOf(day) + 1)
        const found = firstBookable(rest, duration, nowMinutes)
        return found ? { key: found.key, label: dayLabel(found), short: dayShort(found) } : null
    }, [days, day, duration, nowMinutes])

    const pickDay = (key) => {
        setDayKey(key)
        setMinutes(null)
        setNotice('')
    }

    const toAuth = (tab) => {
        savePending({ slug: business.slug, serviceId: service.id, dateKey: dayKey, minutes, addonIds })
        const back = `/${business.slug}?book=${encodeURIComponent(`${service.id}.${dayKey}.${clock(minutes).replace(':', '')}`)}`
        navigate('/auth', {
            state: {
                tab,
                userType: 'client',
                returnTo: back,
                booking: { business: business.business_name, service: service.service_name.trim(), when: `${dayLabel(day)} at ${clock(minutes)}` },
            },
        })
    }

    const accountEmail = userProfile?.email || user?.email || ''
    const confirm = async () => {
        const problems = {}
        const email = accountEmail || details.email.trim().toLowerCase()
        if (!details.name.trim()) problems.name = 'Add the name the business should expect'
        if (!accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.email = 'Enter the email for your confirmation'
        if (!details.phoneValid) problems.phone = 'Enter a phone number the business can call'
        setErrors(problems)
        if (Object.keys(problems).length) return
        setSending(true)
        setNotice('')
        try {
            await requestBooking({
                businessId: business.id,
                serviceId: service.id,
                staffId,
                dateKey: dayKey,
                minutes,
                name: details.name.trim(),
                email,
                phone: details.phone,
                notes: details.notes.trim(),
                addonIds,
            })
            clearPending()
            setStep('done')
        } catch (err) {
            failed(err, 'We could not send the booking. Try again.')
        } finally {
            setSending(false)
        }
    }

    const failed = (err, fallback) => {
        console.error('Booking failed:', err)
        if (TAKEN.includes(err?.code)) {
            setMinutes(null)
            setStep('time')
            setNotice('That time was just taken. Pick another one.')
            fetchDay(dayKey)
        } else {
            setNotice(USER_ERRORS.includes(err?.code) && err.message ? err.message : fallback)
        }
    }

    const moveIt = async () => {
        setSending(true)
        setNotice('')
        try {
            if (mover) await mover({ dateKey: dayKey, minutes })
            else await rescheduleMyBooking({ id: move.id, dateKey: dayKey, minutes })
            setStep('done')
            onMoved?.()
        } catch (err) {
            failed(err, 'We could not move the booking. Try again.')
        } finally {
            setSending(false)
        }
    }

    const unchanged = was && dayKey === was.dateKey && minutes === was.minutes
    const titles = move ? MOVE_TITLES : rebook ? AGAIN_TITLES : TITLES
    const stamp = auto ? 'Confirmed' : 'Requested'

    const close = () => {
        if (step === 'done') clearPending()
        onClose()
    }

    let footer = null
    if (step === 'time') {
        footer = (
            <div className="lc-bk-foot">
                <p className="lc-bk-foot__sum">
                    <span className="lc-bk-foot__day">{dayShort(day)}</span>
                    {minutes === null
                        ? <span className="lc-bk-foot__hint">No time picked yet</span>
                        : <b>{clock(minutes)} to {clock(minutes + duration)}</b>}
                </p>
                <Button disabled={minutes === null || unchanged} onClick={() => { setNotice(''); setStep('review') }}>Continue</Button>
            </div>
        )
    } else if (step === 'review' && move) {
        footer = <Button full loading={sending} onClick={moveIt}>Move booking</Button>
    } else if (step === 'review' && owner) {
        footer = <Button full to="/portal/calendar">Open my calendar</Button>
    } else if (step === 'review') {
        footer = <Button full loading={sending} onClick={confirm}>Confirm booking</Button>
    } else {
        footer = (
            <div className="lc-bk-foot lc-bk-foot--gate">
                {!move && user && <Button variant="secondary" to="/client/appointments">My bookings</Button>}
                <Button onClick={close}>Done</Button>
            </div>
        )
    }

    const event = minutes === null ? null : {
        id: move?.id,
        title: `${service.service_name.trim()} at ${business.business_name}`,
        dateKey: dayKey,
        minutes,
        duration,
        timeZone,
        location: [business.address, business.city].filter(Boolean).join(', '),
        details: business.phone ? `${business.business_name}: ${business.whatsapp || business.phone}` : '',
    }

    return (
        <Sheet open onClose={close} title={step === 'done' && !move && auto ? 'Booking confirmed' : titles[step]} footer={footer} wide>
            {step === 'time' && (
                <>
                    <div className="lc-bk-service">
                        <DurationDial minutes={duration} size={32} />
                        <span className="lc-bk-service__text">
                            <span className="lc-bk-service__name">{service.service_name.trim()}</span>
                            <span className="lc-bk-service__meta">{durationLabel(duration)} at {business.business_name}</span>
                        </span>
                        {hasPrice(service.price) && <span className="lc-bk-service__price">{menuPrice(service.price)}</span>}
                    </div>
                    {!move && !owner && extras.length > 0 && (
                        <div className="lc-bk-extras">
                            <span className="lc-bk-extras__label">Add to it</span>
                            <ChipGroup label="Extras">
                                {extras.map((e) => (
                                    <Chip key={e.id} selected={addonIds.includes(e.id)} onClick={() => toggleExtra(e.id)}>
                                        {`+ ${e.service_name.trim()}`}
                                        <span className="lc-bk-extras__meta">{[durationLabel(Number(e.duration_minutes)), hasPrice(e.price) ? menuPrice(e.price) : null].filter(Boolean).join(', ')}</span>
                                    </Chip>
                                ))}
                            </ChipGroup>
                        </div>
                    )}
                    {rebook && <RebookNote rebook={rebook} staffId={staffId} onStaff={pickStaff} picked={dayKey} usual={usual} />}
                    <DayStrip days={days} selected={dayKey} onSelect={pickDay} duration={duration} nowMinutes={nowMinutes} usual={usual} />
                    {notice && <p className="lc-bk-notice" role="alert">{notice}</p>}
                    <TimeGrid
                        state={entry?.state || 'loading'}
                        windows={windows}
                        selected={minutes}
                        onSelect={setMinutes}
                        onRetry={() => fetchDay(dayKey)}
                        next={next}
                        onNext={() => next && pickDay(next.key)}
                    />
                </>
            )}

            {step === 'review' && minutes !== null && (
                <>
                    <button type="button" className="lc-bk-back" onClick={() => setStep('time')}>
                        <ArrowLeft size={16} aria-hidden="true" />Change time
                    </button>
                    <BookingTicket business={business} service={service} dateKey={dayKey} minutes={minutes} pay={!owner} />
                    {was ? (
                        <p className="lc-bk-was">
                            Instead of <b>{dayLabel({ date: parseDateKey(was.dateKey) })} at {clock(was.minutes)}</b>.
                            {auto ? ' It stays confirmed.' : ` ${business.business_name} will confirm the new time.`}
                        </p>
                    ) : owner ? (
                        <OwnerNote />
                    ) : (
                        <BookingDetails
                            value={details}
                            errors={errors}
                            email={accountEmail}
                            onSignIn={user ? null : () => toAuth('signin')}
                            onChange={(patch) => { setDetails((d) => ({ ...d, ...patch })); setErrors({}) }}
                        />
                    )}
                    {!move && !owner && <p className="lc-bk-paynote">Booking is free. Nothing is charged online.</p>}
                    {notice && <p className="lc-bk-notice" role="alert">{notice}</p>}
                </>
            )}

            {step === 'done' && minutes !== null && (
                <>
                    <BookingTicket business={business} service={service} dateKey={dayKey} minutes={minutes} stamp={stamp} stampTone={auto ? 'success' : 'signal'} pay={!owner} />
                    <p className="lc-bk-done">
                        {move
                            ? (auto ? 'Your booking is moved to the new time.' : `${business.business_name} will confirm the new time.`)
                            : user
                                ? (auto ? `You are booked in at ${business.business_name}. You can find it in My bookings.` : `${business.business_name} has your request and will confirm it. You can find it in My bookings.`)
                                : (auto ? `You are booked in at ${business.business_name}.` : `${business.business_name} has your request and will confirm it.`)}
                        {!move && !user && <> We sent the details to <b>{details.email.trim().toLowerCase()}</b>, with a link to change or cancel it.</>}
                    </p>
                    {auto && event && <AddToCalendar booking={event} />}
                    {!move && !user && (
                        <p className="lc-bk-later">
                            No account needed. To see all your bookings in one place, <button type="button" className="lc-bk-link" onClick={() => navigate('/auth', { state: { tab: 'signup', userType: 'client', email: details.email.trim().toLowerCase() } })}>create a free account</button> with this email later.
                        </p>
                    )}
                </>
            )}
        </Sheet>
    )
}
