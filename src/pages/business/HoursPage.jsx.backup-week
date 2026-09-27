import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button, Skeleton, Status } from '../../components/ui'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { HoursEditor } from '../../components/business/HoursEditor'
import { openStatus } from '../../components/business/PublicPageView'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { hasOpenDay, rowsFromWeek, weekFromRows, weekProblems } from '../../services/hours'
import { loadSetup, saveHours } from '../../services/setup'
import { pageUrl } from '../../services/links'
import '../../styles/business/services-hours.css'

const snapshot = (week) => JSON.stringify(rowsFromWeek(week))

const LoadingState = () => (
    <div className="biz-page biz-sh" aria-busy="true">
        <header className="biz-page__head">
            <div>
                <Skeleton width={180} height={28} />
                <Skeleton width={240} height={14} />
            </div>
        </header>
        <div className="biz-sh__column">
            <Skeleton height={88} radius={16} />
            <Skeleton height={220} radius={16} />
        </div>
    </div>
)

const HoursPage = () => {
    const { business: shellBusiness, reloadWorkspace } = useWorkspace()
    const [phase, setPhase] = useState('loading')
    const [timezone, setTimezone] = useState('Europe/Lisbon')
    const [rows, setRows] = useState([])
    const [week, setWeek] = useState(null)
    const [savedKey, setSavedKey] = useState('')
    const [simplified, setSimplified] = useState(false)
    const current = useRef({ week, rows })
    current.current = { week, rows }

    const load = useCallback(async () => {
        setPhase('loading')
        try {
            const data = await loadSetup(shellBusiness.id)
            const loaded = weekFromRows(data.hours)
            setTimezone(data.business.timezone || 'Europe/Lisbon')
            setRows(data.hours)
            setWeek(loaded)
            setSavedKey(snapshot(loaded))
            setSimplified(loaded.some((day) => day.length > 2))
            setPhase('ready')
        } catch (err) {
            console.error('Hours load failed:', err)
            setPhase('failed')
        }
    }, [shellBusiness.id])

    useEffect(() => { load() }, [load])

    const valid = Boolean(week) && hasOpenDay(week) && weekProblems(week).every((p) => !p)
    const key = useMemo(() => (week ? snapshot(week) : ''), [week])
    const dirty = phase === 'ready' && key !== savedKey

    const autosave = useAutosave({
        pending: dirty && valid ? key : '',
        ready: phase === 'ready',
        blocked: dirty && !valid,
        delay: 900,
        save: async () => {
            const sent = current.current.week
            const saved = await saveHours(shellBusiness.id, sent, current.current.rows)
            setRows(saved)
            setSavedKey(snapshot(weekFromRows(saved)))
            reloadWorkspace()
        },
    })

    const status = useMemo(() => (week && valid ? openStatus(week, timezone) : null), [week, valid, timezone])

    if (phase === 'loading') return <LoadingState />
    if (phase === 'failed') {
        return (
            <div className="biz-page biz-sh">
                <div className="biz-state" role="alert">
                    <p>We could not load your hours. Check your connection and try again.</p>
                    <Button variant="secondary" onClick={load}>Try again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="biz-page biz-sh">
            <header className="biz-page__head biz-sh__head">
                <div>
                    <h1 className="biz-page__title">Opening hours</h1>
                    <p className="biz-page__sub biz-sh__now">
                        {status ? (
                            <>
                                <Status tone={status.open ? 'success' : 'neutral'} size="sm">{status.open ? 'Open now' : 'Closed now'}</Status>
                                <span>{status.text}</span>
                            </>
                        ) : 'When clients can book you.'}
                    </p>
                </div>
                <div className="biz-sh__headside">
                    <SaveState state={autosave.state} onRetry={autosave.retry} blockedText="Fix the highlighted hours to save them" />
                    <Button variant="secondary" size="sm" iconRight={ArrowUpRight} href={pageUrl(shellBusiness.slug)} target="_blank" rel="noopener noreferrer">View live page</Button>
                </div>
            </header>

            <div className="biz-sh__column">
                {simplified && (
                    <p className="biz-sh__note" role="note">
                        Some days had more than one break. They are shown here with one lunch break, and saving keeps what you see.
                    </p>
                )}
                <HoursEditor week={week} onChange={setWeek} />
                <p className="biz-sh__tip">Clients can book any time inside these hours. Changes do not move bookings already made.</p>
            </div>
        </div>
    )
}

export default HoursPage
