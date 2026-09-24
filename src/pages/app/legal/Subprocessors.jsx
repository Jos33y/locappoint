import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY, SUBPROCESSORS, orPending } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'list',
        label: 'Current list',
        body: (
            <div className="legal__table-wrap">
                <table className="legal__table">
                    <thead>
                        <tr>
                            <th scope="col">Provider</th>
                            <th scope="col">Purpose</th>
                            <th scope="col">Data</th>
                            <th scope="col">Location</th>
                            <th scope="col">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SUBPROCESSORS.map((provider) => (
                            <tr key={provider.name}>
                                <td>{provider.name}</td>
                                <td>{provider.purpose}</td>
                                <td>{provider.data}</td>
                                <td>{orPending(provider.location)}</td>
                                <td>{provider.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ),
    },
    {
        id: 'changes',
        label: 'Changes',
        body: (
            <p>We tell business account holders by email at least 30 days before adding or replacing a provider that processes their clients&apos; data. A business can object within that period by writing to <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. If we cannot resolve the objection, the business can close its account before the change takes effect.</p>
        ),
    },
    {
        id: 'safeguards',
        label: 'Safeguards',
        body: (
            <p>Each provider is bound by a written agreement that requires it to protect the data and use it only to provide its service to us. For providers outside the European Economic Area, we rely on an adequacy decision or on the European Commission&apos;s Standard Contractual Clauses.</p>
        ),
    },
]

const Subprocessors = () => (
    <LegalLayout
        title="Sub-processors"
        lede="The companies that help us run Locappoint, what each one does, and where it processes data."
        sections={sections}
    />
)

export default Subprocessors
