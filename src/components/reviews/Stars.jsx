import { useId } from 'react'
import '../../styles/reviews.css'

const STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z'

// Stars filled to the exact value, so a 4.6 reads as more than a 4.
export const Stars = ({ value = 0, size = 16, label }) => {
    const id = useId()
    return (
        <span className="lc-stars" role="img" aria-label={label || `${value} out of 5 stars`}>
            {[0, 1, 2, 3, 4].map((i) => {
                const fill = Math.max(0, Math.min(1, value - i))
                return (
                    <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                        <defs>
                            <clipPath id={`${id}-${i}`}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath>
                        </defs>
                        <path className="lc-stars__empty" d={STAR} />
                        {fill > 0 && <path className="lc-stars__full" d={STAR} clipPath={`url(#${id}-${i})`} />}
                    </svg>
                )
            })}
        </span>
    )
}

export const StarPicker = ({ value, onChange, size = 36, label = 'Your rating' }) => {
    const pick = (n) => onChange(Math.max(1, Math.min(5, n)))
    const onKeyDown = (event) => {
        if (['ArrowRight', 'ArrowUp'].includes(event.key)) { event.preventDefault(); pick((value || 0) + 1) }
        if (['ArrowLeft', 'ArrowDown'].includes(event.key)) { event.preventDefault(); pick((value || 1) - 1) }
    }
    return (
        <div className="lc-starpick" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={n === 1 ? '1 star' : `${n} stars`}
                    tabIndex={value ? (value === n ? 0 : -1) : (n === 1 ? 0 : -1)}
                    className={`lc-starpick__star${value >= n ? ' is-on' : ''}`}
                    onClick={() => pick(n)}
                >
                    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
                </button>
            ))}
        </div>
    )
}

// How the stars split, five down to one: the shape of a reputation at a glance.
export const StarBars = ({ stars = [0, 0, 0, 0, 0] }) => {
    const top = Math.max(1, ...stars)
    return (
        <ul className="lc-starbars" aria-label="Reviews by stars">
            {stars.map((n, i) => (
                <li key={i} className="lc-starbars__row">
                    <span className="lc-starbars__label">{5 - i}</span>
                    <span className="lc-starbars__track" aria-hidden="true"><i style={{ width: `${(n / top) * 100}%` }} /></span>
                    <span className="lc-starbars__count">{n}<span className="ui-visually-hidden">{5 - i === 1 ? ' one-star' : ` ${5 - i}-star`} reviews</span></span>
                </li>
            ))}
        </ul>
    )
}
