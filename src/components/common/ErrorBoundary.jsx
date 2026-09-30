import { Component } from 'react'
import { useLocation } from 'react-router-dom'
import { House, RotateCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { isChunkError, reloadOnce, reportError } from '../../services/errors'
import '../../styles/system.css'

const CrashScreen = ({ full, update }) => (
    <div className={`lc-sys-crash${full ? ' is-full' : ''}`} role="alert">
        <div className="lc-sys-crash__box">
            <h1 className="lc-sys-crash__title">{update ? 'A new version of Locappoint is ready' : 'This screen did not load'}</h1>
            <p className="lc-sys-crash__text">
                {update
                    ? 'Reload to get it. Nothing you saved is lost.'
                    : 'Something went wrong on our side and we have been sent the details. Your bookings and changes already saved are safe. Reload to try again.'}
            </p>
            <div className="lc-sys-crash__acts">
                <Button icon={RotateCw} onClick={() => window.location.reload()}>Reload</Button>
                {!update && <Button variant="secondary" icon={House} href="/">Go to the start</Button>}
            </div>
        </div>
    </div>
)

// Catches a crash in the screen below it, reports it, and shows a way out instead of a blank page.
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    // A new resetKey (the route) clears the crash without remounting what did not crash, such as the portal shell.
    componentDidUpdate(prev) {
        if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
    }

    componentDidCatch(error, info) {
        if (isChunkError(error) && reloadOnce()) return
        reportError(error, { componentStack: info?.componentStack, app: this.props.app })
    }

    render() {
        if (this.state.error) return <CrashScreen full={this.props.full} update={isChunkError(this.state.error)} />
        return this.props.children
    }
}

// Inside the router: moving to another screen clears the crash, so the rest of the app stays usable.
export const RouteBoundary = ({ full = false, children }) => {
    const { pathname } = useLocation()
    return <ErrorBoundary resetKey={pathname} full={full}>{children}</ErrorBoundary>
}
