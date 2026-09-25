import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const Spinner = () => (
    <svg className="ui-btn__spinner" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
    </svg>
)

export const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, full = false, to, href, className = '', children, disabled, type = 'button', ...rest },
    ref
) {
    const classes = [
        'ui-btn',
        `ui-btn--${variant}`,
        `ui-btn--${size}`,
        full && 'ui-btn--full',
        loading && 'is-loading',
        className,
    ].filter(Boolean).join(' ')

    const content = (
        <>
            {loading && <Spinner />}
            <span className="ui-btn__content">
                {Icon && <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
                {children}
                {IconRight && <IconRight size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
            </span>
        </>
    )

    if (to) return <Link ref={ref} to={to} className={classes} {...rest}>{content}</Link>
    if (href) return <a ref={ref} href={href} className={classes} {...rest}>{content}</a>

    return (
        <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {content}
        </button>
    )
})

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, variant = 'secondary', size = 'md', className = '', ...rest }, ref) {
    return (
        <button ref={ref} type="button" aria-label={label} title={label} className={`ui-iconbtn ui-iconbtn--${variant} ui-iconbtn--${size} ${className}`} {...rest}>
            <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />
        </button>
    )
})
