import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY } from '../../../constants/legalEntity'

// The booking rules in plain words. The same rules run in the database (payment_terms, the refund
// rules, support and blocks); change them there and here together.
const sections = [
    {
        id: 'cancelling',
        label: 'Cancelling or missing a visit',
        body: (
            <>
                <p><strong>Free until 24 hours before.</strong> Cancel or move a booking up to 24 hours before it starts and it costs nothing. Paid online, you get everything back.</p>
                <p><strong>After that, or not coming.</strong> When you cancel later than 24 hours before, or do not come, the business keeps half of the price you paid online. For a visit at your place, it keeps at least the travel fee. The rest comes back to you.</p>
                <p>In some cities the rule is different. When it is, the booking shows it before you confirm, and that is the rule that applies.</p>
                <p>When you pay at the visit, nothing is charged by Locappoint. Missing visits again and again can still mean a business stops taking online bookings from you (see Blocks).</p>
            </>
        ),
    },
    {
        id: 'business-cancels',
        label: 'When the business cancels or does not come',
        body: (
            <>
                <p>If the business cancels, does not accept your request, or does not show up, you get back everything you paid online, at any time.</p>
                <p>If a business did not come and the booking still says otherwise, report it from the booking (see Problems). We look at it and refund you when it is right to.</p>
            </>
        ),
    },
    {
        id: 'refunds',
        label: 'Refunds',
        body: (
            <>
                <p>Refunds go back the way the money came: to the same card or account you paid with. We never hold your money, and we never refund in cash or vouchers instead.</p>
                <p>We send the refund the moment it is due. Your bank usually shows it within 5 to 10 working days. You get an email and a refund receipt.</p>
            </>
        ),
    },
    {
        id: 'problems',
        label: 'Problems with a booking',
        body: (
            <>
                <p>Clients and businesses can both report a problem from the booking itself, up to <strong>48 hours after the visit</strong>. Guests do it from the link in their booking email.</p>
                <p>A person at Locappoint reads every report, usually within one working day. Payment and safety reports go first. We look at the booking, the payment and both sides before deciding, and we can ask the other side for their account.</p>
                <p>After a report we can refund a client, correct a no-show, send a written warning, or pause a business from taking bookings while we look into something serious. Every decision is recorded.</p>
                <p>If anyone is in danger, call 112 first.</p>
            </>
        ),
    },
    {
        id: 'blocks',
        label: 'Blocks',
        body: (
            <>
                <p>A business can stop a client from booking it online, but only with a reason: repeated no-shows, late cancellations, rude or unsafe behaviour, not paying, or another reason it explains.</p>
                <p>A blocked client sees that the business is not taking online bookings from them, and can contact the business directly. Bookings already made stay.</p>
                <p><strong>Locappoint reviews every block.</strong> Blocks without a fair reason are lifted, and businesses that block a lot are looked at. If you think a business is not taking your bookings unfairly, tell us in Support, or at {LEGAL_ENTITY.email}.</p>
            </>
        ),
    },
    {
        id: 'reviews',
        label: 'Reviews',
        body: (
            <>
                <p>Only clients who had the visit can review it, within 60 days. You can change your review for 7 days, until the business replies.</p>
                <p>Businesses can reply once, in public. We do not remove a review because it is negative. We remove reviews that are not about a real visit, that insult or threaten, or that share someone's private details. Anyone can report a review for us to look at.</p>
            </>
        ),
    },
    {
        id: 'changes',
        label: 'Changes',
        body: (
            <p>When these rules change, we update this page and tell businesses at least 30 days before. Bookings already made keep the rules they were made under.</p>
        ),
    },
]

const Policies = () => (
    <LegalLayout
        title="Booking policies"
        lede="Cancellations, refunds, problems, blocks and reviews, in plain words."
        sections={sections}
    />
)

export default Policies
