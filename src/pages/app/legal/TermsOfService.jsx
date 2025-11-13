import AppFooter from '../../../components/common/Appfooter'
import AppHeader from '../../../components/common/AppHeader'
import '../../../styles/app/legal.css'

const TermsOfService = () => {
    return (
        <div className="legal-page">
            <AppHeader />

            <main className="legal-content">
                <div className="container">
                    <div className="legal-header">
                        <h1>Terms of Service</h1>
                        <p className="legal-date">Last Updated: November 13, 2025</p>
                    </div>

                    <div className="legal-body">
                        <section className="legal-section">
                            <h2>1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using LocAppoint ("Service", "Platform", "we", "us", or "our"),
                                you accept and agree to be bound by the terms and conditions of this agreement.
                                If you do not agree to these terms, please do not use our Service.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>2. Description of Service</h2>
                            <p>
                                LocAppoint provides an online appointment booking and management platform that connects
                                service providers ("Business Users") with clients ("Client Users"). Our Service allows:
                            </p>
                            <ul>
                                <li>Businesses to create profiles, list services, and manage appointments</li>
                                <li>Clients to discover businesses, view services, and book appointments</li>
                                <li>Communication between businesses and clients regarding appointments</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>3. User Accounts</h2>
                            <h3>3.1 Account Creation</h3>
                            <p>
                                To use certain features of our Service, you must create an account. You agree to:
                            </p>
                            <ul>
                                <li>Provide accurate, current, and complete information</li>
                                <li>Maintain and update your information to keep it accurate</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized access</li>
                            </ul>

                            <h3>3.2 Account Types</h3>
                            <p>
                                <strong>Business Accounts:</strong> Available to service providers who wish to offer
                                appointment booking services. Business users are responsible for the accuracy of their
                                business information, services, and availability.
                            </p>
                            <p>
                                <strong>Client Accounts:</strong> Available to individuals who wish to book appointments
                                with businesses. Client users are responsible for attending scheduled appointments or
                                providing timely cancellation notice.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>4. User Conduct</h2>
                            <p>You agree not to:</p>
                            <ul>
                                <li>Violate any applicable laws or regulations</li>
                                <li>Infringe upon the rights of others</li>
                                <li>Submit false, misleading, or fraudulent information</li>
                                <li>Impersonate any person or entity</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Interfere with or disrupt the Service</li>
                                <li>Attempt to gain unauthorized access to the Service</li>
                                <li>Use the Service for any commercial purpose without our consent</li>
                                <li>Collect or harvest information about other users</li>
                                <li>Upload viruses, malware, or malicious code</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>5. Appointments and Bookings</h2>
                            <h3>5.1 Booking Process</h3>
                            <p>
                                LocAppoint facilitates appointment bookings between businesses and clients. The actual
                                service agreement is between the business and the client. We are not a party to that
                                agreement.
                            </p>

                            <h3>5.2 Cancellations and No-Shows</h3>
                            <p>
                                Cancellation policies are set by individual businesses. Clients should review and
                                understand the cancellation policy before booking. Businesses may implement their
                                own policies regarding no-shows and late cancellations.
                            </p>

                            <h3>5.3 Payment</h3>
                            <p>
                                LocAppoint does not process payments. All payment arrangements are made directly
                                between businesses and clients. We are not responsible for any payment disputes.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>6. Business Responsibilities</h2>
                            <p>Business users agree to:</p>
                            <ul>
                                <li>Provide accurate business information and service descriptions</li>
                                <li>Maintain up-to-date availability schedules</li>
                                <li>Honor confirmed appointments or provide reasonable notice of changes</li>
                                <li>Comply with all applicable laws and regulations in their industry</li>
                                <li>Maintain appropriate licenses and insurance</li>
                                <li>Respond to client inquiries in a timely manner</li>
                                <li>Handle client data responsibly and in compliance with privacy laws</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>7. Intellectual Property</h2>
                            <p>
                                The Service and its original content, features, and functionality are owned by
                                LocAppoint and are protected by international copyright, trademark, and other
                                intellectual property laws.
                            </p>
                            <p>
                                Users retain ownership of content they submit but grant us a license to use,
                                display, and distribute that content as necessary to provide the Service.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>8. Privacy and Data Protection</h2>
                            <p>
                                Your use of the Service is also governed by our Privacy Policy. Please review
                                our Privacy Policy to understand our practices regarding your personal information.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>9. Disclaimers</h2>
                            <h3>9.1 Service "As Is"</h3>
                            <p>
                                The Service is provided "as is" and "as available" without warranties of any kind,
                                either express or implied, including but not limited to warranties of merchantability,
                                fitness for a particular purpose, or non-infringement.
                            </p>

                            <h3>9.2 No Guarantee</h3>
                            <p>
                                We do not guarantee that the Service will be uninterrupted, secure, or error-free.
                                We do not warrant the accuracy, completeness, or reliability of any content or
                                information provided through the Service.
                            </p>

                            <h3>9.3 Third-Party Services</h3>
                            <p>
                                We are not responsible for the quality, safety, or legality of services provided
                                by businesses listed on our platform. Users engage with businesses at their own risk.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>10. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, LocAppoint shall not be liable for any
                                indirect, incidental, special, consequential, or punitive damages, or any loss
                                of profits or revenues, whether incurred directly or indirectly, or any loss of
                                data, use, goodwill, or other intangible losses resulting from:
                            </p>
                            <ul>
                                <li>Your use or inability to use the Service</li>
                                <li>Any unauthorized access to or use of our servers and/or any personal information</li>
                                <li>Any interruption or cessation of transmission to or from the Service</li>
                                <li>Any bugs, viruses, or similar that may be transmitted through the Service</li>
                                <li>Any errors or omissions in any content or for any loss or damage incurred</li>
                                <li>The conduct or content of any third party on the Service</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>11. Indemnification</h2>
                            <p>
                                You agree to indemnify, defend, and hold harmless LocAppoint, its officers, directors,
                                employees, and agents from and against any claims, liabilities, damages, losses, and
                                expenses arising out of or in any way connected with:
                            </p>
                            <ul>
                                <li>Your access to or use of the Service</li>
                                <li>Your violation of these Terms</li>
                                <li>Your violation of any rights of another party</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>12. Termination</h2>
                            <p>
                                We may terminate or suspend your account and access to the Service immediately,
                                without prior notice or liability, for any reason, including but not limited to
                                breach of these Terms.
                            </p>
                            <p>
                                Upon termination, your right to use the Service will immediately cease. If you
                                wish to terminate your account, you may do so through your account settings or
                                by contacting us.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>13. Changes to Terms</h2>
                            <p>
                                We reserve the right to modify these Terms at any time. We will notify users of
                                any material changes by posting the new Terms on this page and updating the "Last
                                Updated" date.
                            </p>
                            <p>
                                Your continued use of the Service after changes become effective constitutes
                                acceptance of the revised Terms.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>14. Governing Law</h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of
                                Portugal, without regard to its conflict of law provisions.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>15. Dispute Resolution</h2>
                            <p>
                                Any disputes arising out of or relating to these Terms or the Service shall be
                                resolved through good faith negotiations. If negotiations fail, disputes shall
                                be submitted to the courts of Lisbon, Portugal.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h2>16. Contact Information</h2>
                            <p>
                                If you have any questions about these Terms, please contact us:
                            </p>
                            <ul className="contact-list">
                                <li><strong>Email: </strong> legal@locappoint.com</li>
                                <li><strong>Address:</strong> Avenida da Liberdade, 1250-096 Lisbon, Portugal</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    )
}

export default TermsOfService