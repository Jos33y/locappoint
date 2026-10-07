import { Link } from 'react-router-dom'
import StreetGridCover from '../../business/StreetGridCover'
import { initials } from '../../business/Brand'
import { openStatus } from '../../business/PublicPageView'
import { menuPrice } from '../../../services/business'
import { weekFromRows } from '../../../services/hours'
import { categoryLabel } from '../../../constants/categories'
import { Stars } from '../../reviews/Stars'
import { reviewCount } from '../../../services/reviews'
import { TrustLine } from '../../trust/Trust'
import '../../../styles/client/find-page.css'

export const PlaceResult = ({ place, from = '/client/search' }) => {
    const status = openStatus(weekFromRows(place.hourRows), place.timezone)
    const where = [place.neighbourhood?.trim(), place.city].filter(Boolean).join(', ')
    return (
        <li className="lc-cl-result">
            <Link to={`/${place.slug}`} state={{ from }} className="lc-cl-result__link">
                <span className="lc-cl-result__cover" aria-hidden="true">
                    {place.banner_url ? <img src={place.banner_url} alt="" loading="lazy" /> : <StreetGridCover seed={place.slug} tint="azure" focus />}
                    <span className="lc-cl-result__logo">{place.logo_url ? <img src={place.logo_url} alt="" loading="lazy" /> : initials(place.business_name)}</span>
                </span>
                <span className="lc-cl-result__body">
                    <span className="lc-cl-result__top">
                        <strong className="lc-cl-result__name">
                            {place.business_name}
                            {place.is_demo && <span className="lc-cl-result__demo">Demo</span>}
                        </strong>
                        {place.fromPrice !== null && (
                            <span className="lc-cl-result__price"><small>from</small> {menuPrice(place.fromPrice)}</span>
                        )}
                    </span>
                    {place.rating?.count ? (
                        <span className="lc-cl-result__rating">
                            <Stars value={place.rating.average} size={13} />
                            <b>{place.rating.average.toFixed(1)}</b>
                            <span>{reviewCount(place.rating.count)}</span>
                        </span>
                    ) : (
                        <span className="lc-cl-result__rating is-new">New on Locappoint</span>
                    )}
                    <TrustLine trust={place.trust} small className="lc-cl-result__trust" />
                    <span className="lc-cl-result__what">{[categoryLabel(place.category, place.category_detail), where].filter(Boolean).join(' in ')}</span>
                    {status && (
                        <span className={`lc-cl-result__status${status.open ? ' is-open' : ''}`}>
                            <i aria-hidden="true" />
                            {status.open ? `Open now, ${status.text.toLowerCase()}` : status.text}
                        </span>
                    )}
                    {place.description?.trim() && <span className="lc-cl-result__about">{place.description.trim()}</span>}
                </span>
            </Link>
        </li>
    )
}
