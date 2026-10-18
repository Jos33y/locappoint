// Before geo1 every screen followed a city; it now follows a country. Kept so nothing that imports
// useCity breaks: it is useCountry.
export { useCountry as useCity } from './useCountry'
