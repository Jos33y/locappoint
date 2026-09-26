import { useId, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import '../../styles/ui-kit.css'

export const ImagePicker = ({ shape = 'cover', label, hint, value, fallback, onPick, onRemove, busy = false, error }) => {
    const inputId = useId()
    const hintId = `${inputId}-hint`
    const inputRef = useRef(null)
    const [dragging, setDragging] = useState(false)

    const pick = (files) => {
        const file = files?.[0]
        if (file) onPick(file)
    }

    const onDrop = (event) => {
        event.preventDefault()
        setDragging(false)
        if (!busy) pick(event.dataTransfer.files)
    }

    return (
        <div className={`ui-picker ui-picker--${shape}${dragging ? ' is-dragging' : ''}${error ? ' has-error' : ''}`}>
            <span className="ui-picker__label">{label}</span>
            <div
                className="ui-picker__stage"
                onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                {value ? <img className="ui-picker__img" src={value} alt="" /> : <span className="ui-picker__fallback">{fallback}</span>}
                {busy && <span className="ui-picker__busy" role="status"><span className="ui-picker__spin" aria-hidden="true" />Saving photo</span>}
                {!value && !busy && (
                    <label htmlFor={inputId} className="ui-picker__add">
                        <ImagePlus size={18} aria-hidden="true" />
                        <span>{shape === 'logo' ? 'Add logo' : 'Add cover photo'}</span>
                    </label>
                )}
            </div>
            <input
                ref={inputRef}
                id={inputId}
                className="ui-visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                aria-describedby={hint ? hintId : undefined}
                disabled={busy}
                onChange={(event) => { pick(event.target.files); event.target.value = '' }}
            />
            {value && !busy && (
                <div className="ui-picker__actions">
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => inputRef.current?.click()}>
                        <span className="ui-btn__content"><RefreshCw size={16} aria-hidden="true" />Replace</span>
                    </button>
                    <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={onRemove}>
                        <span className="ui-btn__content"><Trash2 size={16} aria-hidden="true" />Remove</span>
                    </button>
                </div>
            )}
            {error ? <span className="ui-picker__error" role="alert">{error}</span> : hint && <span id={hintId} className="ui-picker__hint">{hint}</span>}
        </div>
    )
}
