import { Fragment, useCallback, useEffect, useState } from 'react'
import { Bug, RotateCw, Trash2 } from 'lucide-react'
import { supabase } from '../../../config/supabase'
import SectionHead from '../components/SectionHead'

// Crashes reported by the app, newest first. One row per distinct error, with how often and where it happened.
const ErrorsTab = ({ formatDate, formatTime }) => {
    const [rows, setRows] = useState(null)
    const [error, setError] = useState('')
    const [open, setOpen] = useState(null)

    const load = useCallback(async () => {
        setError('')
        const { data, error: dbError } = await supabase
            .from('client_errors')
            .select('id, message, stack, app, path, release, user_agent, user_id, count, first_seen_at, last_seen_at')
            .order('last_seen_at', { ascending: false })
            .limit(200)
        if (dbError) {
            console.error('Errors failed:', dbError)
            setError('Could not load app errors. Run guard.sql if it has not been run.')
            setRows([])
            return
        }
        setRows(data || [])
    }, [])

    useEffect(() => { load() }, [load])

    const clear = async (id) => {
        const { error: dbError } = await supabase.from('client_errors').delete().eq('id', id)
        if (dbError) {
            setError('Could not clear that error.')
            return
        }
        setRows((prev) => prev.filter((r) => r.id !== id))
    }

    const total = (rows || []).reduce((sum, r) => sum + r.count, 0)

    return (
        <div className="tab-content">
            <SectionHead
                icon={Bug}
                title="App errors"
                meta={rows ? `${rows.length} distinct, ${total} in all, last 60 days` : 'Loading'}
                action={
                    <button type="button" onClick={load} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                }
            />
            {error && <p className="cell-note" role="alert">{error}</p>}
            {rows && rows.length === 0 && !error && (
                <div className="empty-state">
                    <div className="empty-state__icon"><Bug size={28} /></div>
                    <h3 className="empty-state__title">No app errors</h3>
                    <p className="empty-state__text">When the app fails on someone&apos;s device, it shows up here.</p>
                </div>
            )}
            {rows && rows.length > 0 && (
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Error</th>
                                <th>App</th>
                                <th>Times</th>
                                <th>Last seen</th>
                                <th><span className="sr-only">Clear</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <Fragment key={r.id}>
                                    <tr
                                        className={`data-table__row--clickable${open === r.id ? ' data-table__row--selected' : ''}`}
                                        onClick={() => setOpen(open === r.id ? null : r.id)}
                                        aria-expanded={open === r.id}
                                    >
                                        <td>
                                            <div className="cell-user__text">
                                                <span className="cell-user__name">{r.message}</span>
                                                <span className="cell-user__email">{r.path}</span>
                                            </div>
                                        </td>
                                        <td>{r.app}</td>
                                        <td>{r.count}</td>
                                        <td>{`${formatDate(r.last_seen_at)} ${formatTime(r.last_seen_at)}`}</td>
                                        <td>
                                            <button type="button" className="btn btn--ghost btn--sm" aria-label={`Clear ${r.message}`} onClick={(e) => { e.stopPropagation(); clear(r.id) }}>
                                                <Trash2 size={13} aria-hidden="true" />
                                            </button>
                                        </td>
                                    </tr>
                                    {open === r.id && (
                                        <tr>
                                            <td colSpan={5}>
                                                <p className="cell-note">{`First seen ${formatDate(r.first_seen_at)}. Release ${r.release || 'unknown'}. ${r.user_id ? 'Signed in.' : 'Signed out.'}`}</p>
                                                <p className="cell-note">{r.user_agent}</p>
                                                <pre className="cell-stack">{r.stack || 'No stack'}</pre>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default ErrorsTab
