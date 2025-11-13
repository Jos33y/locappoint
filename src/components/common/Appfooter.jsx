import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Instagram, Twitter, Linkedin } from 'lucide-react'
import '../../styles/app/footer.css'

const AppFooter = () => {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="app-footer">
            <div className="container">
                <div className="footer-content">
                    {/* Brand Section */}
                    <div className="footer-section footer-brand">
                        <Link to="/app" className="footer-logo">
                            LocAppoint
                        </Link>
                        <p className="footer-description">
                            Simple appointment booking for businesses and clients. 
                            No complicated setup, no payment processing. Just easy booking.
                        </p>
                        <div className="footer-social">
                            <a href="#" className="social-link" aria-label="Instagram">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="social-link" aria-label="Twitter">
                                <Twitter size={20} />
                            </a>
                            <a href="#" className="social-link" aria-label="LinkedIn">
                                <Linkedin size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h3 className="footer-title">Quick Links</h3>
                        <ul className="footer-links">
                            <li><Link to="/app">Home</Link></li>
                            <li><Link to="/app/businesses">Browse Businesses</Link></li>
                            <li><Link to="/app/about">About Us</Link></li>
                            <li><Link to="/app/contact">Contact</Link></li>
                        </ul>
                    </div>

                    {/* For Businesses */}
                    <div className="footer-section">
                        <h3 className="footer-title">For Businesses</h3>
                        <ul className="footer-links">
                            <li><Link to="/app/partnership">Become a Partner</Link></li>
                            <li><Link to="/portal">Business Dashboard</Link></li>
                            <li><Link to="/app/auth">Sign Up</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="footer-section">
                        <h3 className="footer-title">Contact</h3>
                        <ul className="footer-contact">
                            <li>
                                <Mail size={16} />
                                <a href="mailto:hello@locappoint.com">hello@locappoint.com</a>
                            </li>
                            <li>
                                <Phone size={16} />
                                <a href="tel:+351912345678">+351 912 345 678</a>
                            </li>
                            <li>
                                <MapPin size={16} />
                                <span>Lisbon, Portugal</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © {currentYear} LocAppoint. All rights reserved.
                    </p>
                    <div className="footer-legal">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default AppFooter