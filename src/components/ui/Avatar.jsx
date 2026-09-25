export const initials = (name = '') =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'L'

export const Avatar = ({ name, src, size = 'md', shape = 'round', tone = 'neutral' }) => (
    <span className={`ui-avatar ui-avatar--${size} ui-avatar--${shape} ui-avatar--${tone}`} aria-hidden={!name}>
        {src ? <img src={src} alt="" /> : initials(name)}
    </span>
)
