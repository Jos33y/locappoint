import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronRight, Mail, MessageCircle, NotebookPen, Phone, RotateCw, Search, Share2 } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Avatar, Button, Field, Input, Segmented, Sheet, Skeleton, Textarea } from '../../components/ui'
import { shortTime, whatsappLink, zonedNow } from '../../services/business'
import { USER_ERRORS, shortDate } from '../../services/booking'
import { shortDay } from '../../services/inbox'
import { moneyFor } from '../../services/insights'
import { OUTCOME_LABEL, gapLabel, isDueBack, loadClientHistory, loadClients, saveClientNote, visitsLabel } from '../../services/clients'
import { BlockedClients } from '../../components/blocks/BlockedClients'
import '../../styles/business/clients.css'

const PAGE = 60

const failMessage = (err, fallback) => (USER_ERRORS.includes(err?.code) && err.message ? err.message : fallback)

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

// The client's last twelve outcomes, oldest to newest: the pattern shows before any number is read.
const VisitStrip = ({ recent }) => {
    if (!recent?.length) return <span className="lc-cli-strip is-empty" aria-hidden="true" />
    const came = recent.filter((o) => o === 'came').length
    const missed = recent.length - came
    return (
        <span className="lc-cli-strip" role="img" aria-label={`Last ${recent.length}: ${came} came${missed ? `, ${missed} missed` : ''}`}>
            {[...recent].reverse().map((o, i) => <span key={i} className={`lc-cli-strip__dot is-${o}`} />)}
        </span>
    )
}

const Reliability = ({ value }) => (
    <span className={`lc-cli-rel${value == null ? ' is-new' : value < 70 ? ' is-low' : value >= 90 ? ' is-high' : ''}`}>
        {value == null ? 'New' : <><b className="biz-num">{value}</b>%</>}
    </span>
)

const EmptyClients = () => (
    <div className="lc-cli-empty">
        <svg className="lc-cli-empty__art" width="232" height="120" viewBox="0 0 232 120" aria-hidden="true">
            <rect className="lc-cli-empty__card" x="1" y="1" width="230" height="118" rx="16" />
            {[24, 60].map((y) => (
                <g key={y}>
                    <circle className="lc-cli-empty__face" cx="32" cy={y + 12} r="11" />
                    <rect className="lc-cli-empty__line" x="52" y={y + 4} width="70" height="7" rx="3.5" />
                    <rect className="lc-cli-empty__line is-soft" x="52" y={y + 15} width="46" height="6" rx="3" />
                    {[0, 1, 2, 3, 4].map((i) => <circle key={i} className={`lc-cli-empty__dot${y === 60 && i === 2 ? ' is-miss' : ''}`} cx={146 + i * 14} cy={y + 12} r="4.5" />)}
                </g>
            ))}
        </svg>
        <div className="lc-cli-empty__text">
            <h2>No clients yet</h2>
            <p>Everyone who books you shows up here after their first booking, online or added by you, with their visits and how reliable they are.</p>
        </div>
        <Button variant="secondary" icon={Share2} to="/portal/channels">Share your page</Button>
    </div>
)

