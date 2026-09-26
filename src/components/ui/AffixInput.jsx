import { Input } from './Field'
import '../../styles/ui-kit.css'

export const AffixInput = ({ prefix, mono = false, ...inputProps }) => (
    <span className={`ui-affix${mono ? ' ui-affix--mono' : ''}`}>
        <span className="ui-affix__prefix" aria-hidden="true">{prefix}</span>
        <Input {...inputProps} />
    </span>
)
