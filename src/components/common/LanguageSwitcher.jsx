import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../../styles/languageSwitcher.css'


// Inline SVG flags. Emoji regional indicators render as letters on Windows.

const FlagGB = () => (
    <svg viewBox="0 0 60 30" width="20" height="14" aria-hidden="true" focusable="false">
        <clipPath id="lf-gb-clip">
            <rect width="60" height="30" />
        </clipPath>
        <g clipPath="url(#lf-gb-clip)">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#lf-gb-clip)" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
        </g>
    </svg>
)

const FlagPT = () => (
    <svg viewBox="0 0 60 40" width="20" height="14" aria-hidden="true" focusable="false">
        <rect width="60" height="40" fill="#FF0000" />
        <rect width="24" height="40" fill="#006600" />
        <circle cx="24" cy="20" r="5.5" fill="#FFE000" stroke="#FFFFFF" strokeWidth="0.6" />
    </svg>
)

const languages = [
    { code: 'en', name: 'English', Flag: FlagGB },
    { code: 'pt', name: 'Português', Flag: FlagPT },
]


const LanguageSwitcher = () => {
    const { i18n } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]
    const CurrentFlag = currentLanguage.Flag

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode)
        setIsOpen(false)
    }

    return (
        <div className="language-switcher">
            <button
                className="language-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change language">
                <span className="language-flag" aria-hidden="true">
                    <CurrentFlag />
                </span>
                <span className="language-code">{currentLanguage.code.toUpperCase()}</span>
                <svg
                    className={`language-arrow ${isOpen ? 'open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="language-overlay" onClick={() => setIsOpen(false)} />
                    <div className="language-dropdown">
                        {languages.map((lang) => {
                            const Flag = lang.Flag
                            return (
                                <button
                                    key={lang.code}
                                    className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
                                    onClick={() => changeLanguage(lang.code)}>
                                    <span className="language-flag" aria-hidden="true">
                                        <Flag />
                                    </span>
                                    <span className="language-name">{lang.name}</span>
                                    {i18n.language === lang.code && (
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M13.3 4.7L6 12L2.7 8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

export default LanguageSwitcher
