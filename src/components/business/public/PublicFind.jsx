import StreetGridCover from '../StreetGridCover'
import '../../../styles/public-page.css'

export const fullAddress = (address, city) => {
    const line = address.trim()
    if (!city || line.toLowerCase().includes(city.toLowerCase())) return line
    return `${line}, ${city}`
}

export const PublicFind = ({ business, href, map = true }) => (
    <section className="lc-pub__card lc-pub__find" aria-labelledby="lc-pub-find">
        {map && <a className="lc-pub__map" href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
            <StreetGridCover seed={business.slug || business.business_name} tint="azure" focus />
        </a>}
        <div className="lc-pub__findtext">
            <h2 id="lc-pub-find" className="lc-pub__h2">Find us</h2>
            <p className="lc-pub__addr">{fullAddress(business.address, business.city)}</p>
            {business.neighbourhood?.trim() && <p className="lc-pub__area">{business.neighbourhood.trim()}</p>}
        </div>
    </section>
)
