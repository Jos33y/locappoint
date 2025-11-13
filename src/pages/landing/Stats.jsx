const Stats = () => {
    const stats = [
        { value: "100+", label: "Businesses Waiting", icon: "🏢" },
        { value: "10+", label: "Service Categories", icon: "📋" },
        { value: "2", label: "Cities Launching", icon: "📍" },
        { value: "0€", label: "Setup Cost", icon: "💰" }
    ]

    return (
        <section className="stats">
            <div className="container">
                <div className="stats__grid">
                    {stats.map((stat, index) => (
                        <div key={index} className="stats__item">
                            <div className="stats__icon">{stat.icon}</div>
                            <div className="stats__content">
                                <div className="stats__value">{stat.value}</div>
                                <div className="stats__label">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Stats