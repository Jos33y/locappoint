import { Check, TriangleAlert } from 'lucide-react'
import '../../styles/business/save-state.css'

const TEXT = {
    idle: 'Changes save as you go',
    saving: 'Saving',
    saved: 'All changes saved',
    error: 'Not saved',
}

const SaveState = ({ state, onRetry, blockedText = 'Fix the highlighted field to save it' }) => (
    <p className={`biz-save is-${state}`} aria-live="polite">
        <span className="biz-save__mark" aria-hidden="true">
            {state === 'saved' && <Check size={14} />}
            {(state === 'blocked' || state === 'error') && <TriangleAlert size={14} />}
        </span>
        <span>{state === 'blocked' ? blockedText : TEXT[state]}</span>
        {state === 'error' && <button type="button" className="biz-save__retry" onClick={onRetry}>Try again</button>}
    </p>
)

export default SaveState
