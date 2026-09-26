import { NavLink } from 'react-router-dom'
import '../../styles/business/hubnav.css'

const HubNav = ({ hub }) => (
    <nav className="biz-hubnav" aria-label={hub.label}>
        <div className="biz-hubnav__track">
            {hub.pages.map((page) => (
                <NavLink key={page.to} to={page.to} className="biz-hubnav__tab">
                    <span className="biz-hubnav__label">{page.label}</span>
                    {page.planned && <span className="biz-soon biz-hubnav__soon">Soon</span>}
                </NavLink>
            ))}
        </div>
    </nav>
)

export default HubNav
