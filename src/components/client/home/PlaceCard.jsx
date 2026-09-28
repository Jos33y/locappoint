import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import StreetGridCover from '../../business/StreetGridCover'
import { initials } from '../../business/Brand'
import { categoryLabel } from '../../../constants/categories'
import '../../../styles/client/home-page.css'

export const PlaceCard = ({ place }) => {
    const b = place.business
    return (
        <li className="lc-cl-place">
            <Link to={`/${b.slug}`} className="lc-cl-place__link">
                <span className="lc-cl-place__cover" aria-hidden="true">
                    {b.banner_url ? <img src={b.banner_url} alt="" /> : <StreetGridCover seed={b.slug} tint="azure" focus />}
                    <span className="lc-cl-place__logo">{b.logo_url ? <img src={b.logo_url} alt="" /> : initials(b.business_name)}</span>
                </span>
                <span className="lc-cl-place__body">
                    <strong>{b.business_name}</strong>
                    <span>{[categoryLabel(b.category, b.category_detail), b.city].filter(Boolean).join(' in ')}</span>
                    <small>Last time: {place.service}</small>
                </span>
                <span className="lc-cl-place__again">
                    <RotateCcw size={15} aria-hidden="true" />
                    Book again
                </span>
            </Link>
        </li>
    )
}
