const StaffFilter = ({ members, value, onChange }) => {
    if (members.length < 2) return null
    return (
        <div className="biz-chips" role="radiogroup" aria-label="Show calendar for">
            {[{ id: 'all', display_name: 'Everyone' }, ...members].map((member) => (
                <button
                    key={member.id}
                    type="button"
                    role="radio"
                    aria-checked={value === member.id}
                    className={`biz-chip${value === member.id ? ' is-selected' : ''}`}
                    onClick={() => onChange(member.id)}
                >
                    {member.display_name}
                </button>
            ))}
        </div>
    )
}

export default StaffFilter
