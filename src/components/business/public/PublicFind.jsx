import '../../../styles/public-page.css'

export const fullAddress = (address, city) => {
    const line = address.trim()
    if (!city || line.toLowerCase().includes(city.toLowerCase())) return line
    return `${line}, ${city}`
}

// The address in words with a way to get there; no drawn map standing in for a real one.
// online: a business that only meets clients by video call has no door to find, so no directions.
export const PublicFind = ({ business, href, online = false }) => (
    <section className="lc-pub__card lc-pub__find" aria-labelledby="lc-pub-find">
        <div className="lc-pub__findtext">
            <h2 id="lc-pub-find" className="lc-pub__h2">{online ? 'Where' : 'Find us'}</h2>
            {online ? (
                <>
                    <p className="lc-pub__addr">Online, by video call</p>
                    <p className="lc-pub__area">The link comes with your booking.</p>
                </>
            ) : (
                <>
                    <p className="lc-pub__addr">{fullAddress(business.address, business.city)}</p>
                    {business.neighbourhood?.trim() && <p className="lc-pub__area">{business.neighbourhood.trim()}</p>}
                    {href && <a className="lc-pub__route" href={href} target="_blank" rel="noopener noreferrer">Get directions</a>}
                </>
            )}
        </div>
    </section>
)
