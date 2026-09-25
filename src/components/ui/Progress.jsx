export const Progress = ({ value, label, tone = 'brand', showValue = true }) => {
    const percent = Math.round(Math.max(0, Math.min(1, value || 0)) * 100)
    return (
        <div className="ui-progress">
            {(label || showValue) && (
                <div className="ui-progress__head">
                    {label && <span className="ui-progress__label">{label}</span>}
                    {showValue && <span className="ui-progress__value">{percent}%</span>}
                </div>
            )}
            <div className="ui-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label}>
                <span className={`ui-progress__fill ui-progress__fill--${tone}`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}
