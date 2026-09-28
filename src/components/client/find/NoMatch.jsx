import { Button } from '../../ui'
import '../../../styles/client/find-page.css'

export const NoMatch = ({ title, body, onClear }) => (
    <div className="lc-cl-nomatch">
        <svg width="148" height="112" viewBox="0 0 148 112" aria-hidden="true" className="lc-cl-nomatch__art">
            <rect className="lc-cl-nomatch__frame" x="8" y="8" width="132" height="96" rx="14" />
            <path className="lc-cl-nomatch__street" d="M8 38 L140 30 M8 78 L140 70 M46 8 L40 104 M104 8 L98 104" />
            <path className="lc-cl-nomatch__pin" d="M74 30 C65 30 59 36.5 59 44.5 C59 55 74 68 74 68 C74 68 89 55 89 44.5 C89 36.5 83 30 74 30 Z" />
            <circle className="lc-cl-nomatch__dot" cx="74" cy="84" r="3" />
        </svg>
        <h2>{title}</h2>
        <p>{body}</p>
        {onClear && <Button variant="secondary" onClick={onClear}>Clear search</Button>}
    </div>
)
