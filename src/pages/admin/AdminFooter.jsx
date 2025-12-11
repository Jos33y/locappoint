// AdminFooter.jsx - Simple admin footer
// Location: src/pages/admin/AdminFooter.jsx

const AdminFooter = () => {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="admin-footer">
            <div className="admin-footer__container">
                <p className="admin-footer__text">
                    © {currentYear} LocAppoint. A FlowleXx Group Initiative.
                </p>
                <div className="admin-footer__links">
                    <a href="/" className="admin-footer__link">Back to Website</a>
                    <span className="admin-footer__divider">•</span>
                    <a href="/terms" className="admin-footer__link">Terms</a>
                    <span className="admin-footer__divider">•</span>
                    <a href="/privacy" className="admin-footer__link">Privacy</a>
                </div>
            </div>
        </footer>
    )
}

export default AdminFooter