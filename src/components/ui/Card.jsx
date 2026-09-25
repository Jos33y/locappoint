import { Link } from 'react-router-dom'

export const Card = ({ variant = 'flat', padding = 'md', as, to, onClick, title, action, footer, className = '', children, ...rest }) => {
    const interactive = Boolean(to || onClick)
    const classes = [
        'ui-card',
        `ui-card--${variant}`,
        `ui-card--pad-${padding}`,
        interactive && 'ui-card--interactive',
        className,
    ].filter(Boolean).join(' ')

    const body = (
        <>
            {(title || action) && (
                <header className="ui-card__head">
                    {title && <h3 className="ui-card__title">{title}</h3>}
                    {action && <div className="ui-card__action">{action}</div>}
                </header>
            )}
            {children}
            {footer && <footer className="ui-card__foot">{footer}</footer>}
        </>
    )

    if (to) return <Link to={to} className={classes} {...rest}>{body}</Link>
    if (onClick) return <button type="button" className={classes} onClick={onClick} {...rest}>{body}</button>
    const Tag = as || 'section'
    return <Tag className={classes} {...rest}>{body}</Tag>
}
