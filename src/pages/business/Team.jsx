import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, Copy, KeyRound, Mail, MessageCircle, RotateCw, UserPlus } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { HoursEditor } from '../../components/business/HoursEditor'
import { Avatar, Button, Chip, ChipGroup, Field, Input, Segmented, Sheet, Skeleton, Switch } from '../../components/ui'
import { USER_ERRORS } from '../../services/booking'
import { hasOpenDay, weekFromRows, weekProblems } from '../../services/hours'
import { saveHours } from '../../services/setup'
import {
    addTeamMember, clearMemberHours, doesService, loadTeam, memberInviteLink, removeTeamMember,
    setMemberServices, teamInviteUrl, updateTeamMember,
} from '../../services/team'
import '../../styles/business/services-hours.css'
import '../../styles/business/team.css'

const DAYS = [1, 2, 3, 4, 5, 6, 0]
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const failMessage = (err, fallback) => (USER_ERRORS.includes(err?.code) && err.message ? err.message : fallback)
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

// Their week as it applies to bookings: own hours when they have any, the business week otherwise.
const weekFor = (hours, memberId) => {
    const own = hours.some((h) => h.staff_id === memberId && h.is_active !== false)
    return { own, week: weekFromRows(hours, own ? memberId : null) }
}

// Who works when, for the whole team at once: one bar per day, drawn against the widest hours anyone works.
const Rota = ({ week, span, off }) => (
    <span className={`lc-team-rota${off ? ' is-off' : ''}`} aria-hidden="true">
        {DAYS.map((d) => (
            <span key={d} className="lc-team-rota__cell">
                <span className="lc-team-rota__letter">{DAY_SHORT[d].slice(0, 1)}</span>
                <span className={`lc-team-rota__day${week[d].length ? '' : ' is-closed'}`}>
                    {week[d].map((w) => (
                        <span
                            key={w.start}
                            className="lc-team-rota__bar"
                            style={{ left: `${((w.start - span[0]) / (span[1] - span[0])) * 100}%`, width: `${((w.end - w.start) / (span[1] - span[0])) * 100}%` }}
                        />
                    ))}
                </span>
            </span>
        ))}
    </span>
)

const rotaLabel = (week) => {
    const on = DAYS.filter((d) => week[d].length).map((d) => DAY_SHORT[d])
    return on.length ? `Works ${on.join(', ')}` : 'No working days'
}

const loginLine = (m) => {
    if (m.role === 'owner') return 'Owner'
    if (m.login_email) return `Signs in as ${m.login_email}`
    if (m.invite_token) return 'Login link sent, not joined yet'
    return 'No login. You manage their calendar.'
}

