import { PIN_BODY, PIN_RING, PIN_VIEWBOX } from '../../components/common/PinMark'
import SectionHead from './SectionHead'
import { WAVES } from './content'

const WavePin = ({ state }) => (
    <svg className={`lc-st-pin lc-st-pin--${state}`} viewBox={PIN_VIEWBOX} aria-hidden="true">
        <path className="lc-st-pin__ring" d={PIN_RING} />
        <circle className="lc-st-pin__head" cx="100" cy="100" r="31" />
        <path className="lc-st-pin__ring" d={PIN_BODY} />
    </svg>
)

const Waves = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-waves">
        <SectionHead id="lc-st-waves" eyebrow="01 / Where we are" title="The road, wave by wave" lede="Built top to bottom. The route is solid as far as we have come." />
        <ol className="lc-st-route">
            {WAVES.map((w) => (
                <li className={`lc-st-wave is-${w.state}`} key={w.key}>
                    <WavePin state={w.state} />
                    <div className="lc-st-wave__body">
                        <span className="lc-st-wave__name">{w.name}</span>
                        <h3 className="lc-st-wave__title">{w.title}</h3>
                        <p className="lc-st-wave__sub">{w.sub}</p>
                    </div>
                    <span className={`lc-st-tag lc-st-tag--${w.state}`}>{w.tag}</span>
                </li>
            ))}
        </ol>
    </section>
)

export default Waves
