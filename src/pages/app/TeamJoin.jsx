import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Mark, Wordmark } from '../../components/business/Brand'
import { Button } from '../../components/ui'
import { USER_ERRORS } from '../../services/booking'
import { acceptTeamInvite, teamInviteInfo } from '../../services/team'
import '../../styles/team-join.css'

// A login link from an owner: see whose team it is, sign in or make an account, then join.
const TeamJoin = () => {
    const { token = '' } = useParams()
    const navigate = useNavigate()
    const { user, business, loading, refreshProfile, setMode } = useAuth()
    const [info, setInfo] = useState({ status: 'loading', data: null })
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        teamInviteInfo(token)
            .then((data) => { if (!cancelled) setInfo({ status: data ? 'ready' : 'gone', data }) })
            .catch((err) => {
                console.error('Invite lookup failed:', err)
                if (!cancelled) setInfo({ status: 'error', data: null })
            })
        return () => { cancelled = true }
    }, [token])

    const join = async () => {
        setJoining(true)
        setError('')
        try {
            await acceptTeamInvite(token)
            await refreshProfile()
            setMode('business')
            navigate('/portal', { replace: true })
        } catch (err) {
            console.error('Join failed:', err)
            setError(USER_ERRORS.includes(err?.code) && err.message ? err.message : 'We could not add you. Try again.')
            setJoining(false)
        }
    }

    const back = `/team/${token}`
    const d = info.data

    return (
        <main className="lc-tj">
            <div className="lc-tj__card">
                <span className="lc-tj__brand"><Mark size={28} /><Wordmark /></span>

                {(info.status === 'loading' || loading) && <p className="lc-tj__sub" aria-busy="true">Checking your link</p>}

                {info.status === 'gone' && !loading && (
                    <>
                        <h1 className="lc-tj__title">This link no longer works</h1>
                        <p className="lc-tj__sub">It expired or was already used. Ask whoever sent it for a new one.</p>
                        <Button variant="secondary" to="/">Go to Locappoint</Button>
                    </>
                )}

                {info.status === 'error' && !loading && (
                    <>
                        <h1 className="lc-tj__title">We could not check your link</h1>
                        <p className="lc-tj__sub">Check your connection, then reload the page.</p>
                    </>
                )}

                {info.status === 'ready' && !loading && (
                    <>
                        {d.logo_url && <img className="lc-tj__logo" src={d.logo_url} alt="" />}
                        <h1 className="lc-tj__title">{`Join ${d.business_name}`}</h1>
                        <p className="lc-tj__sub">
                            {`${d.owner_name ? `${d.owner_name} added you` : 'You were added'} as ${d.display_name}${d.city ? `, in ${d.city}` : ''}. Sign in to see your bookings and your clients on your phone.`}
                        </p>
                        {user && business && !business.staff && (
                            <p className="lc-tj__err" role="alert">This account runs its own business. Sign out and use another account to join a team.</p>
                        )}
                        {user ? (
                            <div className="lc-tj__acts">
                                <Button size="lg" full loading={joining} disabled={Boolean(business)} onClick={join}>{`Join as ${d.display_name}`}</Button>
                                <p className="lc-tj__small">{`Signed in as ${user.email}`}</p>
                            </div>
                        ) : (
                            <div className="lc-tj__acts">
                                <Button size="lg" full onClick={() => navigate('/auth', { state: { tab: 'signup', userType: 'client', returnTo: back } })}>Create your account</Button>
                                <Button variant="secondary" size="lg" full onClick={() => navigate('/auth', { state: { tab: 'signin', returnTo: back } })}>I already have an account</Button>
                            </div>
                        )}
                        {error && <p className="lc-tj__err" role="alert">{error}</p>}
                    </>
                )}
            </div>
            <Link className="lc-tj__foot" to="/">What is Locappoint?</Link>
        </main>
    )
}

export default TeamJoin
