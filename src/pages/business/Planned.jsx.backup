import { Check } from 'lucide-react'
import { NAV_ITEMS, PLANNED } from '../../components/business/nav'
import '../../styles/business/planned.css'

const Preview = ({ kind }) => {
    if (kind === 'chart') {
        return (
            <div className="lc-preview lc-preview--chart" aria-hidden="true">
                {[38, 52, 44, 70, 62, 88, 56].map((height, i) => (
                    <span key={i} style={{ height: `${height}%` }} />
                ))}
            </div>
        )
    }
    if (kind === 'chat') {
        return (
            <div className="lc-preview lc-preview--chat" aria-hidden="true">
                <span className="lc-bubble lc-bubble--me">What is my day?</span>
                <span className="lc-bubble">Six bookings, two free gaps. Next is Jameson at 10:00.</span>
                <span className="lc-bubble lc-bubble--me">Block 14:00 to 15:00</span>
                <span className="lc-bubble">Blocked. Confirm?</span>
            </div>
        )
    }
    return (
        <div className="lc-preview lc-preview--list" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
                <span key={i} className="lc-ghostrow">
                    <span className="lc-ghostrow__dot" />
                    <span className="lc-ghostrow__line" style={{ width: `${60 - i * 8}%` }} />
                    <span className="lc-ghostrow__tag" />
                </span>
            ))}
        </div>
    )
}

const Planned = ({ section }) => {
    const plan = PLANNED[section]
    const nav = NAV_ITEMS.find((item) => item.planned === section)
    const Icon = nav?.icon

    return (
        <div className="biz-page lc-planned">
            <header className="lc-planned__head">
                <span className="lc-planned__icon">{Icon && <Icon size={22} aria-hidden="true" />}</span>
                <div>
                    <p className="lc-planned__status">In build</p>
                    <h1 className="biz-page__title">{plan.title}</h1>
                </div>
            </header>

            <p className="lc-planned__promise">{plan.promise}</p>

            <div className="lc-planned__grid">
                <Preview kind={plan.preview} />
                <ul className="lc-planned__points">
                    {plan.points.map((point) => (
                        <li key={point}>
                            <Check size={16} aria-hidden="true" />
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default Planned
