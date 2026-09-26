import '../../styles/ui-kit.css'

export const Stepper = ({ steps, current }) => (
    <nav className="ui-stepper" aria-label="Setup progress">
        <p className="ui-stepper__caption">
            <span className="ui-stepper__count">Step {current + 1} of {steps.length}</span>
            <span className="ui-stepper__name">{steps[current]}</span>
        </p>
        <ol className="ui-stepper__track">
            {steps.map((step, i) => (
                <li
                    key={step}
                    className={`ui-stepper__seg${i < current ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}
                    aria-current={i === current ? 'step' : undefined}
                >
                    <span className="ui-visually-hidden">{step}{i < current ? ', done' : ''}</span>
                </li>
            ))}
        </ol>
    </nav>
)
