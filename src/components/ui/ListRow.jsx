import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export const ListRow = ({ leading, title, subtitle, meta, trailing, to, onClick, selected = false, dense = false, chevron }) => {
    const interactive = Boolean(to || onClick)
    const classes = ['ui-row', dense && 'ui-row--dense', interactive && 'ui-row--interactive', selected && 'is-selected'].filter(Boolean).join(' ')
    const body = (
        <>
            {leading && <span className="ui-row__leading">{leading}</span>}
            <span className="ui-row__main">
                <span className="ui-row__title">{title}</span>
                {subtitle && <span className="ui-row__subtitle">{subtitle}</span>}
            </span>
            {meta && <span className="ui-row__meta">{meta}</span>}
            {trailing}
            {(chevron ?? interactive) && <ChevronRight size={16} className="ui-row__chevron" aria-hidden="true" />}
        </>
    )
    if (to) return <Link to={to} className={classes} aria-current={selected || undefined}>{body}</Link>
    if (onClick) return <button type="button" className={classes} onClick={onClick} aria-pressed={selected || undefined}>{body}</button>
    return <div className={classes}>{body}</div>
}
