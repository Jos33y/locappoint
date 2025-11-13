import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../../styles/languageSwitcher.css'

const LanguageSwitcher = () => {
    const { i18n } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    const languages = [
        { code: 'en', name: 'English', flag: '\u{1F1EC}\u{1F1E7}' }, // 🇬🇧
        { code: 'pt', name: 'Português', flag: '\u{1F1F5}\u{1F1F9}' } // 🇵🇹
    ]

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

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
                <span className="language-flag" role="img" aria-label={currentLanguage.name}>
                    {currentLanguage.flag}
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
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
                                onClick={() => changeLanguage(lang.code)}
                            >
                                <span className="language-flag" role="img" aria-label={lang.name}>
                                    {lang.flag}
                                </span>
                                <span className="language-name">{lang.name}</span>
                                {i18n.language === lang.code && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M13.3 4.7L6 12L2.7 8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default LanguageSwitcher