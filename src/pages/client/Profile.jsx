import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ChevronRight, KeyRound, LogOut, Mail, Store, Trash2 } from 'lucide-react'
import { Button, Field } from '../../components/ui'
import { PhoneField, parsePhone } from '../../components/ui/PhoneField'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { initials } from '../../components/business/Brand'
import StreetGridCover from '../../components/business/StreetGridCover'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { DeleteAccountSheet, PasswordSheet, SettingsRow as Row, SettingsSection as Section, SignOutSheet } from '../../components/business/AccountSheets'
import { EmailSheet } from '../../components/client/EmailSheet'
import { BookingToast } from '../../components/client/bookings/BookingToast'
import { SUPPORT } from '../../constants/support'
import '../../styles/business/settings-page.css'
import '../../styles/client/profile-page.css'

const memberSince = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const ClientProfile = () => {
    const { user, userProfile, refreshProfile, hasBusiness } = useAuth()
    const email = user?.email || userProfile?.email || ''
    const startPhone = parsePhone(userProfile?.phone || '', 'PT')
    const [name, setName] = useState(userProfile?.full_name || '')
    const [phone, setPhone] = useState({ e164: startPhone.e164 || '', valid: startPhone.valid, country: startPhone.country || 'PT' })
    const [saved, setSaved] = useState({ name: userProfile?.full_name || '', phone: startPhone.e164 || '' })
    const [phoneTouched, setPhoneTouched] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)
    const [signOutOpen, setSignOutOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [emailOpen, setEmailOpen] = useState(false)
    const [toast, setToast] = useState(null)

    const trimmed = name.trim()
    const nameProblem = trimmed ? null : 'Enter the name businesses should expect'
    const phoneProblem = phone.e164 && !phone.valid ? 'Enter a full phone number' : null
    const since = useMemo(() => memberSince(userProfile?.created_at || user?.created_at), [userProfile?.created_at, user?.created_at])

    const changed = trimmed !== saved.name.trim() || (phone.valid ? phone.e164 : '') !== saved.phone
    const blocked = Boolean(nameProblem || phoneProblem)

    const autosave = useAutosave({
        pending: !blocked && changed ? JSON.stringify({ full_name: trimmed, phone: phone.valid ? phone.e164 : null }) : '',
        ready: Boolean(user?.id),
        blocked,
        save: async (value) => {
            const row = JSON.parse(value)
            const { data, error } = await supabase.from('users').update(row).eq('id', user.id).select('id')
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Update returned 0 rows for user ' + user.id)
            setSaved({ name: row.full_name, phone: row.phone || '' })
            refreshProfile?.()
        },
    })

    const say = (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 3200)
    }


    return (
        <div className="biz-page biz-st lc-cl-profile">
            <header className="biz-page__head biz-st__head">
                <div>
                    <h1 className="biz-page__title">Profile</h1>
                    <p className="biz-page__sub">Your details, sign-in and security.</p>
                </div>
            </header>

            <div className="biz-st__column">
                <section className="ui-card ui-card--flat biz-st__card biz-st__idcard" aria-labelledby="profile-title">
                    <div className="biz-st__band" aria-hidden="true">
                        <StreetGridCover seed={user?.id || email} tint="azure" focus />
                    </div>
                    <div className="biz-st__id">
                        <span className="biz-st__avatar" aria-hidden="true">{initials(trimmed || email)}</span>
                        <div className="biz-st__idtext">
                            <h2 id="profile-title" className="biz-st__idname">{trimmed || 'Your name'}</h2>
                            <p className="biz-st__idmeta">
                                <span>{email}</span>
                                {since && <span className="biz-st__since">Member since {since}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="biz-st__idbody">
                        <div className="biz-st__namefield lc-cl-profile__fields">
                            <Field label="Your name" error={trimmed !== saved.name ? nameProblem : undefined} hint="Shown to businesses on your bookings">
                                <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                            </Field>
                            <div onBlur={() => setPhoneTouched(true)}>
                                <Field label="Phone" error={phoneTouched ? phoneProblem : undefined} hint="Filled in for you when you book, so a business can reach you">
                                    <PhoneField
                                        value={phone.e164}
                                        country={phone.country}
                                        popular={['PT', 'NG', 'GB', 'BR']}
                                        onCountryChange={(country) => setPhone((p) => ({ ...p, country }))}
                                        onChange={({ e164, valid }) => setPhone((p) => ({ ...p, e164, valid }))}
                                    />
                                </Field>
                            </div>
                            <SaveState state={autosave.state} onRetry={autosave.retry} blockedText={nameProblem || phoneTouched ? 'Not saved yet' : 'Saves when the phone number is complete'} />
                        </div>
                        <div className="biz-st__rule" />
                        <Row title="Sign-in email" detail={<>You sign in with <b>{email}</b>, and booking emails go there.</>}>
                            <Button variant="secondary" size="sm" icon={Mail} onClick={() => setEmailOpen(true)}>Change email</Button>
                        </Row>
                    </div>
                </section>

                <Section id="security" title="Sign-in and security">
                    <Row title="Password" detail="Change it any time. You stay signed in on this device.">
                        <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => setPasswordOpen(true)}>Change password</Button>
                    </Row>
                    <div className="biz-st__rule" />
                    <Row title="Sign out everywhere" detail="Lost a phone or shared your password? This signs you out on every device.">
                        <Button variant="secondary" size="sm" icon={LogOut} onClick={() => setSignOutOpen(true)}>Sign out everywhere</Button>
                    </Row>
                </Section>

                <Section id="alerts" title="Notifications">
                    <Row title="Booking emails" detail="When you book, when a business confirms, moves or cancels, and reminders the day before and two hours before. They always send. Each one has a link to add it to your calendar or change it.">
                        <span className="lc-cl-on">On</span>
                    </Row>
                    <div className="biz-st__rule" />
                    <Row title="After a visit" detail="The morning after, one email to rate it and book the next one. Each has a one-tap link to stop them.">
                        <span className="lc-cl-on">On</span>
                    </Row>
                    <div className="biz-st__rule" />
                    <Row title="In the app" detail="The bell at the top shows the same news, the moment it happens.">
                        <span className="lc-cl-on">On</span>
                    </Row>
                    <div className="biz-st__rule" />
                    <Row title="WhatsApp reminders" detail="The same reminders on WhatsApp, for people who live there more than in email.">
                        <span className="biz-soon">Soon</span>
                    </Row>
                </Section>

                <Section id="account" title="Your account">
                    <Link to="/portal" className="biz-st__linkrow">
                        {hasBusiness ? <ArrowLeftRight size={18} aria-hidden="true" /> : <Store size={18} aria-hidden="true" />}
                        <span className="biz-st__rowtext">
                            <span className="biz-st__rowtitle">{hasBusiness ? 'Switch to my business' : 'Start a business'}</span>
                            <span className="biz-st__rowdetail">
                                {hasBusiness ? 'Your calendar, services and hours, with the same account.' : 'Take bookings for your own business with the same account.'}
                            </span>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" className="biz-st__chevron" />
                    </Link>
                    <div className="biz-st__rule" />
                    <Row title="Delete your account" detail="Deletes your sign-in and profile, and a business you own with everything in it. We show you exactly what goes before anything happens.">
                        <Button variant="secondary" size="sm" className="biz-st__danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete account</Button>
                    </Row>
                </Section>

                <p className="biz-st__legal">
                    <Link to="/privacy">Privacy</Link>
                    <span aria-hidden="true">·</span>
                    <Link to="/terms">Terms</Link>
                    <span aria-hidden="true">·</span>
                    <span>Support: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a></span>
                </p>
            </div>

            <PasswordSheet
                open={passwordOpen}
                email={email}
                onClose={() => setPasswordOpen(false)}
                onDone={() => { setPasswordOpen(false); say('Password changed') }}
            />
            <SignOutSheet open={signOutOpen} onClose={() => setSignOutOpen(false)} />
            <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
            <EmailSheet
                open={emailOpen}
                current={email}
                onClose={() => setEmailOpen(false)}
                onSent={(next) => { setEmailOpen(false); say(`Check ${next} to confirm the change`) }}
            />
            <BookingToast message={toast} />
        </div>
    )
}

export default ClientProfile
