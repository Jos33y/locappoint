// src/pages/app/legal/PrivacyPolicy.jsx
// GDPR-aware Privacy Policy for Locappoint.
// BEFORE PRODUCTION: replace [Operator Entity, registered address] with the
// formal legal entity name + address. Review with counsel before launch.

import AppHeader from '../../../components/common/AppHeader'
import AppFooter from '../../../components/common/Appfooter'
import '../../../styles/app/home.css'
import '../../../styles/app/legal.css'


const sections = [
    { id: 'who-we-are', label: 'Who we are' },
    { id: 'what-we-collect', label: 'What we collect' },
    { id: 'how-we-use', label: 'How we use your data' },
    { id: 'legal-basis', label: 'Legal basis' },
    { id: 'sharing', label: 'Who we share data with' },
    { id: 'transfers', label: 'International transfers' },
    { id: 'retention', label: 'How long we keep data' },
    { id: 'rights', label: 'Your rights' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'children', label: 'Children' },
    { id: 'changes', label: 'Changes to this policy' },
    { id: 'contact', label: 'Contact us' },
    { id: 'complaints', label: 'Complaints' },
]


const PrivacyPolicy = () => {
    return (
        <div className="legal-page">
            <AppHeader />

            <main>

                <section className="loca-section loca-section--s0 legal__hero">
                    <div className="container container--legal">
                        <span className="loca-eyebrow">
                            <span className="loca-eyebrow__dot" aria-hidden="true"></span>
                            Legal
                        </span>
                        <h1 className="legal__title">Privacy Policy</h1>
                        <p className="legal__meta">Last updated: 28 June 2026</p>
                        <p className="legal__lede">
                            This Privacy Policy explains how Locappoint collects, uses, and protects information when you use our booking platform. We are committed to transparency about what we collect and why.
                        </p>
                    </div>
                </section>

                <section className="loca-section loca-section--s0 legal__body">
                    <div className="container container--legal">

                        <nav className="legal__toc" aria-label="Table of contents">
                            <p className="legal__toc-label">On this page</p>
                            <ol className="legal__toc-list">
                                {sections.map((s, i) => (
                                    <li key={s.id}>
                                        <a href={`#${s.id}`}>
                                            <span className="legal__toc-num">{String(i + 1).padStart(2, '0')}</span>
                                            <span>{s.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>

                        <article className="legal__article">

                            <section id="who-we-are" className="legal__section">
                                <h2 className="legal__h2">1. Who we are</h2>
                                <p>Locappoint is a booking platform for local service businesses, operated by [Operator Entity, registered address], based in Lisbon, Portugal. We are the data controller for personal information processed through the Service.</p>
                                <p>If you have questions about this policy or how we handle your data, write to hello@locappoint.com.</p>
                            </section>

                            <section id="what-we-collect" className="legal__section">
                                <h2 className="legal__h2">2. What we collect</h2>
                                <p>We collect only what we need to operate the booking platform. Specifically:</p>
                                <ul className="legal__list">
                                    <li><strong>Account information.</strong> Name, email address, phone number, password (stored hashed), account type (business or client), preferred language.</li>
                                    <li><strong>Business profile information</strong> (for businesses). Business name, category, location, description, services offered, working hours, banner and logo images you upload, contact details you choose to display.</li>
                                    <li><strong>Booking information.</strong> Appointments scheduled through the Service, including times, services booked, and any notes the parties exchange about a specific appointment.</li>
                                    <li><strong>Communications.</strong> Messages sent through email, WhatsApp templates, or our support channels.</li>
                                    <li><strong>Technical and usage data.</strong> IP address, device type, browser, pages visited, actions taken on the Service. Used to operate, secure, and improve the platform.</li>
                                </ul>
                            </section>

                            <section id="how-we-use" className="legal__section">
                                <h2 className="legal__h2">3. How we use your data</h2>
                                <p>We process personal data to:</p>
                                <ul className="legal__list">
                                    <li>Provide and operate the booking platform</li>
                                    <li>Create and manage your account</li>
                                    <li>Send confirmations, reminders, and service-related notifications via email and WhatsApp</li>
                                    <li>Improve the platform based on aggregated usage patterns</li>
                                    <li>Detect and prevent fraud, spam, and abuse</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                                <p>We do not sell your data. We do not show advertising on the platform.</p>
                            </section>

                            <section id="legal-basis" className="legal__section">
                                <h2 className="legal__h2">4. Legal basis for processing</h2>
                                <p>We rely on the following legal bases under GDPR Article 6:</p>
                                <ul className="legal__list">
                                    <li><strong>Contract.</strong> Most processing is necessary to provide the Service you signed up for.</li>
                                    <li><strong>Legitimate interests.</strong> Platform security, fraud prevention, basic analytics, and product improvement.</li>
                                    <li><strong>Consent.</strong> Where required (for example, marketing emails or non-essential cookies). You can withdraw consent at any time.</li>
                                    <li><strong>Legal obligation.</strong> Where we must process data to comply with law, for example responding to lawful requests from authorities.</li>
                                </ul>
                            </section>

                            <section id="sharing" className="legal__section">
                                <h2 className="legal__h2">5. Who we share data with</h2>
                                <p>We share personal data only with service providers who help us run the platform:</p>
                                <ul className="legal__list">
                                    <li><strong>Supabase</strong> for database and authentication hosting</li>
                                    <li><strong>Email delivery providers</strong> to send transactional and account emails</li>
                                    <li><strong>WhatsApp Business API</strong> to send booking confirmations and reminders via WhatsApp, subject to Meta&apos;s privacy practices for that channel</li>
                                    <li><strong>Payment processors</strong> when paid billing starts. Cohort 1 is currently free.</li>
                                    <li><strong>Analytics</strong> using anonymous or pseudonymous usage data only</li>
                                </ul>
                                <p>We never sell personal data to third parties. We do not share data with advertisers.</p>
                            </section>

                            <section id="transfers" className="legal__section">
                                <h2 className="legal__h2">6. International transfers</h2>
                                <p>Most of our processing happens within the EU. Where data is transferred outside the EU (for example, some service providers may process data in the United States), we rely on Standard Contractual Clauses approved by the European Commission and additional safeguards as required by GDPR.</p>
                            </section>

                            <section id="retention" className="legal__section">
                                <h2 className="legal__h2">7. How long we keep data</h2>
                                <ul className="legal__list">
                                    <li><strong>Active accounts.</strong> As long as your account is active.</li>
                                    <li><strong>Closed accounts.</strong> 90 days after deletion, then permanently removed except where law requires longer retention (for example, billing records: 10 years under Portuguese tax law).</li>
                                    <li><strong>Booking history.</strong> Kept while your account is active. You can request earlier deletion of specific bookings.</li>
                                    <li><strong>Waitlist signups.</strong> 24 months from signup, after which we delete if you haven&apos;t created an account.</li>
                                    <li><strong>Technical logs.</strong> 90 days.</li>
                                </ul>
                            </section>

                            <section id="rights" className="legal__section">
                                <h2 className="legal__h2">8. Your rights</h2>
                                <p>Under GDPR, you have the right to:</p>
                                <ul className="legal__list">
                                    <li><strong>Access</strong> the personal data we hold about you</li>
                                    <li><strong>Correct</strong> inaccurate data</li>
                                    <li><strong>Delete</strong> your data, subject to legal retention requirements</li>
                                    <li><strong>Restrict</strong> processing in certain circumstances</li>
                                    <li><strong>Port</strong> your data to another service in a structured, machine-readable format</li>
                                    <li><strong>Object</strong> to processing based on legitimate interests</li>
                                    <li><strong>Withdraw consent</strong> for processing based on consent</li>
                                </ul>
                                <p>To exercise any of these rights, write to hello@locappoint.com. We respond within 30 days.</p>
                            </section>

                            <section id="cookies" className="legal__section">
                                <h2 className="legal__h2">9. Cookies</h2>
                                <p>We use cookies and similar technologies to:</p>
                                <ul className="legal__list">
                                    <li>Keep you signed in (essential)</li>
                                    <li>Remember your language preference (essential)</li>
                                    <li>Understand how the platform is used (analytics, only with your consent)</li>
                                </ul>
                                <p>Essential cookies do not require consent. For non-essential cookies, we ask before setting them. You can change your preferences at any time in your browser settings.</p>
                                <p>We currently use these specific cookies:</p>
                                <ul className="legal__list">
                                    <li><code>sb-*</code> for Supabase session (essential)</li>
                                    <li><code>locappoint-locale</code> for your language preference (essential)</li>
                                    <li><code>_locappoint_analytics</code> for anonymous usage analytics (consent-based)</li>
                                </ul>
                            </section>

                            <section id="children" className="legal__section">
                                <h2 className="legal__h2">10. Children</h2>
                                <p>The Service is not directed to children under 16. We do not knowingly collect data from anyone under 16. If you believe a child has provided us with personal data, contact us and we will delete it.</p>
                            </section>

                            <section id="changes" className="legal__section">
                                <h2 className="legal__h2">11. Changes to this policy</h2>
                                <p>We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top reflects the most recent version. For significant changes, we will notify users via email or through the platform at least 30 days before the changes take effect.</p>
                            </section>

                            <section id="contact" className="legal__section">
                                <h2 className="legal__h2">12. Contact us</h2>
                                <p>For privacy questions, requests, or concerns:</p>
                                <ul className="legal__list">
                                    <li>Email: hello@locappoint.com</li>
                                    <li>Postal: [Operator Entity, registered address, Lisbon, Portugal]</li>
                                </ul>
                            </section>

                            <section id="complaints" className="legal__section">
                                <h2 className="legal__h2">13. Complaints</h2>
                                <p>If you believe we have not handled your data correctly, you can lodge a complaint with the Portuguese data protection authority:</p>
                                <p className="legal__address">
                                    <strong>CNPD</strong> (Comissão Nacional de Proteção de Dados)<br />
                                    Av. D. Carlos I, nº 134, 1º<br />
                                    1200-651 Lisboa, Portugal<br />
                                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">cnpd.pt</a>
                                </p>
                            </section>

                        </article>

                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default PrivacyPolicy
