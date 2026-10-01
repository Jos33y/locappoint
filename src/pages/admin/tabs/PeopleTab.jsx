import { useEffect, useState } from 'react'
import { RotateCw, Search, Users } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { ago, loadAdminPeople } from '../../../services/admin'
import { usePaged } from './usePaged'

const TYPES = [['', 'Everyone'], ['business', 'Owners'], ['client', 'Clients']]
const PROVIDER = { email: 'Email', google: 'Google', apple: 'Apple' }
const PLATFORM = { android: 'Android', ios: 'iPhone' }

// Everyone with an account: when they joined, how they sign in, and whether they use the phone app.
const PeopleTab = () => {
    const [type, setType] = useState('')
    const { data, error, query, setQuery, page, pages, setPage, reload } = usePaged((args) => loadAdminPeople({ ...args, type }), [type])

    useEffect(() => { setPage(0) }, [type, setPage])

    return (
        <div className="tab-content">
            <SectionHead
                icon={Users}
                title="People"
                meta={data ? `${data.total} ${data.total === 1 ? 'account' : 'accounts'}` : 'Loading'}
                action={(
                    <button type="button" onClick={reload} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                )}
            />

            <div className="adm-toolbar">
                <div className="adm-chips" role="group" aria-label="Who">
                    {TYPES.map(([key, label]) => (
                        <button key={key || 'all'} type="button" className={`adm-chip${type === key ? ' is-on' : ''}`} aria-pressed={type === key} onClick={() => setType(key)}>{label}</button>
                    ))}
                </div>
                <label className="adm-search">
                    <Search size={14} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" aria-label="Search people" />
                </label>
            </div>

            {error && <p className="cell-note" role="alert">{error}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">Nobody matches.</p>}

            {data && data.rows.length > 0 && (
                <div className="data-table-wrap adm-scroll">
                    <table className="data-table adm-table">
                        <thead>
                            <tr>
                                <th className="adm-w-wide">Person</th>
                                <th>Type</th>
                                <th>Signs in with</th>
                                <th>Phone app</th>
                                <th>Joined</th>
                                <th>Last in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <span className="cell-user__text">
                                            <span className="cell-user__name">{p.name || 'No name'}{p.is_admin ? ' (admin)' : ''}</span>
                                            <span className="cell-user__email">{p.email}</span>
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`adm-pill adm-pill--${p.type === 'business' ? 'info' : 'muted'}`}>{p.type === 'business' ? 'Owner' : 'Client'}</span>
                                        <span className="adm-sub"> {p.type === 'business' ? (p.business || '') : `${p.bookings} ${p.bookings === 1 ? 'booking' : 'bookings'}`}</span>
                                    </td>
                                    <td><span className="cell-text">{(p.providers || []).map((x) => PROVIDER[x] || x).join(', ') || 'Email'}</span></td>
                                    <td>
                                        <span className="cell-text">{p.app ? `${PLATFORM[p.app.platform] || 'App'} ${p.app.version || ''}`.trim() : 'Website only'}</span>
                                        {p.push_phones > 0 && <span className="adm-sub"> notifications on</span>}
                                    </td>
                                    <td className="cell-date">{ago(p.joined_at)}</td>
                                    <td className="cell-date">{p.last_sign_in_at ? ago(p.last_sign_in_at) : 'Never'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {data && pages > 1 && (
                <nav className="adm-pager" aria-label="Pages">
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button>
                    <span>Page {page + 1} of {pages}</span>
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Older</button>
                </nav>
            )}
        </div>
    )
}

export default PeopleTab
