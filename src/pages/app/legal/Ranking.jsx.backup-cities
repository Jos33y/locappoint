import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'parameters',
        label: 'What decides the order',
        body: (
            <>
                <p>This page explains, as required by EU Regulation 2019/1150, the main factors that decide where a business appears on Browse and in search.</p>
                <ul className="legal__list">
                    <li><strong>Active pages only.</strong> A business appears only while its page is active.</li>
                    <li><strong>Join date.</strong> Businesses appear in the order they joined Locappoint, earliest first.</li>
                    <li><strong>Launch cohort.</strong> Browse currently shows our first Lisbon cohort, up to ten businesses.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'no-payment',
        label: 'What does not affect it',
        body: (
            <p>Nobody can pay for a higher position. Paying businesses and businesses in their free period are treated the same. We do not rank businesses according to any relationship with us.</p>
        ),
    },
    {
        id: 'changes',
        label: 'Changes',
        body: (
            <p>As Locappoint grows we expect to add city and category filters, search, and factors such as availability and client reviews. We will update this page before any change takes effect. Questions or complaints about ranking: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
        ),
    },
]

const Ranking = () => (
    <LegalLayout
        title="How Browse ranks businesses"
        lede="Why businesses appear in the order they do. No paid placement."
        sections={sections}
    />
)

export default Ranking
