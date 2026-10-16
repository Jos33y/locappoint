// src/pages/app/Contact.jsx
// Contact: the ways to reach a person, then a message form that saves to contact_messages.

import { useRef, useState } from 'react'
import { Check, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import CityPattern from '../../components/brand/CityPattern'
import { Button, Field, Input, Textarea } from '../../components/ui'
import { useCity } from '../../hooks/useCity'
import '../../styles/app/talk.css'

// WhatsApp Business number for direct chat, with the opening words filled in.
const WHATSAPP_URL = 'https://wa.me/351934695914?text=' + encodeURIComponent("Hi Locappoint, I'd like to chat about ")
const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Contact = () => {
    const [city] = useCity()
    const [form, setForm] = useState(EMPTY)
    const [errors, setErrors] = useState({})
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [failed, setFailed] = useState('')
    const formRef = useRef(null)

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }))
        setErrors((x) => ({ ...x, [key]: undefined }))
        setFailed('')
    }

    const submit = async (e) => {
        e.preventDefault()
        const problems = {}
        if (!form.name.trim()) problems.name = 'Add your name'
        if (!EMAIL.test(form.email.trim())) problems.email = 'Enter an email we can reply to'
        if (!form.message.trim()) problems.message = 'Write a message'
        setErrors(problems)
        if (Object.keys(problems).length) {
            requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
            return
        }
        setSending(true)
        setFailed('')
        try {
            const { error } = await supabase.from('contact_messages').insert([{
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                subject: form.subject.trim(),
                message: form.message.trim(),
            }])
            if (error) throw error
            setSent(true)
            setForm(EMPTY)
        } catch (err) {
            console.error('Contact submit failed:', err)
            setFailed('We could not send that. Try again, or email hello@locappoint.com.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className={`lc-talk is-${city.code}`}>
            <AppHeader />

            <main className="lc-talk__main">
                <section className="lc-talk__hero">
                    <span className="lc-talk__band" aria-hidden="true"><CityPattern city={city.code} centred size={28} /></span>
                    <h1 className="lc-talk__title">Talk to us.</h1>
                    <p className="lc-talk__lede">Questions about booking, setting up your page or partnering. A person reads every message and replies within 24 hours.</p>
                </section>

                <div className="lc-talk__grid">
                    <aside className="lc-talk__ways" aria-label="Ways to reach us">
                        <div className="lc-talk__way is-first">
                            <MessageCircle size={18} aria-hidden="true" />
                            <div>
                                <p className="lc-talk__waylabel">WhatsApp</p>
                                <p className="lc-talk__wayvalue">The fastest way to reach us</p>
                                <Button variant="secondary" size="sm" icon={MessageCircle} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Open WhatsApp</Button>
                            </div>
                        </div>
                        <div className="lc-talk__way">
                            <Mail size={18} aria-hidden="true" />
                            <div>
                                <p className="lc-talk__waylabel">Email</p>
                                <a className="lc-talk__wayvalue" href="mailto:hello@locappoint.com">hello@locappoint.com</a>
                            </div>
                        </div>
                        <div className="lc-talk__way">
                            <Phone size={18} aria-hidden="true" />
                            <div>
                                <p className="lc-talk__waylabel">Phone</p>
                                <a className="lc-talk__wayvalue" href="tel:+351934695914">+351 934 695 914</a>
                                <p className="lc-talk__waynote">Monday to Friday, 09:00 to 18:00 Portugal time</p>
                            </div>
                        </div>
                        <div className="lc-talk__way">
                            <MapPin size={18} aria-hidden="true" />
                            <div>
                                <p className="lc-talk__waylabel">Taking bookings in</p>
                                <p className="lc-talk__wayvalue">Porto, Lagos and Lisbon</p>
                            </div>
                        </div>
                    </aside>

                    <div className="lc-talk__card">
                        {sent ? (
                            <div className="lc-talk__done" role="status">
                                <span className="lc-talk__doneicon" aria-hidden="true"><Check size={22} /></span>
                                <h2 className="lc-talk__h2">Message sent</h2>
                                <p>A person will reply to your email within 24 hours.</p>
                                <Button variant="secondary" onClick={() => setSent(false)}>Send another</Button>
                            </div>
                        ) : (
                            <form ref={formRef} className="lc-talk__form" onSubmit={submit} noValidate>
                                <h2 className="lc-talk__h2">Send a message</h2>
                                <Field label="Your name" error={errors.name}>
                                    <Input value={form.name} onChange={set('name')} autoComplete="name" maxLength={120} />
                                </Field>
                                <div className="lc-talk__row">
                                    <Field label="Email" error={errors.email}>
                                        <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" spellCheck={false} maxLength={200} />
                                    </Field>
                                    <Field label="Phone" optional>
                                        <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" maxLength={40} />
                                    </Field>
                                </div>
                                <Field label="Subject" optional>
                                    <Input value={form.subject} onChange={set('subject')} maxLength={160} />
                                </Field>
                                <Field label="Message" error={errors.message}>
                                    <Textarea value={form.message} onChange={set('message')} rows={6} maxLength={5000} placeholder="Tell us how we can help." />
                                </Field>
                                {failed && <p className="lc-talk__failed" role="alert">{failed}</p>}
                                <Button type="submit" full icon={Send} loading={sending}>Send message</Button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    )
}

export default Contact
