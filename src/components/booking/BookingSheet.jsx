import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Sheet } from '../ui'
import { DurationDial } from '../business/DurationDial'
import { useNow } from '../business/ShopClock'
import { useAuth } from '../../hooks/useAuth'
import { durationLabel, menuPrice } from '../../services/business'
import { bookingDays, clearPending, hasTimeLeft, loadBusy, monthShort, requestBooking, savePending, slotsFor } from '../../services/booking'
import { parsePhone } from '../ui/PhoneField'
import { clock } from '../../services/hours'
import { DayStrip } from './sheet/DayStrip'
import { TimeGrid } from './sheet/TimeGrid'
import { BookingTicket } from './sheet/BookingTicket'
import { AccountGate } from './sheet/AccountGate'
import { BookingDetails } from './sheet/BookingDetails'
import { OwnerNote } from './sheet/OwnerNote'
import '../../styles/client/booking-sheet.css'

const TITLES = { time: 'Pick a time', review: 'Check and confirm', done: 'Booking requested' }
const TAKEN = ['23P01', '22023']

const hasPrice = (price) => String(price ?? '').trim() !== '' && !Number.isNaN(Number(String(price).replace(',', '.')))
const dayLabel = (day) => day.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const dayShort = (day) => `${day.date.toLocaleDateString('en-GB', { weekday: 'short' })} ${day.date.getDate()} ${monthShort(day.date)}`

const firstBookable = (days, duration, nowMinutes) =>
    days.find((d) => d.windows.length > 0 && hasTimeLeft(d, duration, nowMinutes))

export const BookingSheet = ({ business, service, week, resume, owner = false, onClose }) => {
    const navigate = useNavigate()
    const { user, userProfile } = useAuth()
    const timeZone = business.timezone || 'Europe/Lisbon'
    const now = useNow(timeZone)
    const nowMinutes = now?.minutes ?? 0
    const duration = Number(service.duration_minutes) || 30
    const days = useMemo(() => bookingDays(timeZone, week), [timeZone, week])
    const held = resume && days.some((d) => d.key === resume.dateKey && d.windows.length > 0) ? resume : null

    const [step, setStep] = useState(held ? 'review' : 'time')
    const [dayKey, setDayKey] = useState(() => held?.dateKey || firstBookable(days, duration, nowMinutes)?.key || days[0].key)
    const [minutes, setMinutes] = useState(held?.minutes ?? null)
    const [busy, setBusy] = useState({})
    const [notice, setNotice] = useState('')
    const [sending, setSending] = useState(false)
    const [errors, setErrors] = useState({})
    const [details, setDetails] = useState(() => {
        const phone = parsePhone(userProfile?.phone || '', business.country || 'PT')
        return { name: userProfile?.full_name || '', phone: phone.e164, phoneValid: phone.valid, country: phone.country || business.country || 'PT', notes: '' }
    })

    const day = days.find((d) => d.key === dayKey) || days[0]
    const entry = busy[dayKey]

    const fetchDay = useCallback(async (key) => {
        setBusy((b) => ({ ...b, [key]: { state: 'loading' } }))
        try {
            const rows = await loadBusy(business.id, key)
            setBusy((b) => ({ ...b, [key]: { state: 'ready', rows } }))
        } catch (err) {
            console.error('Busy times failed:', err)
            setBusy((b) => ({ ...b, [key]: { state: 'error' } }))
        }
    }, [business.id])

    useEffect(() => {
        if (!busy[dayKey]) fetchDay(dayKey)
    }, [dayKey, busy, fetchDay])

    const windows = useMemo(() => (entry?.state === 'ready'
        ? slotsFor({ windows: day.windows, busy: entry.rows, duration, after: day.today ? nowMinutes : -1 })
        : []), [entry, day, duration, nowMinutes])

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
        savePending({ slug: business.slug, serviceId: service.id, dateKey: dayKey, minutes })
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

    const confirm = async () => {
        const problems = {}
        if (!details.name.trim()) problems.name = 'Add the name the business should expect'
        if (!details.phoneValid) problems.phone = 'Enter a phone number the business can call'
        setErrors(problems)
        if (Object.keys(problems).length) return
        setSending(true)
        setNotice('')
        try {
            await requestBooking({
                businessId: business.id,
                serviceId: service.id,
                dateKey: dayKey,
                minutes,
                name: details.name.trim(),
                email: userProfile?.email || user?.email || '',
                phone: details.phone,
                notes: details.notes.trim(),
            })
            clearPending()
            setStep('done')
        } catch (err) {
            console.error('Booking failed:', err)
            if (TAKEN.includes(err?.code)) {
                setMinutes(null)
                setStep('time')
                setNotice('That time was just taken. Pick another one.')
                fetchDay(dayKey)
            } else {
                setNotice(['P0002', '28000', '42501'].includes(err?.code) && err.message ? err.message : 'We could not send the booking. Try again.')
            }
        } finally {
            setSending(false)
        }
    }

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
                <Button disabled={minutes === null} onClick={() => { setNotice(''); setStep('review') }}>Continue</Button>
            </div>
        )
    } else if (step === 'review' && owner) {
        footer = <Button full to="/portal/calendar">Open my calendar</Button>
    } else if (step === 'review') {
        footer = user ? (
            <Button full loading={sending} onClick={confirm}>Confirm booking</Button>
        ) : (
            <div className="lc-bk-foot lc-bk-foot--gate">
                <Button variant="secondary" onClick={() => toAuth('signin')}>Sign in</Button>
                <Button onClick={() => toAuth('signup')}>Create account</Button>
            </div>
        )
    } else {
        footer = (
            <div className="lc-bk-foot lc-bk-foot--gate">
                <Button variant="secondary" to="/client/appointments">My bookings</Button>
                <Button onClick={close}>Done</Button>
            </div>
        )
    }

    return (
        <Sheet open onClose={close} title={TITLES[step]} footer={footer} wide>
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
                    <DayStrip days={days} selected={dayKey} onSelect={pickDay} duration={duration} nowMinutes={nowMinutes} />
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
                    <BookingTicket business={business} service={service} dateKey={dayKey} minutes={minutes} />
                    {owner ? (
                        <OwnerNote />
                    ) : user ? (
                        <BookingDetails
                            value={details}
                            errors={errors}
                            email={userProfile?.email || user?.email}
                            onChange={(patch) => { setDetails((d) => ({ ...d, ...patch })); setErrors({}) }}
                        />
                    ) : (
                        <AccountGate businessName={business.business_name} />
                    )}
                    {notice && <p className="lc-bk-notice" role="alert">{notice}</p>}
                </>
            )}

            {step === 'done' && minutes !== null && (
                <>
                    <BookingTicket business={business} service={service} dateKey={dayKey} minutes={minutes} stamp="Requested" />
                    <p className="lc-bk-done">
                        {business.business_name} has your request and will confirm it. You can find it in My bookings.
                    </p>
                </>
            )}
        </Sheet>
    )
}
