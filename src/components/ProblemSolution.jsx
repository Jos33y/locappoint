import { X, Check, TrendingDown, TrendingUp } from 'lucide-react'

const ProblemSolution = () => {
    const problems = [
        {
            problem: "Missing calls = Lost revenue",
            solution: "24/7 automated booking system",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "Stop losing money from missed calls. Clients book anytime, anywhere—even when you're busy or sleeping."
        },
        {
            problem: "Messy paper calendars & spreadsheets",
            solution: "Smart digital calendar sync",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "No more double bookings or scheduling conflicts. Everything is organized, synced, and accessible from any device."
        },
        {
            problem: "Clients forget appointments (30% no-show rate)",
            solution: "Automatic SMS & email reminders",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "Reduce no-shows by 80%. Smart reminders go out automatically 24h and 2h before appointments."
        },
        {
            problem: "Hard to get discovered locally",
            solution: "Local discovery marketplace",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "Get found by thousands of local clients actively searching for your services in Lisbon & Porto."
        },
        {
            problem: "Unprofessional image hurts credibility",
            solution: "Beautiful branded booking page",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "Look professional with a custom booking page that builds trust and makes clients want to book you."
        },
        {
            problem: "Hours wasted on admin work",
            solution: "Everything on autopilot",
            problemIcon: <TrendingDown size={24} />,
            solutionIcon: <TrendingUp size={24} />,
            description: "Save 10+ hours per week. Focus on your work while LocAppoint handles scheduling, reminders, and management."
        }
    ]

    return (
        <section className="problem-solution" id="problem-solution">
            <div className="container">
                <div className="problem-solution__header">
                    <span className="section-badge">The Reality</span>
                    <h2 className="section-title">
                        Running a local business is hard. We make it easier.
                    </h2>
                    <p className="section-subtitle">
                        You didn't start your business to spend hours on admin work. 
                        Here's how we solve the biggest headaches of local service providers.
                    </p>
                </div>

                <div className="problem-solution__grid">
                    {problems.map((item, index) => (
                        <div key={index} className="solution-card">
                            {/* Problem Side */}
                            <div className="solution-card__problem">
                                <div className="solution-card__icon solution-card__icon--problem">
                                    <X size={20} />
                                </div>
                                <div className="solution-card__label solution-card__label--problem">
                                    Problem
                                </div>
                                <h3 className="solution-card__title solution-card__title--problem">
                                    {item.problem}
                                </h3>
                            </div>

                            {/* Arrow */}
                            <div className="solution-card__arrow">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                    <path d="M10 20h20m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>

                            {/* Solution Side */}
                            <div className="solution-card__solution">
                                <div className="solution-card__icon solution-card__icon--solution">
                                    <Check size={20} />
                                </div>
                                <div className="solution-card__label solution-card__label--solution">
                                    Solution
                                </div>
                                <h3 className="solution-card__title solution-card__title--solution">
                                    {item.solution}
                                </h3>
                            </div>

                            {/* Description */}
                            <p className="solution-card__description">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Stats Bar */}
                <div className="problem-solution__stats">
                    <div className="stat-item">
                        <div className="stat-item__value">80%</div>
                        <div className="stat-item__label">Fewer no-shows</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-item__value">10+</div>
                        <div className="stat-item__label">Hours saved/week</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-item__value">2x</div>
                        <div className="stat-item__label">More bookings</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-item__value">24/7</div>
                        <div className="stat-item__label">Always available</div>
                    </div>
                </div>

                <div className="problem-solution__cta">
                    <button
                        className="btn btn--primary btn--large"
                        onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Solve These Problems Today
                    </button>
                </div>
            </div>
        </section>
    )
}

export default ProblemSolution