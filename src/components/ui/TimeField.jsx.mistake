import '../../styles/ui-kit.css'

const pad = (n) => String(n).padStart(2, '0')

const OPTIONS = Array.from({ length: 96 }, (_, i) => i * 15).concat(24 * 60 - 1)

const label = (minutes) => (minutes === 24 * 60 - 1 ? '23:59' : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)

export const TimeField = ({ value, onChange, label: ariaLabel, min = 0, max = 24 * 60 - 1, invalid = false }) => (
    <span className={`ui-time${invalid ? ' is-invalid' : ''}`}>
        <select
            className="ui-time__select"
            value={value}
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(Number(event.target.value))}
        >
            {OPTIONS.filter((m) => (m >= min && m <= max) || m === value).map((m) => (
                <option key={m} value={m}>{label(m)}</option>
            ))}
        </select>
    </span>
)
