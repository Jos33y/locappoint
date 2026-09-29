import { CalendarPlus, Download } from 'lucide-react'
import { calendarEvent, downloadIcs, googleCalendarUrl } from '../../services/calendar'
import '../../styles/client/booking-sheet.css'

// Two ways in, because there are two calendar worlds: Google, and everything that opens an .ics file.
export const AddToCalendar = ({ booking, compact = false }) => {
    const event = calendarEvent(booking)
    return (
        <div className={`lc-cal${compact ? ' lc-cal--compact' : ''}`} role="group" aria-label="Add to calendar">
            {!compact && <p className="lc-cal__title">Add it to your calendar</p>}
            <div className="lc-cal__actions">
                <a className="lc-cal__btn" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus size={16} aria-hidden="true" />
                    <span>Google Calendar</span>
                </a>
                <button type="button" className="lc-cal__btn" onClick={() => downloadIcs(event)}>
                    <Download size={16} aria-hidden="true" />
                    <span>Apple or Outlook</span>
                </button>
            </div>
        </div>
    )
}
