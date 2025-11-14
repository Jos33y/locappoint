import { useContext } from 'react';
import { LandingTranslationContext } from '../context_definition/LandingTranslationContextDefinition';

export const useLandingTranslation = () => {
  const context = useContext(LandingTranslationContext);
  if (!context) {
    throw new Error('useLandingTranslation must be used within LandingTranslationProvider');
  }
  return context;
}; 