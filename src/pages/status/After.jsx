import SectionHead from './SectionHead'
import { AFTER } from './content'

const After = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-after">
        <SectionHead id="lc-st-after" eyebrow="06 / After launch" title="What comes next" lede="Each Wave 2 feature is judged against the four weeks before launch, and kept only if it moves the numbers." />
        <div className="lc-st-after">
            {AFTER.map((group) => (
                <div className="lc-st-after__group" key={group.label}>
                    <h3 className="lc-st-after__label">{group.label}</h3>
                    <ul className="lc-st-after__list">
                        {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            ))}
        </div>
    </section>
)

export default After
