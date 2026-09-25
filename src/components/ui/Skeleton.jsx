export const Skeleton = ({ width = '100%', height = 16, radius, circle = false, lines }) => {
    if (lines) {
        return (
            <span className="ui-skel-lines" aria-hidden="true">
                {Array.from({ length: lines }, (_, i) => (
                    <span key={i} className="ui-skel" style={{ width: i === lines - 1 ? '60%' : '100%', height }} />
                ))}
            </span>
        )
    }
    return (
        <span
            className="ui-skel"
            aria-hidden="true"
            style={{ width: circle ? height : width, height, borderRadius: circle ? '50%' : radius }}
        />
    )
}
