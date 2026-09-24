import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY, orPending } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'about',
        label: 'About these terms',
        body: (
            <>
                <p>These terms are an agreement between you and <strong>{orPending(LEGAL_ENTITY.legalName)}</strong>, which operates Locappoint (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Company details are on the <Link to="/legal/notice">Legal Notice</Link>.</p>
                <p>Sections 1 to 11 apply to everyone. Sections 12 to 17 apply only to businesses. Sections 18 to 20 apply only to clients who book appointments. By creating an account or using Locappoint you accept the parts that apply to you. If you act for a business, you confirm you have authority to accept them on its behalf.</p>
                <p>Locappoint is currently in a closed beta. Features may change, and we may pause parts of the service while we improve them.</p>
            </>
        ),
    },
    {
        id: 'service',
        label: 'What Locappoint does',
        body: (
            <>
                <p>Locappoint gives businesses tools to publish their services, prices and opening hours on a public page at locappoint.com/their-name, and to take bookings. It lets clients find those businesses and book with them, and it sends confirmations and reminders.</p>
                <p>We provide the platform. We are not a party to the appointment itself. The service is provided by the business, under an agreement between the business and the client.</p>
            </>
        ),
    },
    {
        id: 'accounts',
        label: 'Accounts',
        body: (
            <ul className="legal__list">
                <li>Give accurate information and keep it up to date.</li>
                <li>Keep your password private. You are responsible for activity on your account.</li>
                <li>You must be at least 16 to create a client account and at least 18 to create a business account.</li>
                <li>Tell us straight away if you think someone else has accessed your account.</li>
            </ul>
        ),
    },
    {
        id: 'acceptable-use',
        label: 'Acceptable use',
        body: (
            <>
                <p>You must not:</p>
                <ul className="legal__list">
                    <li>use Locappoint for anything illegal, or to offer illegal services</li>
                    <li>impersonate another person or business, or publish false or misleading information</li>
                    <li>enter health information or other special categories of personal data in booking notes or messages</li>
                    <li>send spam, malware or harmful content</li>
                    <li>scrape, copy or mirror the platform, or try to access other accounts or systems without permission</li>
                    <li>interfere with how the platform runs</li>
                </ul>
            </>
        ),
    },
    {
        id: 'reporting',
        label: 'Reporting illegal content',
        body: (
            <>
                <p>If you see content on Locappoint that you believe is illegal, such as a business page, image or review, email <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> with the page address, what the problem is, and why you believe it is illegal. Include your name and email unless the report concerns child sexual abuse material.</p>
                <p>We confirm receipt, review the report carefully and without undue delay, and tell you what we decided. If we remove or restrict content, we tell the person who posted it why and how to challenge the decision.</p>
            </>
        ),
    },
    {
        id: 'availability',
        label: 'Availability',
        body: (
            <p>We work to keep Locappoint available and accurate, but we cannot promise it will always be uninterrupted or error-free. We may carry out maintenance, and we may change or remove features. If a change significantly affects paying businesses, we give notice as described in section 9.</p>
        ),
    },
    {
        id: 'ip',
        label: 'Intellectual property',
        body: (
            <>
                <p><strong>Your content.</strong> You keep all rights to the content you upload, such as your business name, descriptions, logo and photos. You give us a non-exclusive licence to host and display it through Locappoint, for as long as it is on the platform, so we can run your page.</p>
                <p><strong>Our platform.</strong> The Locappoint software, brand and design belong to us. Using Locappoint does not give you rights in them beyond using the service.</p>
            </>
        ),
    },
    {
        id: 'liability',
        label: 'Liability',
        body: (
            <>
                <p>Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, for gross negligence or wilful misconduct, or for anything else that cannot be limited by law.</p>
                <p><strong>If you are a client (consumer)</strong>, your statutory rights are not affected by these terms.</p>
                <p><strong>If you are a business</strong>, our total liability for any claim related to Locappoint is limited to the fees you paid us in the twelve months before the claim. We are not liable to businesses for indirect or consequential loss, such as lost profits or lost bookings.</p>
            </>
        ),
    },
    {
        id: 'changes',
        label: 'Changes to these terms',
        body: (
            <p>We may update these terms. For material changes, we tell account holders by email or in the platform at least 30 days before they take effect, unless a change is needed sooner to comply with the law or to address an unforeseen danger. Businesses may end their account before the change takes effect. If you keep using Locappoint after that date, the new terms apply.</p>
        ),
    },
    {
        id: 'law',
        label: 'Law and disputes',
        body: (
            <>
                <p>These terms are governed by Portuguese law. Courts in Lisbon, Portugal, have jurisdiction, except that as a consumer you can also bring proceedings in the country where you live, and you keep the protection of that country&apos;s mandatory consumer law.</p>
                <p>If you have a complaint, please contact us first. Most problems can be fixed quickly.</p>
            </>
        ),
    },
    {
        id: 'contact',
        label: 'Contact',
        body: (
            <p>Email <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Postal address: {orPending(LEGAL_ENTITY.registeredAddress)}.</p>
        ),
    },
    {
        id: 'pricing',
        label: 'Businesses: pricing and payment',
        body: (
            <>
                <p><strong>Cohort 1 (current).</strong> Free for the first twelve (12) months from account creation, for the first 100 businesses in our launch cities (Lisbon, Porto, Lagos).</p>
                <p><strong>After the free period.</strong> Nineteen euros (€19) per month per business, flat. We do not charge commission on bookings. Payment is processed monthly in advance. We will tell you before billing starts and confirm whether VAT applies.</p>
                <p><strong>Cancellation.</strong> You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds for partial months unless required by law.</p>
                <p><strong>Price changes.</strong> We will notify you at least 30 days before any price changes take effect. You can cancel before the new price applies.</p>
            </>
        ),
    },
    {
        id: 'business-page',
        label: 'Businesses: your page and listing',
        body: (
            <>
                <p>You are responsible for everything on your business page: that your services, prices, opening hours and photos are accurate and lawful, that you hold any licences your services need, and that you meet your own obligations to your clients, including consumer law and price display rules.</p>
                <p>How businesses are ordered on Browse is explained on <Link to="/legal/ranking">How Browse ranks businesses</Link>. Nobody can pay for a higher position.</p>
            </>
        ),
    },
    {
        id: 'client-data',
        label: 'Businesses: client data',
        body: (
            <p>For the personal data of your clients, you are the controller and we are your processor. Our <Link to="/legal/dpa">Data Processing Agreement</Link> forms part of these terms and applies automatically when you create a business account. You are responsible for having a lawful basis to use your clients&apos; data and for answering their requests, with our help where the agreement says so.</p>
        ),
    },
    {
        id: 'suspension',
        label: 'Businesses: suspension and closing an account',
        body: (
            <>
                <p>You can close your business account at any time. Your page is removed from public view within 24 hours. You can ask us for an export of your bookings before you close.</p>
                <p>We may restrict or suspend a business account if it breaks these terms or the law, or puts clients or the platform at risk. We tell you the reasons when we do, unless the law prevents it. We give at least 30 days&apos; notice before ending a business account for good, except where we must act sooner because of a legal obligation or repeated serious breaches. You can ask us to reconsider any decision by replying to our notice.</p>
            </>
        ),
    },
    {
        id: 'business-complaints',
        label: 'Businesses: complaints',
        body: (
            <p>Send complaints about how we run the platform, including suspensions and ranking, to <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> with &ldquo;Business complaint&rdquo; in the subject line. We acknowledge it, look into it, and reply with our decision and reasons.</p>
        ),
    },
    {
        id: 'indemnity',
        label: 'Businesses: responsibility for claims',
        body: (
            <p>If a client or anyone else brings a claim against us because of the services you provided, the content of your page, or your breach of these terms or the law, you will cover the reasonable costs and losses that result, including legal fees.</p>
        ),
    },
    {
        id: 'booking',
        label: 'Clients: booking an appointment',
        body: (
            <>
                <p>When you book, you make an agreement with the business, not with us. The business sets its services, prices and cancellation rules, and shows them on its page before you confirm. Locappoint does not currently take payments: you pay the business directly, as it tells you.</p>
                <p>After booking you receive a confirmation. Check the details and contact the business if anything is wrong.</p>
            </>
        ),
    },
    {
        id: 'cancelling',
        label: 'Clients: cancelling or changing',
        body: (
            <p>You can cancel or change a booking from your account or from the link in your confirmation, within the rules the business has set. If you cannot attend, please cancel as early as you can so someone else can take the slot.</p>
        ),
    },
    {
        id: 'consumer-rights',
        label: 'Clients: your rights and complaints',
        body: (
            <p>Nothing in these terms affects your rights as a consumer. Complaints about an appointment or service go to the business that provided it. If something went wrong with Locappoint itself, such as a booking that did not reach the business, write to us and we will help.</p>
        ),
    },
]

const Terms = () => (
    <LegalLayout
        title="Terms of Service"
        lede="The agreement between Locappoint and the people who use it. Part of it covers everyone, part only businesses, part only clients."
        sections={sections}
    />
)

export default Terms
