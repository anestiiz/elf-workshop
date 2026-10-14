import React, { useEffect, useRef, useState } from 'react';
import { MTSButton } from './components/MTSButton/MTSButton.jsx';
import { SnowButton } from './components/SnowButton/SnowButton.jsx';
import { ASSETS } from './assets.js';

const TIPS = [
  'Эльфы упаковывают подарки…',
  'Смазываем ленту конвейера…',
  'Пересчитываем бантики…',
  'Дед Мороз проверяет список…',
  'Греем какао для смены…',
];
const MIN_TIME = 2400; // мс: загрузка не мелькает, даже если всё уже в кэше

// искры раскиданы заранее, чтобы не прыгали при перерисовке
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  left: `${8 + ((i * 37) % 84)}%`,
  top: `${6 + ((i * 53) % 60)}%`,
  delay: `${(i * 0.37) % 2.6}s`,
  size: 6 + ((i * 7) % 8),
}));

export default function Loader({ onDone, onStart }) {
  const [real, setReal] = useState(0);     // доля реально загруженных картинок
  const [shown, setShown] = useState(0);   // плавная полоска
  const [tip, setTip] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const t0 = useRef(performance.now());

  // предзагрузка всех картинок игры (и шрифтов)
  useEffect(() => {
    const urls = Object.entries(ASSETS)
      .filter(([k]) => !k.startsWith('music_bg') && k !== 'loader')
      .map(([, v]) => v);
    const total = urls.length + 1;
    let done = 0;
    const tick = () => { done += 1; setReal(done / total); };
    urls.forEach((u) => {
      const img = new Image();
      img.onload = tick; img.onerror = tick;
      img.src = u;
    });
    const fonts = document.fonts && document.fonts.ready;
    (fonts ? fonts.then(tick, tick) : Promise.resolve().then(tick));
  }, []);

  // полоска догоняет реальную загрузку, но не быстрее MIN_TIME
  useEffect(() => {
    let raf;
    const loop = () => {
      const byTime = Math.min(1, (performance.now() - t0.current) / MIN_TIME);
      setShown((s) => Math.max(s, Math.min(real, byTime)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [real]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 1400);
    return () => clearInterval(id);
  }, []);

  const ready = shown >= 0.999;
  const go = () => {
    if (!ready || leaving) return;
    if (onStart) onStart();   // звук запускаем прямо в нажатии — иначе браузер его заблокирует
    setLeaving(true);
    setTimeout(onDone, 450);
  };

  return (
    <div className={`loader ${leaving ? 'leaving' : ''} ${ready ? 'ready' : ''}`} onClick={go} role="button" aria-label="Нажми, чтобы начать">
      {ASSETS.loader
        ? <img className="loader-art" src={ASSETS.loader} alt="" draggable={false} />
        : <div className="loader-art fallback">🧝🎁</div>}
      <div className="loader-sparks" aria-hidden="true">
        {SPARKS.map((s, i) => (
          <i key={i} style={{ left: s.left, top: s.top, animationDelay: s.delay, width: s.size, height: s.size }} />
        ))}
      </div>
      <div className="loader-panel">
        <div className="eyebrow light">Мастерская Деда Мороза</div>
        <h1 className="loader-title">Эльфийский цех</h1>
        <div className="loader-action">
        {!ready ? (
          <>
            <div className="loader-bar" aria-label={`Загрузка ${Math.round(shown * 100)}%`}>
              <div style={{ width: `${shown * 100}%` }} />
            </div>
            <div className="loader-tip" key={tip}>{TIPS[tip]}</div>
          </>
        ) : (
          <SnowButton variant="wide" className="loader-go-wrap">
            <MTSButton variant="primary" size={52} fluid className="btn primary loader-go" onClick={(e) => { e.stopPropagation(); go(); }}>Нажми, чтобы начать</MTSButton>
          </SnowButton>
        )}
        </div>
      </div>
    </div>
  );
}
