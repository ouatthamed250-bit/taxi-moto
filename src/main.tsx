import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker PWA (hors ligne). Enregistré après le rendu pour ne jamais
// bloquer l'affichage. ⚠️ Uniquement en production : en dev, le SW mettrait en
// cache les images → risque d'assets périmés pendant le développement.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker non enregistré :', error);
    });
  });
}