const ClientSheet = ({ client, money, onClose, onBook, onNoted }) => {
    const { business } = useWorkspace()
    const [history, setHistory] = useState({ status: 'loading', data: null })
    const [note, setNote] = useState('')
    const [savedNote, setSavedNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [noteState, setNoteState] = useState('')

    const load = useCallback(async () => {
        setHistory({ status: 'loading', data: null })
        try {
            const data = await loadClientHistory(business.id, client.key)
            setHistory({ status: 'ready', data })
            setNote(data.note?.body || '')
            setSavedNote(data.note?.body || '')
        } catch (err) {
            console.error('Client history failed:', err)
            setHistory({ status: 'error', data: null })
        }
    }, [business.id, client.key])

    useEffect(() => { load() }, [load])

    const save = async () => {
        setSaving(true)
        setNoteState('')
        try {
            await saveClientNote(business.id, client.key, note)
            setSavedNote(note.trim())
            setNote(note.trim())
            setNoteState('Saved')
            onNoted(client.key, Boolean(note.trim()))
        } catch (err) {
            console.error('Note failed:', err)
            setNoteState(failMessage(err, 'We could not save the note. Try again.'))
        } finally {
            setSaving(false)
        }
    }

    const whatsapp = whatsappLink(client.phone)
    const next = client.next_at ? `${shortDay(client.next_at)}, ${client.next_at.slice(11, 16)}` : ''

    return (
        <Sheet open onClose={onClose} title={client.name}>
            <div className="lc-cli-sheet">
                <dl className="lc-cli-figs">
                    <div><dt>Visits</dt><dd className="biz-num">{client.visits}</dd></div>
                    <div><dt>Reliable</dt><dd><Reliability value={client.reliability} /></dd></div>
                    <div><dt>Spent</dt><dd className="biz-num">{money(client.spent)}</dd></div>
                    <div><dt>Comes</dt><dd>{client.gap_days ? gapLabel(client.gap_days) : 'Not yet known'}</dd></div>
                </dl>

                {next && <p className="lc-cli-next">Next booking {next}</p>}
                {(client.no_shows > 0 || client.late_cancels > 0) && (
                    <p className="lc-cli-missed">
                        {[client.no_shows && `${client.no_shows} no-show${client.no_shows === 1 ? '' : 's'}`, client.late_cancels && `${client.late_cancels} late cancel${client.late_cancels === 1 ? '' : 's'}`].filter(Boolean).join(', ')}
                    </p>
                )}

                <Button variant="primary" size="lg" icon={CalendarPlus} onClick={() => onBook(client)}>Book {firstName(client.name) || 'again'}</Button>

                {(client.phone || client.email) && (
                    <div className="biz-contact">
                        {client.phone && <a className="biz-contact__btn" href={`tel:${client.phone}`}><Phone size={18} /> Call</a>}
                        {whatsapp && <a className="biz-contact__btn" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> WhatsApp</a>}
                        {client.email && <a className="biz-contact__btn" href={`mailto:${client.email}`}><Mail size={18} /> Email</a>}
                    </div>
                )}

                <div className="lc-cli-note">
                    <Field label="Private note" hint="Only your team sees this. Preferences, what they had last time, anything worth remembering.">
                        <Textarea value={note} maxLength={2000} disabled={history.status !== 'ready'} onChange={(e) => { setNote(e.target.value); setNoteState('') }} />
                    </Field>
                    {(note.trim() !== savedNote || noteState) && (
                        <div className="lc-cli-note__row">
                            {note.trim() !== savedNote && <Button variant="secondary" loading={saving} onClick={save}>Save note</Button>}
                            {noteState && <span className={`lc-cli-note__state${noteState === 'Saved' ? '' : ' is-bad'}`} role="status">{noteState}</span>}
                        </div>
                    )}
                </div>

                <section aria-labelledby="lc-cli-hist">
                    <h3 id="lc-cli-hist" className="lc-cli-h3">History</h3>
                    {history.status === 'loading' && <Skeleton height={120} radius={12} />}
                    {history.status === 'error' && (
                        <div className="lc-cli-error" role="alert">
                            <p>We could not load the visits.</p>
                            <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                        </div>
                    )}
                    {history.status === 'ready' && (
                        <ol className="lc-cli-hist">
                            {history.data.visits.map((v) => (
                                <li key={v.id} className="lc-cli-hist__row">
                                    <span className="lc-cli-hist__when biz-num">{shortDay(v.date)}<small>{shortTime(v.time)}</small></span>
                                    <span className="lc-cli-hist__what">
                                        <strong>{v.service || 'Service removed'}</strong>
                                        <span>{[v.staff, v.price != null ? money(v.price) : null].filter(Boolean).join(', ')}</span>
                                    </span>
                                    <span className={`lc-cli-hist__out is-${v.outcome}`}>{v.status === 'pending' ? 'Waiting' : OUTCOME_LABEL[v.outcome]}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </Sheet>
    )
}

const Clients = () => {
    const { business, isOwner, bookableMembers, activeServices, openNewBooking } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', list: [] })
    const [query, setQuery] = useState('')
    const [view, setView] = useState('all')
    const [shown, setShown] = useState(PAGE)
    const [params, setParams] = useSearchParams()
    const money = useMemo(() => moneyFor(business.country), [business.country])
    const today = zonedNow(business.timezone).dateKey

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            setState({ status: 'ready', list: await loadClients(business.id) })
        } catch (err) {
            console.error('Clients failed:', err)
            setState({ status: 'error', list: [] })
        }
    }, [business.id])

    useEffect(() => { load() }, [load])

    const openKey = params.get('client')
    const open = openKey ? state.list.find((c) => c.key === openKey) : null
    const setOpen = (key) => setParams((p) => {
        const next = new URLSearchParams(p)
        if (key) next.set('client', key)
        else next.delete('client')
        return next
    }, { replace: true })

    const book = (client) => {
        setOpen(null)
        openNewBooking({
            name: client.name,
            phone: client.phone || '',
            email: client.email || '',
            serviceId: activeServices.some((s) => s.id === client.service_id) ? client.service_id : undefined,
            staffId: isOwner && bookableMembers.some((m) => m.id === client.staff_id) ? client.staff_id : undefined,
        })
    }

    const noted = (key, has) => setState((s) => ({ ...s, list: s.list.map((c) => (c.key === key ? { ...c, has_note: has } : c)) }))

    const list = state.list
    const due = useMemo(() => list.filter((c) => isDueBack(c, today)).sort((a, b) => a.due_on.localeCompare(b.due_on)), [list, today])
    const regulars = list.filter((c) => c.visits >= 3).length
    const missed = list.filter((c) => c.no_shows + c.late_cancels > 0).length

    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    const filtered = list.filter((c) => {
        if (view === 'regulars' && c.visits < 3) return false
        if (view === 'missed' && c.no_shows + c.late_cancels === 0) return false
        if (!q) return true
        return c.name.toLowerCase().includes(q)
            || (c.email || '').toLowerCase().includes(q)
            || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits))
    })

    const nudge = (client) => whatsappLink(client.phone, `Hi ${firstName(client.name)}, it is ${business.business_name}. Ready for your next visit? Reply with a day that suits you and I will book you in.`)

    return (
        <div className="biz-page lc-cli">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Clients</h1>
                    <p className="lc-cli__lead">
                        {state.status === 'ready' && list.length > 0
                            ? `${list.length} ${list.length === 1 ? 'person has' : 'people have'} booked ${isOwner ? 'you' : 'with you'}.`
                            : isOwner ? 'Everyone who books you, in one place.' : 'The clients you have seen.'}
                    </p>
                </div>
            </header>

            {isOwner && <BlockedClients businessId={business.id} />}

            {state.status === 'loading' && (
                <div className="lc-cli__skel" aria-hidden="true">
                    <Skeleton height={120} radius={20} />
                    <Skeleton height={64} radius={16} />
                    <Skeleton height={64} radius={16} />
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-cli-error" role="alert">
                    <p>We could not load your clients. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && list.length === 0 && <EmptyClients />}

            {state.status === 'ready' && list.length > 0 && (
                <>
                    {due.length > 0 && (
                        <section className="lc-cli-due" aria-labelledby="lc-cli-due">
                            <div className="lc-cli-due__head">
                                <h2 id="lc-cli-due" className="lc-cli-h2">Due back <span className="biz-num">{due.length}</span></h2>
                                <p>Regulars past their usual gap, with nothing booked.</p>
                            </div>
                            <ul className="lc-cli-due__list">
                                {due.map((c) => (
                                    <li key={c.key} className="lc-cli-due__item">
                                        <button type="button" className="lc-cli-due__who" onClick={() => setOpen(c.key)}>
                                            <Avatar name={c.name} size="md" />
                                            <span>
                                                <strong>{c.name}</strong>
                                                <span>{`Comes ${gapLabel(c.gap_days)}, last ${shortDate(c.last_visit)}`}</span>
                                            </span>
                                        </button>
                                        <span className={`lc-cli-due__when${c.due_on < today ? ' is-late' : ''}`}>
                                            {c.due_on <= today ? `Due since ${shortDate(c.due_on)}` : `Due ${shortDay(c.due_on)}`}
                                        </span>
                                        <span className="lc-cli-due__acts">
                                            {nudge(c) && (
                                                <Button variant="secondary" icon={MessageCircle} href={nudge(c)} target="_blank" rel="noopener noreferrer">Message</Button>
                                            )}
                                            <Button variant="secondary" icon={CalendarPlus} onClick={() => book(c)}>Book</Button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="lc-cli-tools">
                        <label className="lc-cli-search">
                            <Search size={18} aria-hidden="true" />
                            <Input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} placeholder="Name, phone or email" aria-label="Search clients" />
                        </label>
                        <Segmented
                            label="Show"
                            value={view}
                            onChange={(v) => { setView(v); setShown(PAGE) }}
                            options={[
                                { value: 'all', label: `All ${list.length}` },
                                { value: 'regulars', label: `Regulars ${regulars}` },
                                { value: 'missed', label: `Missed ${missed}` },
                            ]}
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <p className="lc-cli__none">{q ? `No client matches "${query.trim()}".` : view === 'missed' ? 'No one has missed a visit. Good sign.' : 'No regulars yet. Anyone with three visits shows up here.'}</p>
                    ) : (
                        <ul className="lc-cli-list">
                            {filtered.slice(0, shown).map((c) => (
                                <li key={c.key}>
                                    <button type="button" className="lc-cli-row" onClick={() => setOpen(c.key)}>
                                        <Avatar name={c.name} size="md" />
                                        <span className="lc-cli-row__who">
                                            <strong>
                                                {c.name}
                                                {c.has_note && <NotebookPen size={14} className="lc-cli-row__note" aria-label="Has a note" />}
                                            </strong>
                                            <span>
                                                {c.next_at
                                                    ? `Booked ${shortDay(c.next_at)}, ${c.next_at.slice(11, 16)}`
                                                    : c.visits ? `${visitsLabel(c.visits)}, last ${shortDate(c.last_visit)}` : 'No visits yet'}
                                            </span>
                                        </span>
                                        <VisitStrip recent={c.recent} />
                                        <Reliability value={c.reliability} />
                                        <ChevronRight size={18} className="lc-cli-row__go" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {filtered.length > shown && (
                        <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>{`Show ${Math.min(PAGE, filtered.length - shown)} more`}</Button>
                    )}
                </>
            )}

            {open && <ClientSheet client={open} money={money} onClose={() => setOpen(null)} onBook={book} onNoted={noted} />}
        </div>
    )
}

export default Clients
