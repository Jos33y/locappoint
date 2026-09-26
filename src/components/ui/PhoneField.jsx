import { useMemo, useState } from 'react'
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { Picker } from './Picker'
import { Flag } from './Flag'
import '../../styles/ui-kit.css'

const regionName = (() => {
    try {
        const names = new Intl.DisplayNames(['en'], { type: 'region' })
        return (code) => names.of(code) || code
    } catch {
        return (code) => code
    }
})()

export const COUNTRY_OPTIONS = getCountries()
    .map((code) => ({
        value: code,
        label: regionName(code),
        meta: `+${getCountryCallingCode(code)}`,
        keywords: `${code} +${getCountryCallingCode(code)} ${getCountryCallingCode(code)}`,
        prefix: <Flag code={code} />,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

export const parsePhone = (text, country) => {
    const parsed = parsePhoneNumberFromString(text || '', country)
    return parsed ? { e164: parsed.number, valid: parsed.isValid(), country: parsed.country } : { e164: '', valid: false, country: null }
}

export const nationalFormat = (e164) => {
    const parsed = parsePhoneNumberFromString(e164 || '')
    return parsed ? parsed.formatNational() : e164 || ''
}

export const PhoneField = ({
    id, value, country, onChange, onCountryChange, popular, placeholder,
    'aria-invalid': invalid, 'aria-describedby': describedBy,
}) => {
    const [text, setText] = useState(() => nationalFormat(value))
    const options = useMemo(() => COUNTRY_OPTIONS, [])

    const update = (raw, activeCountry) => {
        const international = raw.trim().startsWith('+')
        const formatter = new AsYouType(international ? undefined : activeCountry)
        const formatted = formatter.input(raw)
        const detected = international ? formatter.getCountry() : null
        if (detected && detected !== activeCountry) onCountryChange?.(detected)
        const parsed = parsePhone(raw, detected || activeCountry)
        setText(international && parsed.valid ? nationalFormat(parsed.e164) : formatted)
        onChange({ e164: parsed.e164, valid: parsed.valid })
    }

    return (
        <span className="ui-phone-field">
            <Picker
                value={country}
                onChange={(next) => { onCountryChange?.(next); update(text, next) }}
                options={options}
                popular={popular}
                searchable
                compact
                title="Country code"
                searchPlaceholder="Search country or code"
            />
            <span className="ui-phone-field__input">
                <input
                    id={id}
                    className="ui-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={text}
                    placeholder={placeholder}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => update(e.target.value, country)}
                />
            </span>
        </span>
    )
}
