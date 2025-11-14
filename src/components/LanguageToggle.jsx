import { useLandingTranslation } from "../hooks/useLandingTranslation";

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLandingTranslation();

  return (
    <button
      className="language-toggle"
      onClick={toggleLanguage}
      aria-label={language === 'en' ? 'Switch to Portuguese' : 'Switch to English'}
      title={language === 'en' ? 'Português' : 'English'}
    >
      <span className="language-toggle__flag">
        {language === 'en' ? '🇬🇧' : '🇵🇹'}
      </span>
      <span className="language-toggle__text">
        {language === 'en' ? 'PT' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageToggle;