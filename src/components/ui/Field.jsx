import { cloneElement, isValidElement, useId } from 'react'

export const Field = ({ label, hint, error, optional = false, children }) => {
    const id = useId()
    const hintId = hint ? `${id}-hint` : undefined
    const errorId = error ? `${id}-error` : undefined
    const control = isValidElement(children)
        ? cloneElement(children, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        })
        : children

    return (
        <div className={`ui-field${error ? ' has-error' : ''}`}>
            <label className="ui-field__label" htmlFor={id}>
                {label}
                {optional && <span className="ui-field__optional">optional</span>}
            </label>
            {control}
            {hint && !error && <span id={hintId} className="ui-field__hint">{hint}</span>}
            {error && <span id={errorId} className="ui-field__error" role="alert">{error}</span>}
        </div>
    )
}

export const Input = (props) => <input className="ui-input" {...props} />

export const Textarea = (props) => <textarea className="ui-input ui-input--area" rows={3} {...props} />

export const Select = ({ children, ...props }) => (
    <span className="ui-select">
        <select className="ui-input" {...props}>{children}</select>
    </span>
)
