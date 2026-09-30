import { Coffee, DoorClosed } from 'lucide-react'
import { WEEK, breakLabel, clock } from '../../../services/hours'
import '../../../styles/public-page.css'

export const PublicHours = ({ week, todayDow }) => (
    <section className="lc-pub__card lc-pub__hours" aria-labelledby="lc-pub-hours">
        <h2 id="lc-pub-hours" className="lc-pub__h2">Opening hours</h2>
        <ul className="lc-pub__days">
            {WEEK.map(({ dow, long }) => {
                const windows = week[dow]
                const breaks = windows.slice(1).map((w, i) => ({ start: windows[i].end, end: w.start }))
                const today = dow === todayDow
                return (
                    <li key={dow} className={`lc-pub__day${today ? ' is-today' : ''}${windows.length ? '' : ' is-closed'}`}>
                        <span className="lc-pub__dayname">
                            {long}
                            {today && <span className="lc-pub__todaylabel">Today</span>}
                        </span>
                        <span className="lc-pub__daytimes">
                            {windows.length ? (
                                <span className="lc-pub__range">
                                    <b>{clock(windows[0].start)}</b>
                                    <span className="lc-pub__to"> to </span>
                                    <b>{clock(windows[windows.length - 1].end)}</b>
                                </span>
                            ) : (
                                <span className="lc-pub__closed"><DoorClosed size={15} aria-hidden="true" />Closed</span>
                            )}
                            {breaks.map((g) => (
                                <span key={g.start} className="lc-pub__lunch">
                                    <Coffee size={13} aria-hidden="true" />
                                    {`${breakLabel(g)} ${clock(g.start)} to ${clock(g.end)}`}
                                </span>
                            ))}
                        </span>
                    </li>
                )
            })}
        </ul>
    </section>
)
