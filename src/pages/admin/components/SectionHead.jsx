/**
 * SectionHead
 * Compact tab header. Icon tile + title + meta + actions.
 * Reusable across Waitlist, Partnership, Analytics tabs.
 */

const SectionHead = ({ icon: Icon, title, meta, action }) => (
    <header className="section-head">
        <div className="section-head__title-group">
            <div className="section-head__icon">
                <Icon size={18} aria-hidden="true" />
            </div>
            <div className="section-head__text">
                <h2 className="section-head__title">{title}</h2>
                {meta && <span className="section-head__meta">{meta}</span>}
            </div>
        </div>
        {action && <div className="section-head__actions">{action}</div>}
    </header>
)

export default SectionHead
