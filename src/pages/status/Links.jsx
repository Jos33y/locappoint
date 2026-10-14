import SectionHead from './SectionHead'
import { LINKS } from './content'

const Links = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-links">
        <SectionHead id="lc-st-links" eyebrow="07 / Links" title="Live links" />
        <ul className="lc-st-links">
            {LINKS.map((l) => (
                <li key={l.url}>
                    <a className="lc-st-link" href={l.url} target="_blank" rel="noopener noreferrer">
                        <span className={`lc-st-tag lc-st-tag--${l.state === 'live' ? 'done' : 'now'}`}>{l.tag}</span>
                        <span className="lc-st-link__url">{l.label}</span>
                        <span className="lc-st-link__desc">{l.desc}</span>
                    </a>
                </li>
            ))}
        </ul>
    </section>
)

export default Links
