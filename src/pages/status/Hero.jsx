import { NEXT_FIX, NEXT_SWITCH, SLIP, UPDATED } from './content'

const count = (key, state) => SLIP.find((s) => s.key === key).lines.filter((l) => !state || l.state === state).length

const Hero = () => {
    const stats = [
        { label: 'Countries live', value: '2', of: 'of 2', note: 'Nigeria and Portugal, every state and district' },
        { label: 'Launch fixes done', value: String(count('code', 'done')), of: `of ${count('code')}`, note: NEXT_FIX },
        { label: 'Switch-ons done', value: String(count('switch', 'done')), of: `of ${count('switch')}`, note: NEXT_SWITCH },
    ]
    return (
        <section className="lc-st-hero reveal" aria-labelledby="lc-st-hero-title">
            <div className="lc-st-hero__glow" aria-hidden="true" />
            <p className="lc-st-hero__eyebrow">
                Status <span aria-hidden="true">/</span> updated <time className="js-relative" dateTime={UPDATED.iso}>{UPDATED.label}</time>
            </p>
            <h1 className="lc-st-hero__title" id="lc-st-hero-title">
                Two countries live. <em>WhatsApp and Paystack are on.</em>
            </h1>
            <p className="lc-st-hero__lede">
                Businesses join anywhere in Nigeria and Portugal. Clients search from where they are, on the web and on WhatsApp, pay ahead in Nigeria and at the visit in Portugal, and owners run their day from the app. Left before launch: one live refund, the test data cleared, a clean-up pass, the English copy, then Portuguese.
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
