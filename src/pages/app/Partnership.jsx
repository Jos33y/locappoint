// src/pages/app/Partnership.jsx
// Founding partners: who applies, their business, and what they need. Saves to partnership_requests.

import { useRef, useState } from 'react'
import { Check, Send } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import CityPattern from '../../components/brand/CityPattern'
import { Button, Field, Input, Picker, Textarea } from '../../components/ui'
import { useCity } from '../../hooks/useCity'
import '../../styles/app/talk.css'

// The kinds of business a partner can bring. The stored value stays as before, so past rows still read.
const TYPES = [
    { value: 'Salons & Hair', label: 'Salons and hair' },
    { value: 'Barbershops', label: 'Barbershops' },
    { value: 'Spas & Wellness', label: 'Spas and wellness' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Beauty & Photo', label: 'Beauty and photography' },
    { value: 'Pet Services', label: 'Pet services' },
    { value: 'Tutoring', label: 'Tutoring' },
    { value: 'Consulting', label: 'Consulting' },
    { value: 'Other', label: 'Something else' },
]
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', organizationType: '', organizationName: '', city: '', country: '', partnershipInterest: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Partnership = () => {
    const [city] = useCity()
    const [form, setForm] = useState(EMPTY)
    const [errors, setErrors] = useState({})
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [failed, setFailed] = useState('')
    const formRef = useRef(null)

    const put = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }))
        setErrors((x) => ({ ...x, [key]: undefined }))
        setFailed('')
    }
    const set = (key) => (e) => put(key, e.target.value)

    const submit = async (e) => {
        e.preventDefault()
        const problems = {}
        if (!form.firstName.trim()) problems.firstName = 'Add your first name'
        if (!form.lastName.trim()) problems.lastName = 'Add your last name'
        if (!EMAIL.test(form.email.trim())) problems.email = 'Enter an email we can reply to'
        if (form.phone.replace(/\D/g, '').length < 7) problems.phone = 'Enter a phone number we can call'
        if (!form.organizationType) problems.organizationType = 'Pick the kind of business'
        setErrors(problems)
        if (Object.keys(problems).length) {
            requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
            return
        }
        setSending(true)
        setFailed('')
        try {
            const { error } = await supabase.from('partnership_requests').insert([{
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                organization_type: form.organizationType,
                organization_name: form.organizationName.trim(),
                city: form.city.trim(),
                country: form.country.trim(),
                partnership_interest: form.partnershipInterest.trim(),
            }])
            if (error) throw error
            setSent(true)
            setForm(EMPTY)
        } catch (err) {
            console.error('Partnership submit failed:', err)
            setFailed('We could not send that. Try again, or email hello@locappoint.com.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className={`lc-talk is-${city.code}${city.light ? ' is-light' : ''}`}>
            <AppHeader />

            <main className="lc-talk__main is-narrow">
                <section className="lc-talk__hero">
                    <span className="lc-talk__band" aria-hidden="true"><CityPattern world={city.world} centred size={28} /></span>
                    <h1 className="lc-talk__title">Become a founding partner.</h1>
                    <p className="lc-talk__lede">Founding partners shape what we build next, get it first, and appear with us as we grow in their country. Tell us about your business below.</p>
                </section>

                <div className="lc-talk__card">
                    {sent ? (
                        <div className="lc-talk__done" role="status">
                            <span className="lc-talk__doneicon" aria-hidden="true"><Check size={22} /></span>
                            <h2 className="lc-talk__h2">Application sent</h2>
                            <p>A person reads every application and replies within 48 hours.</p>
                            <Button variant="secondary" onClick={() => setSent(false)}>Send another</Button>
                        </div>
                    ) : (
                        <form ref={formRef} className="lc-talk__form" onSubmit={submit} noValidate>
                            <fieldset className="lc-talk__group">
                                <legend className="lc-talk__h2">About you</legend>
                                <div className="lc-talk__row">
                                    <Field label="First name" error={errors.firstName}>
                                        <Input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" maxLength={80} />
                                    </Field>
                                    <Field label="Last name" error={errors.lastName}>
                                        <Input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" maxLength={80} />
                                    </Field>
                                </div>
                                <div className="lc-talk__row">
                                    <Field label="Email" error={errors.email}>
                                        <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" spellCheck={false} maxLength={200} />
                                    </Field>
                                    <Field label="Phone" error={errors.phone}>
                                        <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" maxLength={40} />
                                    </Field>
                                </div>
                            </fieldset>

                            <fieldset className="lc-talk__group">
                                <legend className="lc-talk__h2">Your business</legend>
                                <Field label="Kind of business" error={errors.organizationType}>
                                    <Picker value={form.organizationType} onChange={(v) => put('organizationType', v)} title="Kind of business" placeholder="Pick one" options={TYPES} />
                                </Field>
                                <Field label="Business name" optional>
                                    <Input value={form.organizationName} onChange={set('organizationName')} autoComplete="organization" maxLength={160} />
                                </Field>
                                <div className="lc-talk__row">
                                    <Field label="City" optional>
                                        <Input value={form.city} onChange={set('city')} autoComplete="address-level2" maxLength={80} />
                                    </Field>
                                    <Field label="Country" optional>
                                        <Input value={form.country} onChange={set('country')} autoComplete="country-name" maxLength={80} />
                                    </Field>
                                </div>
                            </fieldset>

                            <fieldset className="lc-talk__group">
                                <legend className="lc-talk__h2">What you need</legend>
                                <Field label="How would Locappoint fit your business?" optional>
                                    <Textarea value={form.partnershipInterest} onChange={set('partnershipInterest')} rows={5} maxLength={5000} placeholder="What works today, what does not, and what would make this a yes." />
                                </Field>
                            </fieldset>

                            {failed && <p className="lc-talk__failed" role="alert">{failed}</p>}
                            <Button type="submit" full icon={Send} loading={sending}>Send application</Button>
                            <p className="lc-talk__foot">A person reads every application and replies within 48 hours.</p>
                        </form>
                    )}
                </div>
            </main>

            <AppFooter />
        </div>
    )
}

export default Partnership
