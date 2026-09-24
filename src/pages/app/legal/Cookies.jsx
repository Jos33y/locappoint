import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY } from '../../../constants/legalEntity'

const StorageTable = ({ rows }) => (
    <div className="legal__table-wrap">
        <table className="legal__table">
            <thead>
                <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Kept for</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.name}>
                        <td><code>{row.name}</code></td>
                        <td>{row.type}</td>
                        <td>{row.purpose}</td>
                        <td>{row.kept}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

const ESSENTIAL_APP = [
    { name: 'sb-[project]-auth-token', type: 'Local storage', purpose: 'Keeps you signed in', kept: 'Until you sign out' },
    { name: 'pendingBooking', type: 'Session storage', purpose: 'Holds a booking you started while you sign in to finish it', kept: 'Until you close the tab' },
    { name: 'i18nextLng', type: 'Local storage', purpose: 'Remembers the language you chose', kept: 'Until you clear it' },
]

const ESSENTIAL_WAITLIST = [
    { name: 'locappoint-landing-lang', type: 'Local storage', purpose: 'Remembers the language you chose', kept: 'Until you clear it' },
    { name: 'locappoint_consent', type: 'Local storage', purpose: 'Remembers your privacy choice', kept: '12 months, then we ask again' },
]

const ANALYTICS_WAITLIST = [
    { name: 'locappoint_session_id', type: 'Session storage', purpose: 'Groups the pages you view in one visit', kept: 'Until you close the tab' },
    { name: 'locappoint_session_data', type: 'Session storage', purpose: 'Marks that the visit has been counted', kept: 'Until you close the tab' },
]

const sections = [
    {
        id: 'what',
        label: 'What this covers',
        body: (
            <>
                <p>Websites can store small pieces of information on your device, in cookies or in similar places such as your browser&apos;s local storage. The law treats them the same way. We use the word &ldquo;storage&rdquo; for all of them.</p>
                <p>We do not use advertising cookies, and we do not let other companies track you across sites.</p>
            </>
        ),
    },
    {
        id: 'main-site',
        label: 'locappoint.com',
        body: (
            <>
                <p>The main site uses essential storage only. It is needed for the site to work, so we do not ask for consent.</p>
                <StorageTable rows={ESSENTIAL_APP} />
                <p>If you choose to sign in with Google or Apple, you are taken to that provider, which applies its own cookie policy.</p>
            </>
        ),
    },
    {
        id: 'waitlist-site',
        label: 'waitlist.locappoint.com',
        body: (
            <>
                <p>The waitlist site uses the essential storage below:</p>
                <StorageTable rows={ESSENTIAL_WAITLIST} />
                <p>With your consent only, it also measures visits:</p>
                <StorageTable rows={ANALYTICS_WAITLIST} />
                <p>When you allow analytics, your IP address is sent once per visit to ipapi.co (or, if that fails, to country.is) to look up your approximate location. We keep the country, region, city and time zone, not the IP address. Without your consent, none of this happens.</p>
            </>
        ),
    },
    {
        id: 'fonts',
        label: 'Fonts',
        body: (
            <p>Our fonts are served from our own servers, so loading a page does not send your IP address to a font provider.</p>
        ),
    },
    {
        id: 'choices',
        label: 'Changing your choice',
        body: (
            <>
                <p>On the waitlist site, use <strong>Cookie settings</strong> in the footer to change your choice at any time. Refusing is as easy as accepting, and the site works the same either way.</p>
                <p>You can also clear stored data in your browser settings. If you clear essential storage, you will be signed out and your language choice will be reset.</p>
                <p>Questions: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. More about how we handle data is in our <Link to="/privacy">Privacy Policy</Link>.</p>
            </>
        ),
    },
]

const Cookies = () => (
    <LegalLayout
        title="Cookie Policy"
        lede="Every piece of information our sites store on your device, what it does, and how long it stays."
        sections={sections}
    />
)

export default Cookies
