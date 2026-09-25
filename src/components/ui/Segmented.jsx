import { useRef } from 'react'

export const Segmented = ({ options, value, onChange, label }) => {
    const refs = useRef([])
    const index = options.findIndex((o) => o.value === value)

    const onKeyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
        onChange(options[next].value)
        refs.current[next]?.focus()
    }

    return (
        <div className="ui-seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
            {options.map((option, i) => (
                <button
                    key={option.value}
                    ref={(el) => { refs.current[i] = el }}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    tabIndex={option.value === value ? 0 : -1}
                    className={`ui-seg__btn${option.value === value ? ' is-selected' : ''}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}
