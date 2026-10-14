const SectionHead = ({ id, eyebrow, title, lede }) => (
    <header className="lc-st-head">
        <span className="lc-st-head__eyebrow">{eyebrow}</span>
        <h2 className="lc-st-head__title" id={id}>{title}</h2>
        {lede && <p className="lc-st-head__lede">{lede}</p>}
    </header>
)

export default SectionHead
