import { META_LEFT, SLIP, UPDATED } from './content'

const count = (key, state) => SLIP.find((s) => s.key === key).lines.filter((l) => !state || l.state === state).length

const Hero = () => {
    const stats = [
        { label: 'Cities live', value: '3', of: 'of 3', note: 'Porto, Lagos and Lisbon' },
        { label: 'Launch fixes done', value: String(count('code', 'done')), of: `of ${count('code')}`, note: '1.9 is being built now' },
        { label: 'Meta approvals left', value: String(META_LEFT), of: null, note: 'Then WhatsApp switches on' },
    ]
    return (
        <section className="lc-st-hero reveal" aria-labelledby="lc-st-hero-title">
            <div className="lc-st-hero__glow" aria-hidden="true" />
            <p className="lc-st-hero__eyebrow">
                Status <span aria-hidden="true">/</span> updated <time className="js-relative" dateTime={UPDATED.iso}>{UPDATED.label}</time>
            </p>
            <h1 className="lc-st-hero__title" id="lc-st-hero-title">
                Three cities live. <em>WhatsApp switches on next.</em>
            </h1>
            <p className="lc-st-hero__lede">
                Wave 1 is complete: clients book in Porto, Lagos and Lisbon, pay ahead in Lagos and at the visit in Portugal, and owners run their day from the app. The WhatsApp agent is built and waits on Meta's last approvals. Before Wave 2: eleven small launch fixes, then one design system on every page.
            </p>
            <dl className="lc-st-hero__stats">
                {stats.map((s) => (
                    <div className="lc-st-stat" key={s.label}>
                        <dt>{s.label}</dt>
                        <dd>
                            <b>{s.value}</b>
                            {s.of && <span className="lc-st-stat__of">{s.of}</span>}
                            <small>{s.note}</small>
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}

export default Hero
