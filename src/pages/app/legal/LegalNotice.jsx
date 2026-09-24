import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY, orPending } from '../../../constants/legalEntity'

const Row = ({ label, value }) => (
    <tr>
        <th scope="row">{label}</th>
        <td>{value}</td>
    </tr>
)

const sections = [
    {
        id: 'operator',
        label: 'Operator',
        body: (
            <div className="legal__table-wrap">
                <table className="legal__table legal__table--pairs">
                    <tbody>
                        <Row label="Service" value={`${LEGAL_ENTITY.tradingName}, locappoint.com`} />
                        <Row label="Company" value={orPending(LEGAL_ENTITY.legalName)} />
                        <Row label="Registered address" value={orPending(LEGAL_ENTITY.registeredAddress)} />
                        <Row label="Registry" value={orPending(LEGAL_ENTITY.registry)} />
                        <Row label="Registration number" value={orPending(LEGAL_ENTITY.registrationNumber)} />
                        <Row label="Tax number" value={orPending(LEGAL_ENTITY.taxId)} />
                        <Row label="Based in" value={LEGAL_ENTITY.city} />
                        <Row label="Email" value={<a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>} />
                    </tbody>
                </table>
            </div>
        ),
    },
    {
        id: 'contact-point',
        label: 'Point of contact',
        body: (
            <p>Users and public authorities, including under the EU Digital Services Act, can reach us at <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. We handle messages in {LEGAL_ENTITY.languages}.</p>
        ),
    },
    {
        id: 'content',
        label: 'Business content',
        body: (
            <p>Each business page is written and maintained by the business it describes. The business is responsible for its content, services and prices. To report content you believe is illegal, follow section 5 of our Terms of Service.</p>
        ),
    },
]

const LegalNotice = () => (
    <LegalLayout
        title="Legal Notice"
        lede="Who runs Locappoint and how to reach us."
        sections={sections}
    />
)

export default LegalNotice
