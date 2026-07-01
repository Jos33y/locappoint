// src/pages/app/home/HowItWorks.jsx
// Three numbered steps, each with a real UI mockup at the bottom of the card.

import { Copy, Check, Bell } from 'lucide-react'
import './HowItWorks.css'


const HowItWorks = () => {
    return (
        <section className="loca-section loca-section--s1 hiw">
            <div className="container">
                <div className="hiw__head">
                    <span className="loca-eyebrow">How it works</span>
                    <h2 className="loca-section__title">
                        From signup to first booking <span className="loca-section__title-accent">in ten minutes.</span>
                    </h2>
                </div>

                <div className="hiw__grid">

                    {/* Step 1 - Set hours */}
                    <article className="hiw__card">
                        <div className="hiw__num">01</div>
                        <h3 className="hiw__title">Set your hours and services</h3>
                        <p className="hiw__body">
                            Tell us when you&apos;re open, what you offer, and your pricing. Standard week plus exceptions for holidays.
                        </p>
                        <div className="hiw__mock hiw__mock--hours">
                            <div className="hiw__mock-head">Working hours</div>
                            <div className="hiw__hours">
                                <div className="hiw__hour-row hiw__hour-row--on">
                                    <span className="hiw__hour-day">Mon</span>
                                    <span className="hiw__hour-range">09:00 - 18:00</span>
                                    <span className="hiw__hour-toggle hiw__hour-toggle--on"></span>
                                </div>
                                <div className="hiw__hour-row hiw__hour-row--on">
                                    <span className="hiw__hour-day">Tue</span>
                                    <span className="hiw__hour-range">09:00 - 18:00</span>
                                    <span className="hiw__hour-toggle hiw__hour-toggle--on"></span>
                                </div>
                                <div className="hiw__hour-row hiw__hour-row--on">
                                    <span className="hiw__hour-day">Wed</span>
                                    <span className="hiw__hour-range">10:00 - 19:00</span>
                                    <span className="hiw__hour-toggle hiw__hour-toggle--on"></span>
                                </div>
                                <div className="hiw__hour-row">
                                    <span className="hiw__hour-day">Sun</span>
                                    <span className="hiw__hour-range">Closed</span>
                                    <span className="hiw__hour-toggle"></span>
                                </div>
                            </div>
                        </div>
                    </article>

                    {/* Step 2 - Share link */}
                    <article className="hiw__card">
                        <div className="hiw__num">02</div>
                        <h3 className="hiw__title">Share your link</h3>
                        <p className="hiw__body">
                            Your business gets a clean URL at locappoint.com. Drop it in your bio, on a card, in WhatsApp.
                        </p>
                        <div className="hiw__mock hiw__mock--link">
                            <div className="hiw__mock-head">Your booking page</div>
                            <div className="hiw__link">
                                <span className="hiw__link-base">locappoint.com/</span>
                                <span className="hiw__link-slug">femtos-hair</span>
                                <button className="hiw__link-copy" type="button" aria-label="Copy link">
                                    <Copy size={12} strokeWidth={2} />
                                </button>
                            </div>
                            <div className="hiw__link-meta">
                                <span className="hiw__link-dot"></span>
                                <span>Live · indexed by Google</span>
                            </div>
                        </div>
                    </article>

                    {/* Step 3 - Bookings arrive */}
                    <article className="hiw__card">
                        <div className="hiw__num">03</div>
                        <h3 className="hiw__title">Get bookings, automated reminders</h3>
                        <p className="hiw__body">
                            Confirmations on email and WhatsApp. Reminders 24h and 2h before. No more no-shows from forgetfulness.
                        </p>
                        <div className="hiw__mock hiw__mock--notif">
                            <div className="hiw__mock-head">Activity</div>
                            <div className="hiw__notif">
                                <span className="hiw__notif-ico hiw__notif-ico--new">
                                    <Check size={11} strokeWidth={2.5} />
                                </span>
                                <span className="hiw__notif-text">
                                    <span className="hiw__notif-title">New booking</span>
                                    <span className="hiw__notif-sub">Maria Silva · Sat 14:30</span>
                                </span>
                                <span className="hiw__notif-time">now</span>
                            </div>
                            <div className="hiw__notif">
                                <span className="hiw__notif-ico">
                                    <Bell size={11} strokeWidth={2.2} />
                                </span>
                                <span className="hiw__notif-text">
                                    <span className="hiw__notif-title">Reminder sent</span>
                                    <span className="hiw__notif-sub">João · 2h before</span>
                                </span>
                                <span className="hiw__notif-time">12m</span>
                            </div>
                        </div>
                    </article>

                </div>
            </div>
        </section>
    )
}

export default HowItWorks
