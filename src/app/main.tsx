import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

try { if (localStorage.getItem('tk-reduce-motion') === '1') document.documentElement.classList.add('reduce-motion'); } catch { /* yok */ }

// Çevrimdışı destek: yalnızca üretim derlemesinde (geliştirmede önbellek kafa karıştırır)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
