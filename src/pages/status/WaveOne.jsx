import SectionHead from './SectionHead'
import { BUILT } from './content'

const WaveOne = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-built">
        <SectionHead id="lc-st-built" eyebrow="02 / Wave 1" title="What is built" lede="Complete on 13 October. Everything here runs on locappoint.com and the Android app today." />
        <div className="lc-st-built">
            {BUILT.map((group) => (
                <div className="lc-st-built__group" key={group.label}>
                    <h3 className="lc-st-built__label">{group.label}</h3>
                    <ul className="lc-st-built__list">
                        {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            ))}
        </div>
    </section>
)

export default WaveOne
