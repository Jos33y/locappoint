// src/pages/app/legal/TermsOfService.jsx
// Terms of Service for Locappoint. Portuguese governing law.
// BEFORE PRODUCTION: replace [Operator Entity, registered address] with the
// formal legal entity name + address. Review with counsel before launch.

import AppHeader from '../../../components/common/AppHeader'
import AppFooter from '../../../components/common/Appfooter'
import '../../../styles/app/home.css'
import '../../../styles/app/legal.css'


const sections = [
    { id: 'acceptance', label: 'Acceptance' },
    { id: 'service', label: 'The service' },
    { id: 'account', label: 'Your account' },
    { id: 'use', label: 'Acceptable use' },
    { id: 'bookings', label: 'Bookings between parties' },
    { id: 'pricing', label: 'Pricing and payment' },
    { id: 'termination', label: 'Termination' },
    { id: 'ip', label: 'Intellectual property' },
    { id: 'disclaimer', label: 'Disclaimer' },
    { id: 'liability', label: 'Limitation of liability' },
    { id: 'indemnification', label: 'Indemnification' },
    { id: 'changes', label: 'Changes to these terms' },
    { id: 'law', label: 'Governing law' },
    { id: 'contact', label: 'Contact' },
]


const TermsOfService = () => {
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
                        <h1 className="legal__title">Terms of Service</h1>
                        <p className="legal__meta">Last updated: 28 June 2026</p>
                        <p className="legal__lede">
                            These terms govern your use of Locappoint. By using our booking platform, you agree to them. We have written them in plain language where we can.
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

                            <section id="acceptance" className="legal__section">
                                <h2 className="legal__h2">1. Acceptance</h2>
                                <p>By using Locappoint, you agree to these Terms of Service. If you do not agree, do not use the Service. If you are using Locappoint on behalf of a business, you confirm you have the authority to bind that business to these Terms.</p>
                            </section>

                            <section id="service" className="legal__section">
                                <h2 className="legal__h2">2. The service</h2>
                                <p>Locappoint is a booking platform for local service businesses. We provide:</p>
                                <ul className="legal__list">
                                    <li>Tools for businesses to set their services, working hours, and booking pages</li>
                                    <li>A search-and-book experience for clients</li>
                                    <li>Automated email and WhatsApp confirmations and reminders</li>
                                    <li>A public business page at locappoint.com/[your-slug]</li>
                                </ul>
                                <p>We are a facilitator. We are not a party to the booking transactions between businesses and their clients.</p>
                            </section>

                            <section id="account" className="legal__section">
                                <h2 className="legal__h2">3. Your account</h2>
                                <p>You must:</p>
                                <ul className="legal__list">
                                    <li>Provide accurate, current information when you create an account</li>
                                    <li>Keep your password confidential</li>
                                    <li>Be at least 18 years old to create a business account</li>
                                    <li>Use the Service for lawful purposes only</li>
                                </ul>
                                <p>You are responsible for everything that happens under your account.</p>
                            </section>

                            <section id="use" className="legal__section">
                                <h2 className="legal__h2">4. Acceptable use</h2>
                                <p>You agree not to:</p>
                                <ul className="legal__list">
                                    <li>Use the Service for any illegal activity</li>
                                    <li>Impersonate another person or business</li>
                                    <li>Submit false or misleading information</li>
                                    <li>Scrape, mirror, or copy the Service or its content without permission</li>
                                    <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
                                    <li>Send spam, malware, or harmful content through the Service</li>
                                    <li>Interfere with the Service&apos;s operation</li>
                                </ul>
                                <p>We reserve the right to suspend or terminate accounts that violate these rules.</p>
                            </section>

                            <section id="bookings" className="legal__section">
                                <h2 className="legal__h2">5. Bookings between businesses and clients</h2>
                                <p>When a client books an appointment through Locappoint:</p>
                                <ul className="legal__list">
                                    <li>Locappoint records the booking and sends confirmations</li>
                                    <li>The business and client agree directly on the terms of the appointment</li>
                                    <li>We are not responsible for the quality, safety, legality, or outcome of services delivered</li>
                                </ul>
                                <p>Disputes about a specific appointment are between the business and the client. We may help by providing booking records on request, but we do not arbitrate.</p>
                            </section>

                            <section id="pricing" className="legal__section">
                                <h2 className="legal__h2">6. Pricing and payment</h2>
                                <p><strong>Cohort 1 (current).</strong> Free for the first twelve (12) months from account creation, for the first 100 businesses in our launch cities (Lisbon, Porto, Lagos).</p>
                                <p><strong>After the free period.</strong> Nineteen euros (€19) per month per business, flat. We do not charge commission on bookings. Payment is processed monthly in advance.</p>
                                <p><strong>Cancellation.</strong> You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds for partial months unless required by law.</p>
                                <p><strong>Price changes.</strong> We will notify you at least 30 days before any price changes take effect. Continuing to use the Service after the change takes effect means you accept the new pricing.</p>
                            </section>

                            <section id="termination" className="legal__section">
                                <h2 className="legal__h2">7. Termination</h2>
                                <p>You may close your account at any time from Settings.</p>
                                <p>We may suspend or terminate your account if you violate these Terms, fail to pay after notice, or use the Service in a way that creates risk for us or other users.</p>
                                <p>On termination, your business profile is removed from public listings within 24 hours. Your data is retained per our Privacy Policy.</p>
                            </section>

                            <section id="ip" className="legal__section">
                                <h2 className="legal__h2">8. Intellectual property</h2>
                                <p><strong>Yours.</strong> You keep all rights to the content you upload (business name, descriptions, logo, banner, photos). By uploading content, you grant us a non-exclusive license to display it through the Service for the purpose of operating your booking page.</p>
                                <p><strong>Ours.</strong> Locappoint owns the Service itself (the platform, code, brand, design). You do not get any rights to these beyond using the Service.</p>
                            </section>

                            <section id="disclaimer" className="legal__section">
                                <h2 className="legal__h2">9. Disclaimer</h2>
                                <p>The Service is provided &ldquo;as is&rdquo;. We do not guarantee:</p>
                                <ul className="legal__list">
                                    <li>Uninterrupted or error-free operation</li>
                                    <li>That every feature will work as expected at all times</li>
                                    <li>That bookings will result in successful appointments</li>
                                </ul>
                                <p>We work hard to keep the Service running well, but we cannot promise perfection.</p>
                            </section>

                            <section id="liability" className="legal__section">
                                <h2 className="legal__h2">10. Limitation of liability</h2>
                                <p>To the maximum extent allowed by law, our liability for any claim related to the Service is limited to the fees you paid us in the twelve months before the claim. We are not liable for indirect, consequential, or incidental damages (for example, lost profits or lost bookings) except where required by law.</p>
                                <p>This does not limit liability for things that cannot legally be excluded, such as gross negligence or fraud.</p>
                            </section>

                            <section id="indemnification" className="legal__section">
                                <h2 className="legal__h2">11. Indemnification</h2>
                                <p>You agree to defend and hold us harmless from claims arising out of:</p>
                                <ul className="legal__list">
                                    <li>Your use of the Service</li>
                                    <li>Your violation of these Terms</li>
                                    <li>Your violation of any law or third-party right</li>
                                </ul>
                            </section>

                            <section id="changes" className="legal__section">
                                <h2 className="legal__h2">12. Changes to these terms</h2>
                                <p>We may update these Terms from time to time. For material changes, we will notify you at least 30 days in advance via email or through the platform. Continuing to use the Service after the change takes effect means you accept the new Terms.</p>
                            </section>

                            <section id="law" className="legal__section">
                                <h2 className="legal__h2">13. Governing law</h2>
                                <p>These Terms are governed by Portuguese law. Disputes will be heard in the courts of Lisbon, Portugal, unless EU consumer law gives you the right to bring proceedings in your country of residence.</p>
                            </section>

                            <section id="contact" className="legal__section">
                                <h2 className="legal__h2">14. Contact</h2>
                                <p>For questions about these Terms:</p>
                                <ul className="legal__list">
                                    <li>Email: hello@locappoint.com</li>
                                    <li>Postal: [Operator Entity, registered address, Lisbon, Portugal]</li>
                                </ul>
                            </section>

                        </article>

                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default TermsOfService
