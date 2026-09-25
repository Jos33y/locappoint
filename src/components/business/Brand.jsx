export { Ring } from '../ui/Ring'
export { initials } from '../ui/Avatar'

export const Mark = ({ size = 28 }) => (
    <img src="/brand/loca-mark.svg" alt="" width={size} height={size} className="lc-mark" draggable="false" />
)

export const Wordmark = () => (
    <span className="lc-wordmark" aria-label="LocAppoint">
        <span>Loc</span><span className="lc-wordmark__accent">Appoint</span>
    </span>
)

export const BrandLoader = ({ label = 'Loading' }) => (
    <div className="lc-loader" role="status" aria-label={label}>
        <svg className="lc-loader__ring" viewBox="0 0 72 72" aria-hidden="true">
            <defs>
                <linearGradient id="lc-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--azure)" />
                    <stop offset="100%" stopColor="var(--signal)" />
                </linearGradient>
            </defs>
            <circle className="lc-loader__track" cx="36" cy="36" r="30" />
            <circle className="lc-loader__arc" cx="36" cy="36" r="30" />
        </svg>
        <Mark size={32} />
    </div>
)

export const AppLoader = () => (
    <div className="lc-apploader" role="status" aria-label="Loading">
        <div className="lc-apploader__stage">
            <svg className="lc-apploader__ring" viewBox="0 0 92 92" aria-hidden="true">
                <defs>
                    <linearGradient id="lc-app-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--azure)" />
                        <stop offset="100%" stopColor="var(--signal)" />
                    </linearGradient>
                </defs>
                <circle className="lc-apploader__track" cx="46" cy="46" r="38" />
                <circle className="lc-apploader__arc" cx="46" cy="46" r="38" />
            </svg>
            <Mark size={56} />
        </div>
    </div>
)
