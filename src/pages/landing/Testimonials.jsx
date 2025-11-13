import { Star, Quote } from 'lucide-react'

const Testimonials = () => {
    const testimonials = [
        {
            name: "Maria Silva",
            role: "Hair Stylist",
            business: "Beleza Studio, Lisboa",
            image: "MS",
            rating: 5,
            quote: "I went from managing appointments in a messy notebook to having everything organized online. My bookings doubled in just 2 months! The WhatsApp integration is a game-changer for my Portuguese clients.",
            highlight: "Bookings doubled in 2 months"
        },
        {
            name: "João Costa",
            role: "Personal Trainer",
            business: "FitPro, Porto",
            image: "JC",
            rating: 5,
            quote: "As a solo trainer, I wasted hours every week on scheduling. LocAppoint gave me those hours back. Now clients book themselves, reminders go automatically, and I can focus on what I do best—training.",
            highlight: "Saved 10+ hours per week"
        },
        {
            name: "Sofia Ribeiro", 
            role: "Massage Therapist",
            business: "Zen Wellness, Lisboa",
            image: "SR",
            rating: 5,
            quote: "The GDPR compliance was crucial for my business. LocAppoint made everything simple and secure. My clients love how easy it is to book, and I love how professional it makes my business look.",
            highlight: "95% client satisfaction"
        },
        {
            name: "Ricardo Ferreira",
            role: "Photographer",
            business: "Moments Photography, Porto",
            image: "RF",
            rating: 5,
            quote: "Being discoverable locally changed everything for me. I used to spend money on ads, now clients find me through LocAppoint. The platform paid for itself in the first month.",
            highlight: "ROI in first month"
        },
        {
            name: "Ana Martins",
            role: "Yoga Instructor",
            business: "Flow Yoga, Lisboa",
            image: "AM",
            rating: 5,
            quote: "I was skeptical about online booking systems being too complicated, but LocAppoint proved me wrong. Set up in 10 minutes, my first booking came in 2 hours later. It's incredible.",
            highlight: "First booking in 2 hours"
        },
        {
            name: "Pedro Santos",
            role: "Accountant",
            business: "Santos Consulting, Porto",
            image: "PS",
            rating: 5,
            quote: "Managing client appointments used to be chaotic. LocAppoint brought order to my business. The automatic reminders reduced no-shows by 80%. Absolutely worth it.",
            highlight: "80% fewer no-shows"
        }
    ]

    return (
        <section className="testimonials" id="testimonials">
            <div className="container">
                <div className="testimonials__header">
                    <span className="section-badge">Success Stories</span>
                    <h2 className="section-title">
                        Loved by local businesses across Portugal
                    </h2>
                    <p className="section-subtitle">
                        Real businesses, real results. See how LocAppoint transformed their booking process.
                    </p>
                </div>

                <div className="testimonials__grid">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="testimonial-card">
                            <div className="testimonial-card__header">
                                <div className="testimonial-card__avatar">
                                    {testimonial.image}
                                </div>
                                <div className="testimonial-card__info">
                                    <h3 className="testimonial-card__name">{testimonial.name}</h3>
                                    <p className="testimonial-card__role">{testimonial.role}</p>
                                    <p className="testimonial-card__business">{testimonial.business}</p>
                                </div>
                            </div>

                            <div className="testimonial-card__rating">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} size={16} fill="currentColor" className="testimonial-card__star" />
                                ))}
                            </div>

                            <div className="testimonial-card__quote-icon">
                                <Quote size={24} />
                            </div>

                            <blockquote className="testimonial-card__quote">
                                {testimonial.quote}
                            </blockquote>

                            <div className="testimonial-card__highlight">
                                <div className="testimonial-card__highlight-icon">✨</div>
                                <span>{testimonial.highlight}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="testimonials__cta">
                    <p className="testimonials__cta-text">
                        Join these successful businesses and start growing today
                    </p>
                    <button
                        className="btn btn--primary btn--large"
                        onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Get Started for Free
                    </button>
                </div>
            </div>
        </section>
    )
}

export default Testimonials