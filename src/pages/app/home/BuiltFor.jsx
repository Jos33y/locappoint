// src/pages/app/home/BuiltFor.jsx
// 8 service-business categories on a dark surface.

import {
    Scissors,
    Sparkles,
    Flower2,
    Dumbbell,
    Dog,
    GraduationCap,
    Stethoscope,
    Camera,
} from 'lucide-react'
import './BuiltFor.css'


const categories = [
    { icon: Scissors, name: 'Salons & Hair', note: 'Cuts, color, styling' },
    { icon: Sparkles, name: 'Barbershops', note: 'Cuts, beards, lineups' },
    { icon: Flower2, name: 'Spas & Wellness', note: 'Massage, facial, sauna' },
    { icon: Dumbbell, name: 'Fitness', note: 'Personal training, classes' },
    { icon: Camera, name: 'Beauty & Photo', note: 'Nails, lashes, studios' },
    { icon: Dog, name: 'Pet Services', note: 'Grooming, walking, vet' },
    { icon: GraduationCap, name: 'Tutoring', note: 'Lessons, coaching, music' },
    { icon: Stethoscope, name: 'Consulting', note: 'Therapy, advisory, clinics' },
]


const BuiltFor = () => {
    return (
        <section className="loca-section loca-section--s0 bf">
            <div className="container">
                <div className="bf__head">
                    <span className="loca-eyebrow">Built for</span>
                    <h2 className="loca-section__title">
                        Anything that runs on <span className="loca-section__title-accent">time slots.</span>
                    </h2>
                    <p className="loca-section__lede">
                        If your business books by the hour, by the half-hour, or by the session, Locappoint fits. Eight categories in the first cohort, more as we onboard.
                    </p>
                </div>

                <div className="bf__grid">
                    {categories.map(({ icon: Icon, name, note }) => (
                        <article key={name} className="bf__card">
                            <span className="bf__ico">
                                <Icon size={18} strokeWidth={1.6} />
                            </span>
                            <div className="bf__copy">
                                <div className="bf__name">{name}</div>
                                <div className="bf__note">{note}</div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="bf__foot">
                    <span className="bf__foot-dot"></span>
                    <span>Different category? Tell us, we&apos;ll add it before launch.</span>
                </div>
            </div>
        </section>
    )
}

export default BuiltFor
