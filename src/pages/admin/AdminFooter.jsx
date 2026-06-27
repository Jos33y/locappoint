// AdminFooter - Initiative line + small links.

const AdminFooter = () => {
    const year = new Date().getFullYear()

    return (
        <footer className="admin-footer">
            <div className="admin-footer__container">
                <p className="admin-footer__text">
                    {`\u00A9 ${year} Locappoint \u00B7 A FlowleXx Group Initiative`}
                </p>
                <div className="admin-footer__links">
                    <a href="/" className="admin-footer__link">Back to Website</a>
                    <span className="admin-footer__divider" aria-hidden="true">{'\u00B7'}</span>
                    <a href="/terms" className="admin-footer__link">Terms</a>
                    <span className="admin-footer__divider" aria-hidden="true">{'\u00B7'}</span>
                    <a href="/privacy" className="admin-footer__link">Privacy</a>
                </div>
            </div>
        </footer>
    )
}

export default AdminFooter
