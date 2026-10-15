// A section opens with what it is about, in words; no labels above titles.
const Head = ({ id, title, lede, big = false }) => (
    <header className={`lc-home-head${big ? ' is-big' : ''}`}>
        <h2 className="lc-home-head__title" id={id}>{title}</h2>
        {lede && <p className="lc-home-head__lede">{lede}</p>}
    </header>
)

export default Head
