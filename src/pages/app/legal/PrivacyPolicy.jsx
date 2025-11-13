
import AppFooter from '../../../components/common/Appfooter'
import AppHeader from '../../../components/common/Appheader'
import '../../../styles/app/legal.css'

const PrivacyPolicy = () => {
    return (
        <div className="legal-page">
            <AppHeader />
            <main className="legal-content">
                <div className="container">
                    <div className="legal-header">
                        <h1>Privacy Policy</h1>
                        <p className="legal-date">Last Updated: November 13, 2025</p>
                    </div>

                    <div className="legal-body">
                        <section className="legal-section">
                            <h2>1. Introduction</h2>
                            <p>
                                Welcome to LocAppoint. We respect your privacy and are committed to protecting your
                                personal data. This Privacy Policy explains how we collect, use, disclose, and
                                safeguard your information when you use our appointment booking platform.
                            </p>
                            <p>
                                By using LocAppoint, you agree to the collection and use of information in accordance
                                with this policy.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>2. Information We Collect</h2>

                            <h3>2.1 Information You Provide</h3>
                            <p>We collect information that you voluntarily provide when you:</p>
                            <ul>
                                <li><strong>Create an Account:</strong> Name, email address, phone number, password</li>
                                <li><strong>Complete Your Profile:</strong> Business name, address, category, description, services, pricing, availability</li>
                                <li><strong>Book Appointments:</strong> Appointment details, special requests, notes</li>
                                <li><strong>Contact Us:</strong> Name, email, phone, message content</li>
                                <li><strong>Apply for Partnership:</strong> Personal and organization information</li>
                            </ul>

                            <h3>2.2 Information Automatically Collected</h3>
                            <p>When you use our Service, we automatically collect:</p>
                            <ul>
                                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, clicks</li>
                                <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
                                <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                                <li><strong>Cookies:</strong> Small data files stored on your device (see Cookie Policy below)</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>3. How We Use Your Information</h2>
                            <p>We use your information to:</p>
                            <ul>
                                <li><strong>Provide Services:</strong> Create and manage accounts, facilitate bookings, process appointments</li>
                                <li><strong>Communicate:</strong> Send appointment confirmations, reminders, updates, and notifications</li>
                                <li><strong>Improve Service:</strong> Analyze usage patterns, fix bugs, develop new features</li>
                                <li><strong>Customer Support:</strong> Respond to inquiries, resolve issues, provide assistance</li>
                                <li><strong>Marketing:</strong> Send promotional emails (with your consent, you can opt-out anytime)</li>
                                <li><strong>Security:</strong> Protect against fraud, unauthorized access, and security threats</li>
                                <li><strong>Legal Compliance:</strong> Meet regulatory requirements and legal obligations</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>4. Legal Basis for Processing (GDPR)</h2>
                            <p>If you are in the European Economic Area (EEA), we process your data based on:</p>
                            <ul>
                                <li><strong>Consent:</strong> You have given clear consent for specific purposes</li>
                                <li><strong>Contract:</strong> Processing is necessary to perform our agreement with you</li>
                                <li><strong>Legal Obligation:</strong> Processing is required by law</li>
                                <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate business interests</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>5. Information Sharing and Disclosure</h2>

                            <h3>5.1 With Other Users</h3>
                            <p>
                                <strong>Business Information:</strong> Business profiles, services, and availability are publicly visible.
                            </p>
                            <p>
                                <strong>Appointment Information:</strong> When you book an appointment, your contact information
                                is shared with the business to facilitate the appointment.
                            </p>

                            <h3>5.2 With Service Providers</h3>
                            <p>We may share information with third-party service providers who assist us with:</p>
                            <ul>
                                <li>Hosting and infrastructure (Supabase, Vercel)</li>
                                <li>Email services (SendGrid, Supabase Auth)</li>
                                <li>Analytics (Google Analytics)</li>
                                <li>Customer support tools</li>
                            </ul>

                            <h3>5.3 For Legal Reasons</h3>
                            <p>We may disclose information if required to:</p>
                            <ul>
                                <li>Comply with legal obligations or court orders</li>
                                <li>Protect our rights, property, or safety</li>
                                <li>Investigate fraud or security issues</li>
                                <li>Enforce our Terms of Service</li>
                            </ul>

                            <h3>5.4 Business Transfers</h3>
                            <p>
                                In the event of a merger, acquisition, or sale of assets, user information may be
                                transferred. We will notify you of any such change.
                            </p>

                            <h3>5.5 With Your Consent</h3>
                            <p>
                                We may share information for any other purpose with your explicit consent.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>6. Data Retention</h2>
                            <p>
                                We retain your personal information only for as long as necessary to fulfill the
                                purposes outlined in this Privacy Policy, unless a longer retention period is
                                required by law.
                            </p>
                            <ul>
                                <li><strong>Active Accounts:</strong> Data retained while account is active</li>
                                <li><strong>Closed Accounts:</strong> Data deleted within 90 days unless legally required</li>
                                <li><strong>Appointment Records:</strong> Retained for 2 years for business records</li>
                                <li><strong>Legal Requirements:</strong> Some data may be retained longer for legal compliance</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>7. Your Data Rights</h2>
                            <p>Depending on your location, you may have the following rights:</p>

                            <h3>7.1 Access and Portability</h3>
                            <p>
                                You have the right to access your personal data and request a copy in a
                                machine-readable format.
                            </p>

                            <h3>7.2 Correction</h3>
                            <p>
                                You can update or correct your information through your account settings or by
                                contacting us.
                            </p>

                            <h3>7.3 Deletion</h3>
                            <p>
                                You can request deletion of your account and personal data. Note that we may
                                retain certain information for legal or legitimate business purposes.
                            </p>

                            <h3>7.4 Objection and Restriction</h3>
                            <p>
                                You can object to processing of your data or request restriction of processing
                                in certain circumstances.
                            </p>

                            <h3>7.5 Withdraw Consent</h3>
                            <p>
                                Where processing is based on consent, you can withdraw consent at any time.
                            </p>

                            <h3>7.6 Complaint</h3>
                            <p>
                                You have the right to lodge a complaint with a data protection authority in
                                your jurisdiction.
                            </p>

                            <p>
                                <strong>To exercise these rights,</strong> contact us at privacy@locappoint.com
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>8. Data Security</h2>
                            <p>
                                We implement appropriate technical and organizational measures to protect your
                                personal data, including:
                            </p>
                            <ul>
                                <li>Encryption of data in transit and at rest</li>
                                <li>Secure authentication (password hashing, OAuth)</li>
                                <li>Regular security assessments</li>
                                <li>Access controls and authorization</li>
                                <li>Secure hosting infrastructure</li>
                                <li>Regular backups and disaster recovery</li>
                            </ul>
                            <p>
                                However, no method of transmission over the internet is 100% secure. While we
                                strive to protect your data, we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>9. Cookies and Tracking</h2>

                            <h3>9.1 What Are Cookies</h3>
                            <p>
                                Cookies are small text files stored on your device that help us improve your
                                experience and analyze usage.
                            </p>

                            <h3>9.2 Types of Cookies We Use</h3>
                            <ul>
                                <li><strong>Essential Cookies:</strong> Required for basic functionality (authentication, security)</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service</li>
                                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                            </ul>

                            <h3>9.3 Managing Cookies</h3>
                            <p>
                                You can control cookies through your browser settings. Note that disabling
                                cookies may affect functionality.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>10. Third-Party Links</h2>
                            <p>
                                Our Service may contain links to third-party websites. We are not responsible
                                for the privacy practices of these websites. We encourage you to read their
                                privacy policies.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>11. Children's Privacy</h2>
                            <p>
                                Our Service is not intended for children under 18. We do not knowingly collect
                                personal information from children. If you believe we have collected information
                                from a child, please contact us immediately.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>12. International Data Transfers</h2>
                            <p>
                                Your information may be transferred to and processed in countries other than your
                                country of residence. We ensure appropriate safeguards are in place to protect
                                your data in accordance with this Privacy Policy.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>13. California Privacy Rights (CCPA)</h2>
                            <p>
                                If you are a California resident, you have additional rights under the California
                                Consumer Privacy Act (CCPA):
                            </p>
                            <ul>
                                <li>Right to know what personal information is collected</li>
                                <li>Right to know if personal information is sold or disclosed</li>
                                <li>Right to opt-out of sale of personal information</li>
                                <li>Right to deletion of personal information</li>
                                <li>Right to non-discrimination for exercising CCPA rights</li>
                            </ul>
                            <p>
                                <strong>Note:</strong> LocAppoint does not sell personal information.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>14. Changes to Privacy Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time. We will notify you of
                                significant changes by:
                            </p>
                            <ul>
                                <li>Posting the new policy on this page</li>
                                <li>Updating the "Last Updated" date</li>
                                <li>Sending an email notification (for material changes)</li>
                            </ul>
                            <p>
                                Your continued use of the Service after changes constitutes acceptance of the
                                updated Privacy Policy.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>15. Contact Us</h2>
                            <p>
                                If you have questions about this Privacy Policy or our data practices, please
                                contact us:
                            </p>
                            <ul className="contact-list">
                                <li><strong>Email:</strong> <a href="mailto:privacy@locappoint.com">privacy@locappoint.com</a></li>
                                <li><strong>Data Protection Officer:</strong> <a href="mailto:dpo@locappoint.com">dpo@locappoint.com</a></li>
                                <li><strong>Address:</strong> Avenida da Liberdade, 1250-096 Lisbon, Portugal</li>
                                <li><strong>Phone:</strong> <a href="tel:+351912345678">+351 912 345 678</a></li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <p className="legal-note">
                                This Privacy Policy is designed to be compliant with GDPR, CCPA, and other
                                applicable data protection laws. If you have concerns about how your data is
                                handled, please contact us.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <AppFooter />
        </div>
    )
}

export default PrivacyPolicy