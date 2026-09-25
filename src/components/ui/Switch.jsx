import { useId } from 'react'

export const Switch = ({ checked, onChange, label, description, disabled = false }) => {
    const id = useId()
    return (
        <div className={`ui-switchrow${disabled ? ' is-disabled' : ''}`}>
            <span className="ui-switchrow__text">
                <label htmlFor={id} className="ui-switchrow__label">{label}</label>
                {description && <span className="ui-switchrow__desc">{description}</span>}
            </span>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                className={`ui-switch${checked ? ' is-on' : ''}`}
                onClick={() => onChange(!checked)}
            >
                <span className="ui-switch__thumb" />
            </button>
        </div>
    )
}
