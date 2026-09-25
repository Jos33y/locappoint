export const Chip = ({ selected = false, onClick, children, count }) => (
    <button type="button" className={`ui-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
        {children}
        {count != null && <span className="ui-chip__count">{count}</span>}
    </button>
)

export const ChipGroup = ({ label, children }) => (
    <div className="ui-chips" role="group" aria-label={label}>{children}</div>
)
