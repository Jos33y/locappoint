import { Link, useLocation } from 'react-router-dom'
import AppHeader from '../../../components/common/AppHeader'
import AppFooter from '../../../components/common/Appfooter'
import { LEGAL_UPDATED } from '../../../constants/legalEntity'
import '../../../styles/app/home.css'
import '../../../styles/app/legal.css'

export const LEGAL_PAGES = [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/legal/cookies', label: 'Cookie Policy' },
    { to: '/legal/notice', label: 'Legal Notice' },
    { to: '/legal/dpa', label: 'Data Processing Agreement' },
    { to: '/legal/subprocessors', label: 'Sub-processors' },
    { to: '/legal/ranking', label: 'How Browse ranks businesses' },
]

const LegalLayout = ({ title, lede, sections }) => {
    const { pathname } = useLocation()
    const related = LEGAL_PAGES.filter((page) => page.to !== pathname)

    return (
        <div className="legal-page">
            <AppHeader />

            <main>
                <section className="loca-section loca-section--s0 legal__hero">
                    <div className="container container--legal">
                        <span className="loca-eyebrow">Legal</span>
                        <h1 className="legal__title">{title}</h1>
                        <p className="legal__meta">Last updated: {LEGAL_UPDATED}</p>
                        <p className="legal__lede">{lede}</p>
                    </div>
                </section>

                <section className="loca-section loca-section--s0 legal__body">
                    <div className="container container--legal">
                        {sections.length > 2 && (
                            <nav className="legal__toc" aria-label="Table of contents">
                                <p className="legal__toc-label">On this page</p>
                                <ol className="legal__toc-list">
                                    {sections.map((section, i) => (
                                        <li key={section.id}>
                                            <a href={`#${section.id}`}>
                                                <span className="legal__toc-num">{String(i + 1).padStart(2, '0')}</span>
                                                <span>{section.label}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        )}

                        <article className="legal__article">
                            {sections.map((section, i) => (
                                <section key={section.id} id={section.id} className="legal__section">
                                    <h2 className="legal__h2">
                                        <span className="legal__num">{String(i + 1).padStart(2, '0')}</span>
                                        {section.label}
                                    </h2>
                                    {section.body}
                                </section>
                            ))}
                        </article>

                        <nav className="legal__related" aria-label="Other legal documents">
                            <p className="legal__toc-label">Other legal documents</p>
                            <ul className="legal__related-list">
                                {related.map((page) => (
                                    <li key={page.to}><Link to={page.to}>{page.label}</Link></li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </section>
            </main>

            <AppFooter />
        </div>
    )
}

export default LegalLayout
