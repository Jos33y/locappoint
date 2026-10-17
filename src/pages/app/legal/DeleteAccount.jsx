import { Link, useLocation } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY } from '../../../constants/legalEntity'

// The public page Google Play and Meta ask for: how to delete an account, from the app or without it,
// and how someone who only ever used WhatsApp gets their messages deleted.
const sections = [
    {
        id: 'how',
        label: 'Delete it yourself',
        body: (
            <>
                <p>In the Locappoint app or on locappoint.com, signed in:</p>
                <ul className="legal__list">
                    <li><strong>Clients:</strong> Profile, then Your account, then Delete account.</li>
                    <li><strong>Businesses:</strong> Settings, then Your account, then Delete account.</li>
                </ul>
                <p>You see exactly what will be deleted before you confirm, and you confirm by typing DELETE.</p>
            </>
        ),
    },
    {
        id: 'without',
        label: 'Without the app',
        body: (
            <p>Write to <a href={`mailto:${LEGAL_ENTITY.email}?subject=${encodeURIComponent('Delete my Locappoint account')}`}>{LEGAL_ENTITY.email}</a> from the email address on your account, with &ldquo;Delete my account&rdquo; in the subject. We confirm it is you, delete the account and reply within 30 days.</p>
        ),
    },
    {
        id: 'whatsapp',
        label: 'If you used Locappoint on WhatsApp',
        body: (
            <>
                <p>You do not need an account to book with us on WhatsApp, so there is nothing to delete in the app. Instead:</p>
                <ul className="legal__list">
                    <li><strong>To stop messages:</strong> send STOP to Locappoint on WhatsApp. Send START to turn them back on.</li>
                    <li><strong>To delete your data:</strong> write to <a href={`mailto:${LEGAL_ENTITY.email}?subject=${encodeURIComponent('Delete my WhatsApp data')}`}>{LEGAL_ENTITY.email}</a> with &ldquo;Delete my WhatsApp data&rdquo; in the subject and the WhatsApp number you used. We delete your messages and contact details and reply within 30 days. Bookings you made stay with the businesses you booked, without your messages.</li>
                    <li><strong>Without asking:</strong> messages are deleted automatically 90 days after they were sent.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'what',
        label: 'What is deleted, and what stays',
        body: (
            <ul className="legal__list">
                <li><strong>Deleted straight away:</strong> your sign-in, your profile, your notifications, and a business you own with its page, services, hours, bookings and reviews.</li>
                <li><strong>Stays with the business you booked:</strong> bookings you made as a client, without any link to your account. The business needs them for its own records and handles them under its own privacy terms.</li>
                <li><strong>A business with bookings still to come</strong> cannot be deleted until they are cancelled or moved, so no client is left waiting at a closed door.</li>
                <li><strong>Backups</strong> are overwritten in the normal backup cycle.</li>
                <li><strong>Records the law makes us keep</strong>, such as invoices once billing starts, are kept for the period the law sets.</li>
            </ul>
        ),
    },
]

const DeleteAccount = () => {
    const { search } = useLocation()
    const done = new URLSearchParams(search).get('done') === '1'
    return (
        <LegalLayout
            title={done ? 'Your account is deleted' : 'Delete your account'}
            lede={done
                ? <>Thank you for using Locappoint. You can make a new account any time. <Link to="/">Back to Locappoint</Link></>
                : 'How to delete your Locappoint account or your WhatsApp messages, and what happens to your data.'}
            sections={sections}
        />
    )
}

export default DeleteAccount
