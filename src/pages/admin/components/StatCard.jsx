import Sparkline from './Sparkline'

/**
 * StatCard
 * Compact KPI card: header (icon + label), value, optional subtitle, sparkline.
 * accent: 'azure' | 'signal' | 'success' | 'danger'.
 */

const StatCard = ({ icon: Icon, label, value, accent = 'azure', subtitle, sparklineData }) => (
    <div className="stat-card">
        <div className="stat-card__head">
            <div className={`stat-card__icon stat-card__icon--${accent}`}>
                <Icon size={13} aria-hidden="true" />
            </div>
            <span className="stat-card__label">{label}</span>
        </div>
        <div className="stat-card__body">
            <div className="stat-card__value">{value}</div>
            {subtitle && <div className="stat-card__subtitle">{subtitle}</div>}
        </div>
        {sparklineData && (
            <div className="stat-card__sparkline">
                <Sparkline data={sparklineData} accent={accent} height={32} />
            </div>
        )}
    </div>
)

export default StatCard
