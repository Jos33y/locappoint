import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY, orPending } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'who-we-are',
        label: 'Who we are',
        body: (
            <>
                <p>Locappoint is a booking platform for local service businesses, based in {LEGAL_ENTITY.city}. The operating company is <strong>{orPending(LEGAL_ENTITY.legalName)}</strong>. Full company details are on the <Link to="/legal/notice">Legal Notice</Link>.</p>
                <p>We have two roles, depending on the data:</p>
                <ul className="legal__list">
                    <li><strong>Controller</strong> for your account, your business profile, anything you send us through the waitlist, partnership or contact forms, and analytics on our waitlist site.</li>
                    <li><strong>Processor</strong> for the booking records a business keeps about its own clients. The business decides why that data is used; we handle it on its behalf under our <Link to="/legal/dpa">Data Processing Agreement</Link>.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'what-we-collect',
        label: 'What we collect',
        body: (
            <>
                <ul className="legal__list">
                    <li><strong>Account.</strong> Name, email address, phone number, password (stored hashed by our authentication provider), account type (business or client) and preferred language. If you sign in with Google or Apple, we receive your name, email address and an account identifier from that provider.</li>
                    <li><strong>Business profile.</strong> Business name, public web address, category, city, address, description, services, prices, working hours, contact details you choose to show, and images you upload. This information is public on your business page.</li>
                    <li><strong>Bookings.</strong> The business, service, date and time, the client&apos;s name and contact details, and any notes added to the booking.</li>
                    <li><strong>Forms.</strong> Waitlist: email address, whether you are a business or a client, business type, city and name if you give them. Partnership application: name, email, phone, category, business name, city, country and your message. Contact form: name, email, phone if given, subject and message.</li>
                    <li><strong>Waitlist site analytics, only with your consent.</strong> A random session identifier, pages and sections viewed, clicks, scroll depth, time on page, device type, browser, operating system, screen size, referring site, campaign tags and browser language. Approximate location (country, region, city and time zone) is looked up from your IP address. We store the location result, not the IP address.</li>
                    <li><strong>Server logs.</strong> Our hosting server records IP addresses and requests to keep the service secure and working.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'how-we-use',
        label: 'How we use it, and why we are allowed to',
        body: (
            <>
                <p>Each use has a legal basis under Article 6 of the GDPR:</p>
                <ul className="legal__list">
                    <li><strong>Running your account and bookings</strong>, including confirmations and reminders by email, and by WhatsApp once that channel is live. Basis: performing our contract with you.</li>
                    <li><strong>Publishing business pages.</strong> Basis: our contract with the business.</li>
                    <li><strong>Following up on waitlist and partnership applications.</strong> Basis: steps you asked us to take before a contract.</li>
                    <li><strong>Replying to contact messages.</strong> Basis: our legitimate interest in answering people who write to us.</li>
                    <li><strong>Waitlist site analytics.</strong> Basis: your consent, which you can withdraw at any time.</li>
                    <li><strong>Security, fraud and abuse prevention</strong>, including server logs. Basis: our legitimate interest in keeping the platform safe.</li>
                    <li><strong>Meeting legal duties</strong>, such as tax records once billing starts or lawful requests from authorities. Basis: legal obligation.</li>
                </ul>
                <p>We do not sell personal data, we do not show advertising, and we do not make decisions about you by automated means that have legal or similarly significant effects.</p>
            </>
        ),
    },
    {
        id: 'bookings',
        label: 'When you book a business',
        body: (
            <>
                <p>When you book an appointment, the business you book with receives your name, contact details and booking details so it can provide the service. That business is responsible for how it uses them. We keep and process the booking on its behalf.</p>
                <p>For questions about a specific booking, contact the business first. You can also write to us and we will pass your request on.</p>
            </>
        ),
    },
    {
        id: 'sharing',
        label: 'Who we share data with',
        body: (
            <>
                <ul className="legal__list">
                    <li><strong>Service providers</strong> who host and run the platform for us. Each one is listed, with its purpose and location, on the <Link to="/legal/subprocessors">Sub-processors</Link> page.</li>
                    <li><strong>The businesses you book with</strong>, as described above.</li>
                    <li><strong>Sign-in providers</strong> (Google, Apple) when you choose to sign in with them.</li>
                    <li><strong>Authorities</strong> when the law requires it.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'transfers',
        label: 'International transfers',
        body: (
            <p>Some providers process data outside the European Economic Area, for example in the United States. Where that happens we rely on an adequacy decision from the European Commission, such as the EU-US Data Privacy Framework where the provider is certified, or on the Commission&apos;s Standard Contractual Clauses. The location of each provider is on the <Link to="/legal/subprocessors">Sub-processors</Link> page.</p>
        ),
    },
    {
        id: 'retention',
        label: 'How long we keep data',
        body: (
            <ul className="legal__list">
                <li><strong>Accounts.</strong> While the account is open. After you close it, we delete it within 90 days, except records the law requires us to keep longer, such as billing records (10 years under Portuguese tax law).</li>
                <li><strong>Bookings.</strong> While the business account is open, or until the business deletes them.</li>
                <li><strong>Waitlist signups.</strong> 24 months from signup, unless you create an account.</li>
                <li><strong>Partnership and contact messages.</strong> 24 months from your last message.</li>
                <li><strong>Waitlist analytics.</strong> 13 months.</li>
                <li><strong>Server logs.</strong> 90 days.</li>
            </ul>
        ),
    },
    {
        id: 'rights',
        label: 'Your rights',
        body: (
            <>
                <p>You can ask us to give you a copy of your data, correct it, delete it, restrict or object to how we use it, or send it to another service in a machine-readable format. Where we rely on consent, you can withdraw it at any time without affecting what happened before.</p>
                <p>Write to <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. We reply within one month. We may ask you to confirm your identity first.</p>
            </>
        ),
    },
    {
        id: 'cookies',
        label: 'Cookies and device storage',
        body: (
            <p>The main site uses essential storage only, for example to keep you signed in. The waitlist site also uses analytics storage, but only if you allow it. The full list is in our <Link to="/legal/cookies">Cookie Policy</Link>.</p>
        ),
    },
    {
        id: 'security',
        label: 'Security',
        body: (
            <p>Data travels over encrypted connections. Access to the database is restricted by row-level security rules, so each account can reach only its own data, and staff access is limited to what the work needs. No system is perfectly secure; if a breach affects you, we will tell you as the law requires.</p>
        ),
    },
    {
        id: 'children',
        label: 'Children',
        body: (
            <p>Locappoint is not directed at children under 16, and we do not knowingly collect their data. If you believe a child has given us personal data, contact us and we will delete it.</p>
        ),
    },
    {
        id: 'changes',
        label: 'Changes to this policy',
        body: (
            <p>The date at the top shows the latest version. For significant changes, we tell account holders by email or in the platform before the change takes effect.</p>
        ),
    },
    {
        id: 'complaints',
        label: 'Complaints',
        body: (
            <>
                <p>If you think we have handled your data wrongly, please tell us first so we can fix it. You also have the right to complain to the Portuguese data protection authority:</p>
                <p className="legal__address">
                    <strong>CNPD</strong> (Comissão Nacional de Proteção de Dados)<br />
                    Av. D. Carlos I, nº 134, 1º<br />
                    1200-651 Lisboa, Portugal<br />
                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">cnpd.pt</a>
                </p>
            </>
        ),
    },
]

const Privacy = () => (
    <LegalLayout
        title="Privacy Policy"
        lede="What we collect, why, who sees it, and how to control it. Written to be read, not skimmed past."
        sections={sections}
    />
)

export default Privacy
