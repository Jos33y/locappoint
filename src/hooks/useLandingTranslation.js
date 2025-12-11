import { useContext } from 'react';
import { LandingTranslationContext } from '../contexts/LandingTranslationContext'

export const useLandingTranslation = () => {
  const context = useContext(LandingTranslationContext);
  if (!context) {
     // Return fallback if used outside provider
        console.warn('useLandingTranslation: No provider found, using fallback')
        return {
            language: 'en',
            toggleLanguage: () => {},
            setLanguage: () => {},
            t: (key) => key,
            translations: {}
        }
  }
  return context;
};  