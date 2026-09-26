import '../../styles/ui-kit.css'

export const PhoneFrame = ({ children, label }) => (
    <figure className="ui-phone" aria-label={label}>
        <div className="ui-phone__screen">
            <span className="ui-phone__island" aria-hidden="true" />
            <div className="ui-phone__scroll">{children}</div>
        </div>
    </figure>
)
