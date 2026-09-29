import { RotateCcw } from 'lucide-react'
import { Segmented } from '../../ui'
import { gapLabel, monthShort } from '../../../services/booking'
import { parseDateKey } from '../../../services/dates'
import '../../../styles/client/rebook.css'

const dayName = (key) => {
    const date = parseDateKey(key)
    return date ? `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${date.getDate()} ${monthShort(date)}` : ''
}

export const RebookNote = ({ rebook, staffId, onStaff, picked, usual }) => {
    const many = rebook.staffCount > 1
    const gone = Boolean(rebook.staffName) && !rebook.staffId
    let rhythm = null
    if (rebook.gapDays) {
        const every = `You come about every ${gapLabel(rebook.gapDays)}`
        if (rebook.due && rebook.due < rebook.today) rhythm = `${every}, so you are due.`
        else if (usual && picked === usual) rhythm = `${every}, so we picked ${dayName(usual)}.`
        else rhythm = `${every}.`
    }
    return (
        <div className="lc-bk-again">
            <p className="lc-bk-again__line">
                <RotateCcw size={16} aria-hidden="true" />
                <span>{many && rebook.staffId ? <>Same as last time, with <b>{rebook.staffName}</b></> : 'Same as last time'}</span>
            </p>
            {rhythm && <p className="lc-bk-again__rhythm">{rhythm}</p>}
            {gone && <p className="lc-bk-again__gone">{rebook.staffName} is not taking bookings right now. Showing anyone free.</p>}
            {many && rebook.staffId && (
                <Segmented
                    label="Who"
                    value={staffId ? 'staff' : 'any'}
                    onChange={(value) => onStaff(value === 'staff' ? rebook.staffId : null)}
                    options={[{ value: 'staff', label: `With ${rebook.staffName}` }, { value: 'any', label: 'Anyone free' }]}
                />
            )}
        </div>
    )
}
