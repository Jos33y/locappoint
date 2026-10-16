import CityPattern from './CityPattern'
import BusinessTile from './BusinessTile'
import { worldOf } from './world'
import './face.css'

// How a business looks wherever it appears (doc 30): its own cover photo and logo when it has them;
// until then its city's pattern as the cover and its tile as the logo, never initials or a stock drawing.

export const BusinessCover = ({ business, lazy = false }) => (business.banner_url
    ? <img className="lc-face" src={business.banner_url} alt="" loading={lazy ? 'lazy' : undefined} />
    : <CityPattern city={worldOf(business)} centred className="lc-face" />)

export const BusinessMark = ({ business, lazy = false }) => (business.logo_url
    ? <img className="lc-face" src={business.logo_url} alt="" loading={lazy ? 'lazy' : undefined} />
    : <BusinessTile name={business.business_name?.trim() || 'Your business'} city={worldOf(business)} className="lc-face" />)
