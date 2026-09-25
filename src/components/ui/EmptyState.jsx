export const EmptyState = ({ illustration, title, body, actions }) => (
    <div className="ui-empty">
        {illustration && <div className="ui-empty__art" aria-hidden="true">{illustration}</div>}
        <h3 className="ui-empty__title">{title}</h3>
        {body && <p className="ui-empty__body">{body}</p>}
        {actions && <div className="ui-empty__actions">{actions}</div>}
    </div>
)
