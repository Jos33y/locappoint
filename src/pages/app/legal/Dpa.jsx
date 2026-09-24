import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY, orPending } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'parties',
        label: 'Parties and scope',
        body: (
            <>
                <p>This agreement is between the business that holds a Locappoint business account (the <strong>controller</strong>) and {orPending(LEGAL_ENTITY.legalName)}, operator of Locappoint (the <strong>processor</strong>). It meets the requirements of Article 28 of the GDPR and forms part of our <Link to="/terms">Terms of Service</Link>.</p>
                <p>It covers personal data about the controller&apos;s clients and staff that we process to provide Locappoint. It does not cover data we control ourselves, such as the business owner&apos;s own account, which our <Link to="/privacy">Privacy Policy</Link> covers.</p>
            </>
        ),
    },
    {
        id: 'details',
        label: 'Details of the processing',
        body: (
            <ul className="legal__list">
                <li><strong>Subject and purpose.</strong> Taking, storing, displaying and managing appointments, and sending booking confirmations, reminders and related messages.</li>
                <li><strong>Duration.</strong> While the business account is open, then until deletion under the section on ending the agreement.</li>
                <li><strong>Data subjects.</strong> The controller&apos;s clients and, where added, its staff.</li>
                <li><strong>Types of data.</strong> Name, email address, phone number, booking details (service, date, time, status) and notes attached to a booking.</li>
                <li><strong>Special categories.</strong> None. The controller must not enter health data or other special categories of data in Locappoint.</li>
            </ul>
        ),
    },
    {
        id: 'instructions',
        label: 'Instructions',
        body: (
            <p>We process the data only on the controller&apos;s documented instructions. The Terms, this agreement and the controller&apos;s use of Locappoint&apos;s settings are those instructions. If the law requires us to process data otherwise, we tell the controller first unless the law forbids it. If we believe an instruction breaks data protection law, we tell the controller.</p>
        ),
    },
    {
        id: 'confidentiality',
        label: 'Confidentiality',
        body: (
            <p>Everyone we authorise to process the data is bound by confidentiality, and has access only as far as their work needs.</p>
        ),
    },
    {
        id: 'security',
        label: 'Security',
        body: (
            <>
                <p>We keep technical and organisational measures appropriate to the risk, as required by Article 32 of the GDPR, including:</p>
                <ul className="legal__list">
                    <li>encryption of data in transit</li>
                    <li>database access rules that limit each account to its own data</li>
                    <li>limited, logged staff access to production systems</li>
                    <li>backups maintained by our database provider</li>
                    <li>reviewing these measures as the platform changes</li>
                </ul>
            </>
        ),
    },
    {
        id: 'subprocessors',
        label: 'Sub-processors',
        body: (
            <p>The controller gives general authorisation for us to use the providers on our <Link to="/legal/subprocessors">Sub-processors</Link> page. We give at least 30 days&apos; notice of any addition or replacement, and the controller may object as that page describes. Each sub-processor is bound by data protection obligations equivalent to this agreement, and we remain responsible for its performance.</p>
        ),
    },
    {
        id: 'assistance',
        label: 'Helping the controller',
        body: (
            <ul className="legal__list">
                <li><strong>Data subject requests.</strong> If a client asks us directly to exercise their rights, we pass the request to the controller without undue delay and help it respond, as far as the nature of the processing allows.</li>
                <li><strong>Security and assessments.</strong> We help the controller meet its duties on security, breach notification, impact assessments and prior consultation, taking into account the information available to us.</li>
            </ul>
        ),
    },
    {
        id: 'breaches',
        label: 'Personal data breaches',
        body: (
            <p>We notify the controller without undue delay, and in any case within 48 hours, after becoming aware of a personal data breach affecting its data. We include what we know about the nature of the breach, the likely consequences and the measures taken, and add details as we learn them.</p>
        ),
    },
    {
        id: 'transfers',
        label: 'International transfers',
        body: (
            <p>We transfer data outside the European Economic Area only where an adequacy decision applies or the European Commission&apos;s Standard Contractual Clauses are in place.</p>
        ),
    },
    {
        id: 'ending',
        label: 'Ending the agreement',
        body: (
            <p>When the business account closes, the controller can ask for an export of its booking data. We delete the data within 90 days of closure, unless the law requires us to keep it, in which case we keep it only for that purpose and for that time.</p>
        ),
    },
    {
        id: 'audits',
        label: 'Information and audits',
        body: (
            <p>We make available the information needed to show we meet this agreement. The controller, or an auditor it appoints who is bound by confidentiality, may carry out an audit once a year with at least 30 days&apos; written notice, at the controller&apos;s cost, and without disrupting the service to other businesses.</p>
        ),
    },
    {
        id: 'general',
        label: 'General',
        body: (
            <p>Liability under this agreement follows the Terms of Service. If this agreement conflicts with the Terms on data protection, this agreement prevails.</p>
        ),
    },
]

const Dpa = () => (
    <LegalLayout
        title="Data Processing Agreement"
        lede="How we handle your clients' data on your behalf. Applies automatically to every business account."
        sections={sections}
    />
)

export default Dpa
