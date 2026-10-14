import SectionHead from './SectionHead'
import { COSTS, NEEDS } from './content'

const Needs = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-needs">
        <SectionHead id="lc-st-needs" eyebrow="08 / Who we wait on" title="What we need, and from whom" lede="Each runs on an outside clock, so the earlier it starts the better." />
        <div className="lc-st-needs">
            {NEEDS.map((n) => (
                <article className="lc-st-need" key={n.title}>
                    <header className="lc-st-need__head">
                        <span className="lc-st-need__who">{n.who}</span>
                        <span className="lc-st-need__when">{n.when}</span>
                    </header>
                    <h3 className="lc-st-need__title">{n.title}</h3>
                    <p className="lc-st-need__text">{n.text}</p>
                </article>
            ))}
        </div>
        <article className="lc-st-slip lc-st-costs" aria-labelledby="lc-st-costs-title">
            <header className="lc-st-slip__head">
                <span className="lc-st-slip__title" id="lc-st-costs-title">Launch costs</span>
                <span className="lc-st-slip__date">USD, card charge included</span>
            </header>
            <table className="lc-st-costs__table">
                <thead>
                    <tr><th scope="col">Item</th><th scope="col">How often</th><th scope="col" className="is-num">Fee</th></tr>
                </thead>
                <tbody>
                    {COSTS.rows.map(([item, often, fee]) => (
                        <tr key={item}><th scope="row">{item}</th><td>{often}</td><td className="is-num">{fee}</td></tr>
                    ))}
                </tbody>
            </table>
            <footer className="lc-st-slip__total">
                <div><span>Total to start</span><b>USD {COSTS.total}</b></div>
                <div><span>Every year after</span><b>USD {COSTS.yearly}</b></div>
            </footer>
            <p className="lc-st-costs__note"><b>D-U-N-S number:</b> asked for in the Apple sign-up, where the look-up is free. If that fails, D&amp;B's DUNSFile costs USD 230 and the total to start becomes USD 483.</p>
            <p className="lc-st-costs__note"><b>Verified badge:</b> EUR 1.25 per ID check that passes, through Stripe Identity, paid by Locappoint. About EUR 25 for the first 20 businesses.</p>
        </article>
    </section>
)

export default Needs
