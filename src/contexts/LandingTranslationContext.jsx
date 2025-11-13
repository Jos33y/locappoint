import { createContext, useContext, useState, useEffect } from 'react';

const LandingTranslationContext = createContext();

export const useLandingTranslation = () => {
  const context = useContext(LandingTranslationContext);
  if (!context) {
    throw new Error('useLandingTranslation must be used within LandingTranslationProvider');
  }
  return context;
};

export const LandingTranslationProvider = ({ children }) => {
  // Default to English, check localStorage for saved preference
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('landing-language');
    return saved || 'en';
  });

  // Save language preference
  useEffect(() => {
    localStorage.setItem('landing-language', language);
    document.documentElement.lang = language === 'pt' ? 'pt-PT' : 'en';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'pt' : 'en');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LandingTranslationContext.Provider value={value}>
      {children}
    </LandingTranslationContext.Provider>
  );
};

// Landing page translations - organized by language
const translations = {
  en: {
    // Header
    'nav.features': 'Features',
    'nav.forWhom': 'For Whom',
    'nav.whyLocAppoint': 'Why LocAppoint',
    'nav.waitlist': 'Waitlist',
    'nav.joinWaitlist': 'Join the Waitlist',
    
    // Announcement Bar
    'announcement.launching': '🚀 Launching soon in Lisbon & Porto - Join the waitlist',
    
    // Add more translations as needed...
  },
  pt: {
    // Header
    'nav.features': 'Funcionalidades',
    'nav.forWhom': 'Para Quem',
    'nav.whyLocAppoint': 'Porquê LocAppoint',
    'nav.waitlist': 'Lista de Espera',
    'nav.joinWaitlist': 'Entrar na Lista de Espera',
    
    // Announcement Bar
    'announcement.launching': '🚀 Lançamento em breve em Lisboa e Porto - Entre na lista de espera',
    
    // Add more translations as needed...
  }
};