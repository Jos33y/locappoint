const Footer = () => {
    return (
        <footer className="footer" role="contentinfo">
            <div className="container">
                <div className="footer__content">
                    <div className="footer__main">
                        <p className="footer__text">
                            © 2025 LocAppoint • A FlowleXx Group initiative
                        </p>
                        <p className="footer__dev">
                            Crafted with ❤️ by <a href="#" className="footer__dev-link">The Brick Dev</a>
                        </p>
                    </div>
                    <nav className="footer__nav" aria-label="Footer navigation">
                        <a href="#" className="footer__link">Terms</a>
                        <a href="#" className="footer__link">Privacy</a>
                        <a href="#" className="footer__link">Contact</a>
                    </nav>
                </div>
            </div>
        </footer>
    )
}

export default Footer