import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// A password box with a show and hide button, so a typo is seen before it costs a failed sign-in.
const PasswordInput = ({ id, ...props }) => {
    const [shown, setShown] = useState(false)
    return (
        <div className="auth-field__wrap">
            <input id={id} type={shown ? 'text' : 'password'} {...props} />
            <button
                type="button"
                className="auth-field__eye"
                onClick={() => setShown((v) => !v)}
                aria-label="Show password"
                aria-pressed={shown}
                aria-controls={id}>
                {shown ? <EyeOff size={18} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.8} aria-hidden="true" />}
            </button>
        </div>
    )
}

export default PasswordInput
