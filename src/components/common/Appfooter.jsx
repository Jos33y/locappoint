import { Link } from 'react-router-dom'
import PinMark from './PinMark'
import '../../styles/app/footer.css'


// Dev preserves app mode through wordmark clicks. Prod relies on hostname.
const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'


const AppFooter = () => {
    const year = new Date().getFullYear()

    return (
        <footer className="loca-app-footer" role="contentinfo">
            <div className="container">

                <div className="loca-app-footer__grid">

                    <div className="loca-app-footer__brand-col">
                        <Link to={HOME_PATH} className="loca-app-footer__brand" aria-label="Locappoint home">
                            <PinMark className="loca-app-footer__mark" />
                            <span className="loca-app-footer__wm">
                                <span className="loca-app-footer__wm-loc">Loc</span>
                                <span className="loca-app-footer__wm-app">Appoint</span>
                            </span>
                        </Link>
                        <p className="loca-app-footer__desc">
                            The booking platform built for local businesses in Lisbon, Porto, and Lagos. Twelve months free, then nineteen euros a month flat.
                        </p>
                        <div className="loca-app-footer__cities">Lisbon · Porto · Lagos</div>
                    </div>

                    <div className="loca-app-footer__col">
                        <h3 className="loca-app-footer__col-title">Platform</h3>
                        <ul className="loca-app-footer__list">
                            <li><Link to="/businesses">Browse businesses</Link></li>
                            <li><Link to="/partnership">Become a partner</Link></li>
                            <li><Link to="/portal">Business dashboard</Link></li>
                            <li><Link to="/app">Get the app</Link></li>
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
                            <li><Link to="/legal/cookies">Cookies</Link></li>
                            <li><Link to="/legal/notice">Legal notice</Link></li>
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
