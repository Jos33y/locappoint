import { Field, Input, Textarea } from '../../ui'
import { PhoneField } from '../../ui/PhoneField'
import '../../../styles/client/booking-sheet.css'

export const BookingDetails = ({ value, errors, email, onSignIn, onChange }) => (
    <div className="lc-bk-details">
        {onSignIn && (
            <p className="lc-bk-details__who">
                No account needed. <button type="button" className="lc-bk-link" onClick={onSignIn}>Sign in</button> if you have one.
            </p>
        )}
        <Field label="Your name" error={errors.name}>
            <Input value={value.name} autoComplete="name" onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        {!email && (
            <Field label="Email" hint="For your confirmation, and a link to change or cancel" error={errors.email}>
                <Input type="email" inputMode="email" autoComplete="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} />
            </Field>
        )}
        <Field label="Phone" hint="Only for this booking, if the business needs to reach you" error={errors.phone}>
            <PhoneField
                value={value.phone}
                country={value.country}
                popular={['PT', 'NG', 'GB', 'BR']}
                onCountryChange={(country) => onChange({ country })}
                onChange={({ e164, valid }) => onChange({ phone: e164, phoneValid: valid })}
            />
        </Field>
        <Field label="Note for the business" optional>
            <Textarea value={value.notes} rows={2} maxLength={300} onChange={(e) => onChange({ notes: e.target.value })} />
        </Field>
        {email && <p className="lc-bk-details__email">Confirmation goes to <b>{email}</b></p>}
    </div>
)