const AddSheet = ({ open, onClose, onAdded }) => {
    const { business } = useWorkspace()
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { if (open) { setName(''); setError('') } }, [open])

    const add = async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            const id = await addTeamMember(business.id, name)
            onAdded(id)
        } catch (err) {
            console.error('Add member failed:', err)
            setError(failMessage(err, 'We could not add them. Try again.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Add a person">
            <form className="lc-team-form" onSubmit={add}>
                <Field label="Their name" hint="As clients will see it when they pick who to book." error={error}>
                    <Input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Ana Costa" />
                </Field>
                <p className="lc-team-note">They take bookings straight away, on your opening hours and every service. You can change that next, and give them their own login if they want one.</p>
                <Button type="submit" size="lg" icon={UserPlus} loading={busy} disabled={!name.trim()}>Add to the team</Button>
            </form>
        </Sheet>
    )
}

const LoginBlock = ({ member, businessName, onChanged }) => {
    const [link, setLink] = useState(member.invite_token ? teamInviteUrl(member.invite_token) : '')
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')

    const make = async (renew) => {
        setBusy(true)
        setError('')
        try {
            const token = await memberInviteLink(member.id, renew)
            setLink(teamInviteUrl(token))
            onChanged()
        } catch (err) {
            console.error('Invite link failed:', err)
            setError(failMessage(err, 'We could not make the link. Try again.'))
        } finally {
            setBusy(false)
        }
    }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setError('Copy did not work. Select the link and copy it.')
        }
    }

    if (member.login_email) {
        return <p className="lc-team-note">{`Signs in as ${member.login_email}. They see their own bookings and clients, nothing else.`}</p>
    }

    const message = `${firstName(member.display_name)}, this is your login for ${businessName} on Locappoint. Open it to see your bookings: ${link}`
    return (
        <div className="lc-team-login">
            <p className="lc-team-note">
                {`With a login, ${firstName(member.display_name)} sees their own bookings and clients on their phone. Without one, you run their calendar for them.`}
            </p>
            {link ? (
                <>
                    <p className="lc-team-login__url biz-num" title={link}>{link.replace(/^https?:\/\//, '')}</p>
                    <div className="lc-team-login__acts">
                        <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                        <Button variant="secondary" icon={MessageCircle} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
                        <Button variant="secondary" icon={Mail} href={`mailto:?subject=${encodeURIComponent(`Your login for ${businessName}`)}&body=${encodeURIComponent(message)}`}>Email</Button>
                    </div>
                    <p className="lc-team-note">Works once, for 14 days. <button type="button" className="lc-team-link" onClick={() => make(true)} disabled={busy}>Make a new link</button> and the old one stops working.</p>
                </>
            ) : (
                <Button variant="secondary" icon={KeyRound} loading={busy} onClick={() => make(false)}>{`Create a login link for ${firstName(member.display_name)}`}</Button>
            )}
            {error && <p className="lc-team-err" role="alert">{error}</p>}
        </div>
    )
}

const MemberSheet = ({ member, team, onClose, onChanged }) => {
    const { business, activeServices, hours, reloadWorkspace, notify } = useWorkspace()
    const initialHours = useMemo(() => weekFor(hours, member.id), [hours, member.id])
    const [name, setName] = useState(member.display_name)
    const [bookable, setBookable] = useState(member.is_bookable)
    const [every, setEvery] = useState(member.services.length === 0)
    const [picked, setPicked] = useState(member.services)
    const [ownHours, setOwnHours] = useState(initialHours.own)
    const [week, setWeek] = useState(initialHours.week)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState({})
    const [confirmRemove, setConfirmRemove] = useState(false)

    const detailsDirty = name.trim() !== member.display_name || bookable !== member.is_bookable
    const servicesDirty = every ? member.services.length > 0 : [...picked].sort().join() !== [...member.services].sort().join()
    const hoursDirty = ownHours !== initialHours.own || (ownHours && JSON.stringify(week) !== JSON.stringify(initialHours.week))
    const hoursValid = !ownHours || (hasOpenDay(week) && weekProblems(week).every((p) => !p))

    const run = async (key, work, fallback, done) => {
        setBusy(key)
        setError((e) => ({ ...e, [key]: '' }))
        try {
            await work()
            await onChanged()
            if (done) notify(done)
        } catch (err) {
            console.error(`Team ${key} failed:`, err)
            setError((e) => ({ ...e, [key]: failMessage(err, fallback) }))
        } finally {
            setBusy('')
        }
    }

    const saveDetails = () => run('details', () => updateTeamMember(member.id, name, bookable), 'We could not save. Try again.', 'Saved')
    const saveServices = () => run('services', () => setMemberServices(member.id, every ? [] : picked), 'We could not save the services. Try again.', 'Services saved')
    const saveMemberHours = () => run('hours', async () => {
        if (ownHours) await saveHours(business.id, week, hours, member.id)
        else await clearMemberHours(business.id, member.id)
        await reloadWorkspace()
    }, 'We could not save the hours. Try again.', 'Hours saved')
    const remove = () => run('remove', async () => {
        await removeTeamMember(member.id)
        await reloadWorkspace()
        onClose()
    }, 'We could not remove them. Try again.', `${firstName(member.display_name)} is off the team`)

    const toggle = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
    const others = team.filter((m) => m.id !== member.id && m.is_bookable).length

    return (
        <Sheet open onClose={onClose} title={member.display_name} wide>
            <div className="lc-team-sheet">
                <section className="lc-team-block" aria-label="Details">
                    <Field label="Name clients see">
                        <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Switch
                        checked={bookable}
                        onChange={setBookable}
                        label="Takes bookings"
                        description={bookable ? 'Clients can pick them, or get them when they choose anyone.' : 'Off the booking page. Bookings already made stay.'}
                        disabled={bookable && others === 0}
                    />
                    {detailsDirty && <Button variant="secondary" loading={busy === 'details'} disabled={!name.trim()} onClick={saveDetails}>Save</Button>}
                    {error.details && <p className="lc-team-err" role="alert">{error.details}</p>}
                </section>

                <section className="lc-team-block" aria-labelledby="lc-team-svc">
                    <h3 id="lc-team-svc" className="lc-team-h3">What they do</h3>
                    <Switch checked={every} onChange={setEvery} label="Every service" description="Including services you add later." />
                    {!every && (
                        <ChipGroup label="Services they do">
                            {activeServices.map((s) => <Chip key={s.id} selected={picked.includes(s.id)} onClick={() => toggle(s.id)}>{s.service_name}</Chip>)}
                        </ChipGroup>
                    )}
                    {!every && picked.length === 0 && <p className="lc-team-err">Pick at least one, or they cannot be booked for anything.</p>}
                    {servicesDirty && <Button variant="secondary" loading={busy === 'services'} disabled={!every && picked.length === 0} onClick={saveServices}>Save services</Button>}
                    {error.services && <p className="lc-team-err" role="alert">{error.services}</p>}
                </section>

                <section className="lc-team-block" aria-labelledby="lc-team-hrs">
                    <h3 id="lc-team-hrs" className="lc-team-h3">When they work</h3>
                    <Segmented
                        label="Hours"
                        value={ownHours ? 'own' : 'business'}
                        onChange={(v) => { setOwnHours(v === 'own'); if (v === 'own' && !initialHours.own) setWeek(weekFromRows(hours)) }}
                        options={[{ value: 'business', label: 'Opening hours' }, { value: 'own', label: 'Own hours' }]}
                    />
                    {ownHours
                        ? <HoursEditor week={week} onChange={setWeek} templates={false} timeZone={business.timezone} weekAt="none" />
                        : <p className="lc-team-note">They work whenever you are open. Change your opening hours and theirs follow.</p>}
                    {hoursDirty && <Button variant="secondary" loading={busy === 'hours'} disabled={!hoursValid} onClick={saveMemberHours}>Save hours</Button>}
                    {ownHours && !hoursValid && <p className="lc-team-err">Give them at least one working day, and fix any highlighted times.</p>}
                    {error.hours && <p className="lc-team-err" role="alert">{error.hours}</p>}
                </section>

                {member.role !== 'owner' && (
                    <section className="lc-team-block" aria-labelledby="lc-team-login">
                        <h3 id="lc-team-login" className="lc-team-h3">Their own login</h3>
                        <LoginBlock member={member} businessName={business.business_name} onChanged={onChanged} />
                    </section>
                )}

                {member.role !== 'owner' && (
                    <section className="lc-team-block lc-team-danger" aria-label="Remove">
                        {confirmRemove ? (
                            <>
                                <p className="lc-team-note">{`Take ${member.display_name} off the team? Past visits keep their name. Any bookings ahead must move to someone else first.`}</p>
                                <div className="lc-team-login__acts">
                                    <Button variant="destructive" loading={busy === 'remove'} onClick={remove}>Remove</Button>
                                    <Button variant="secondary" onClick={() => { setConfirmRemove(false); setError((e) => ({ ...e, remove: '' })) }}>Keep</Button>
                                </div>
                            </>
                        ) : (
                            <button type="button" className="lc-team-link is-danger" onClick={() => setConfirmRemove(true)}>{`Remove ${firstName(member.display_name)} from the team`}</button>
                        )}
                        {error.remove && <p className="lc-team-err" role="alert">{error.remove}</p>}
                    </section>
                )}
            </div>
        </Sheet>
    )
}

const Team = () => {
    const { business, isOwner, activeServices, hours, reloadWorkspace } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', team: [] })
    const [adding, setAdding] = useState(false)
    const [openId, setOpenId] = useState(null)

    const load = useCallback(async () => {
        try {
            const team = await loadTeam(business.id)
            setState({ status: 'ready', team })
        } catch (err) {
            console.error('Team failed:', err)
            setState((s) => (s.status === 'ready' ? s : { status: 'error', team: [] }))
        }
    }, [business.id])

    useEffect(() => { if (isOwner) load() }, [isOwner, load])

    const changed = useCallback(async () => {
        await load()
        reloadWorkspace()
    }, [load, reloadWorkspace])

    const team = state.team
    const rows = useMemo(() => team.map((m) => ({ ...m, ...weekFor(hours, m.id) })), [team, hours])
    const span = useMemo(() => {
        const all = rows.flatMap((r) => r.week.flat())
        return all.length ? [Math.min(...all.map((w) => w.start)), Math.max(...all.map((w) => w.end))] : [540, 1140]
    }, [rows])
    const orphans = activeServices.filter((s) => !team.some((m) => m.is_bookable && doesService(m, s.id)))
    const open = team.find((m) => m.id === openId)

    if (!isOwner) {
        return (
            <div className="biz-page lc-team">
                <h1 className="biz-page__title">Team</h1>
                <p className="lc-team__lead">Only the owner can manage the team.</p>
            </div>
        )
    }

    return (
        <div className="biz-page lc-team">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Team</h1>
                    <p className="lc-team__lead">Who takes bookings, what they do and when they work.</p>
                </div>
                {state.status === 'ready' && <Button icon={UserPlus} onClick={() => setAdding(true)}>Add person</Button>}
            </header>

            {state.status === 'loading' && (
                <div className="lc-team__skel" aria-hidden="true">
                    <Skeleton height={76} radius={16} />
                    <Skeleton height={76} radius={16} />
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-team-error" role="alert">
                    <p>We could not load your team. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && (
                <>
                    {orphans.length > 0 && (
                        <p className="lc-team-warn" role="note">
                            <AlertTriangle size={18} aria-hidden="true" />
                            <span>{`Nobody taking bookings does ${orphans.map((s) => s.service_name).join(', ')}, so clients cannot book ${orphans.length === 1 ? 'it' : 'them'}.`}</span>
                        </p>
                    )}

                    <section className="lc-team-card" aria-label="Your team">
                        <div className="lc-team-head" aria-hidden="true">
                            <span />
                            <span className="lc-team-head__days">{DAYS.map((d) => <span key={d}>{DAY_SHORT[d].slice(0, 1)}</span>)}</span>
                            <span />
                        </div>
                        <ul className="lc-team-list">
                            {rows.map((m) => (
                                <li key={m.id}>
                                    <button type="button" className="lc-team-row" onClick={() => setOpenId(m.id)} aria-label={`${m.display_name}. ${rotaLabel(m.week)}.`}>
                                        <Avatar name={m.display_name} size="md" />
                                        <span className="lc-team-row__who">
                                            <strong>
                                                {m.display_name}
                                                {!m.is_bookable && <em className="lc-team-tag">Not bookable</em>}
                                            </strong>
                                            <span>{loginLine(m)}</span>
                                            <span>
                                                {[
                                                    m.services.length ? `${m.services.filter((id) => activeServices.some((s) => s.id === id)).length} of ${activeServices.length} services` : 'Every service',
                                                    m.own ? 'own hours' : 'opening hours',
                                                    m.upcoming ? `${m.upcoming} ahead` : null,
                                                ].filter(Boolean).join(', ')}
                                            </span>
                                        </span>
                                        <Rota week={m.week} span={span} off={!m.is_bookable} />
                                        <ChevronRight size={18} className="lc-team-row__go" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {team.length === 1 && (
                        <div className="lc-team-solo">
                            <p><strong>Working alone?</strong> That is fine. When you take someone on, add them here: they get their own calendar, and clients can pick who they want.</p>
                            <Button variant="secondary" icon={UserPlus} onClick={() => setAdding(true)}>Add person</Button>
                        </div>
                    )}
                </>
            )}

            <AddSheet open={adding} onClose={() => setAdding(false)} onAdded={async (id) => { setAdding(false); await changed(); setOpenId(id) }} />
            {open && <MemberSheet key={open.id} member={open} team={team} onClose={() => setOpenId(null)} onChanged={changed} />}
        </div>
    )
}

export default Team
