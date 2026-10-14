import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Header from './components/layout/Header.jsx';
import './fonts.css';
import './styles.css';
import './platform.css';

// Хедер МТС скрываем во встроенном браузере «Мой МТС» — как в лендингах платформы
const urlParams = new URLSearchParams(window.location.search);
const hideHeader = Boolean(urlParams.get('mymts_brws') || urlParams.get('brws') || urlParams.get('deeplink'));

// LP_DATA объявляется в index.html (на проде подставляет платформа)
const lpData = window.LP_DATA || {};
if (!window.LP_DATA) console.warn('[elf-workshop] LP_DATA не найден');

ReactDOM.createRoot(document.getElementById('root')).render(
  <div className={`lp-page ${hideHeader ? 'lp-page--no-header' : ''}`} data-render-mode={lpData.render_mode || 'guest'}>
    {!hideHeader && <Header />}
    <div className="lp-game">
      <App />
    </div>
  </div>
);
