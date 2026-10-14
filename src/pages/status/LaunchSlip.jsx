import SectionHead from './SectionHead'
import { SLIP } from './content'

const STATE = { done: 'Done', now: 'Building', open: 'To do', wait: 'Waiting' }

const LaunchSlip = () => {
    const done = (key) => SLIP.find((s) => s.key === key).lines.filter((l) => l.state === 'done').length
    const total = (key) => SLIP.find((s) => s.key === key).lines.length
    return (
        <section className="lc-st-section reveal" aria-labelledby="lc-st-slip">
            <SectionHead id="lc-st-slip" eyebrow="03 / Before launch" title="The launch list" lede="Every item left between today and launch, in order. Stamped when it closes." />
            <article className="lc-st-slip">
                <header className="lc-st-slip__head">
                    <span className="lc-st-slip__title">Launch list</span>
                    <span className="lc-st-slip__date">14 Oct 2026</span>
                </header>
                {SLIP.map((part) => (
                    <div className={`lc-st-slip__part lc-st-slip__part--${part.key}`} key={part.key}>
                        <h3 className="lc-st-slip__part-title">{part.title}</h3>
                        <ul className="lc-st-slip__lines">
                            {part.lines.map((l) => (
                                <li className={`lc-st-slip__line is-${l.state}`} key={`${l.n}-${l.text}`}>
                                    <span className="lc-st-slip__n">{l.n}</span>
                                    <span className="lc-st-slip__text">{l.text}</span>
                                    {l.state === 'done'
                                        ? <span className="lc-st-stamp">Done</span>
                                        : <span className="lc-st-slip__state">{STATE[l.state]}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                <footer className="lc-st-slip__total">
                    <div><span>Code fixes</span><b>{done('code')} of {total('code')}</b></div>
                    <div><span>Switch-ons</span><b>{done('switch')} of {total('switch')}</b></div>
                    <div><span>Outside our hands</span><b>{total('wait')} open</b></div>
                </footer>
            </article>
        </section>
    )
}

export default LaunchSlip
