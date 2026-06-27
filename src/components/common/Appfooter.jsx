// src/components/common/Appfooter.jsx
// Public footer for app.locappoint.com.
// Dropped placeholder social hrefs - if we add socials, they go in with real URLs.

import { Link } from 'react-router-dom'
import '../../styles/app/footer.css'


const AppFooter = () => {
    const year = new Date().getFullYear()

    return (
        <footer className="loca-app-footer" role="contentinfo">
            <div className="container">

                <div className="loca-app-footer__grid">

                    <div className="loca-app-footer__brand-col">
                        <Link to="/" className="loca-app-footer__brand" aria-label="Locappoint home">
                            <svg className="loca-app-footer__mark" viewBox="0 0 100 100" aria-hidden="true">
                                <path d="M 42 6 C 22 6, 6 22, 6 42 C 6 53, 10 62, 16 70 L 42 100 L 68 70 C 74 62, 78 53, 78 42 C 78 22, 62 6, 42 6 Z" fill="var(--azure)" transform="translate(14.3 4.9) scale(0.85)" />
                                <rect x="16" y="22" width="52" height="36" rx="4" fill="var(--ink)" transform="translate(14.3 4.9) scale(0.85)" />
                                <rect x="22" y="30" width="22" height="4" rx="1" fill="var(--azure-soft)" transform="translate(14.3 4.9) scale(0.85)" />
                                <rect x="22" y="40" width="32" height="4" rx="1" fill="var(--azure-soft)" opacity="0.32" transform="translate(14.3 4.9) scale(0.85)" />
                                <rect x="22" y="50" width="18" height="3" rx="1" fill="var(--azure-soft)" opacity="0.2" transform="translate(14.3 4.9) scale(0.85)" />
                                <circle cx="62" cy="29" r="3.5" fill="var(--signal)" transform="translate(14.3 4.9) scale(0.85)" />
                            </svg>
                            <span className="loca-app-footer__wm">
                                <span className="loca-app-footer__wm-loc">Loc</span>
                                <span className="loca-app-footer__wm-app">Appoint</span>
                            </span>
                        </Link>
                        <p className="loca-app-footer__desc">
                            The booking platform built for local businesses in Lisbon, Porto, and Lagos. Twelve months free, then nineteen euros a month flat.
                        </p>
                        <div className="loca-app-footer__cities">LISBON · PORTO · LAGOS</div>
                    </div>

                    <div className="loca-app-footer__col">
                        <h3 className="loca-app-footer__col-title">Platform</h3>
                        <ul className="loca-app-footer__list">
                            <li><Link to="/businesses">Browse businesses</Link></li>
                            <li><Link to="/about">About</Link></li>
                            <li><Link to="/partnership">Become a partner</Link></li>
                            <li><Link to="/portal">Business dashboard</Link></li>
                        </ul>
                    </div>

                    <div className="loca-app-footer__col">
                        <h3 className="loca-app-footer__col-title">Contact</h3>
                        <ul className="loca-app-footer__list">
                            <li><a href="mailto:hello@locappoint.com">hello@locappoint.com</a></li>
                            <li><a href="tel:+351912345678">+351 912 345 678</a></li>
                            <li><span>Lisbon, Portugal</span></li>
                        </ul>
                    </div>

                    <div className="loca-app-footer__col">
                        <h3 className="loca-app-footer__col-title">Legal</h3>
                        <ul className="loca-app-footer__list">
                            <li><Link to="/privacy">Privacy</Link></li>
                            <li><Link to="/terms">Terms</Link></li>
                        </ul>
                    </div>

                </div>

                <div className="loca-app-footer__bottom">
                    <span>© {year} Locappoint</span>
                    <span className="loca-app-footer__sep" aria-hidden="true">·</span>
                    <span>A FlowleXx Group initiative</span>
                    <span className="loca-app-footer__sep" aria-hidden="true">·</span>
                    <span>Built by The Brick Dev Studios</span>
                </div>

            </div>
        </footer>
    )
}

export default AppFooter
