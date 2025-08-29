import Icon from './Icon'

const Validation = () => {
    return (
        <section className="validation" aria-labelledby="validation-title">
            <div className="container">
                <div className="validation__content">
                    <p className="validation__text">
                        Launching in Lisbon & Porto first
                    </p>

                    <div className="validation__badges">
                        <div className="validation__badge">
                            <Icon name="mapPin" size={20} ariaLabel="Location verified" />
                            <span>PT Focused</span>
                        </div>
                        <div className="validation__badge">
                            <Icon name="shield" size={20} ariaLabel="Secure platform" />
                            <span>Secure</span>
                        </div>
                        <div className="validation__badge">
                            <Icon name="smartphone" size={20} ariaLabel="Mobile optimized" />
                            <span>Mobile First</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Validation