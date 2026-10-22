import React, { useEffect, useRef, useState } from 'react';
import { ASSETS } from './assets.js';

const TIPS = [
  'Эльфы упаковывают подарки…',
  'Смазываем ленту конвейера…',
  'Пересчитываем бантики…',
  'Дед Мороз проверяет список…',
  'Греем какао для смены…',
];
const MIN_TIME = 2400;

export default function Loader({ onDone, onStart }) {
  const [real, setReal] = useState(0);
  const [shown, setShown] = useState(0);
  const [tip, setTip] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const t0 = useRef(performance.now());

  useEffect(() => {
    const urls = Object.entries(ASSETS)
      .filter(([k]) => !k.startsWith('music_bg') && !k.startsWith('map_zone') && k !== 'loader')
      .map(([, v]) => v);
    const total = urls.length + 1;
    let done = 0;
    const tick = () => { done += 1; setReal(done / total); };
    urls.forEach((u) => {
      const img = new Image();
      img.onload = tick; img.onerror = tick;
      img.src = u;
    });
    Object.entries(ASSETS).filter(([k]) => k.startsWith('map_zone')).forEach(([, v], i) => setTimeout(() => { const im = new Image(); im.src = v; }, 1500 + i * 400));
    const fonts = document.fonts && document.fonts.ready;
    (fonts ? fonts.then(tick, tick) : Promise.resolve().then(tick));
  }, []);

  useEffect(() => {
    let raf;
    const loop = () => {
      const byTime = Math.min(1, (performance.now() - t0.current) / MIN_TIME);
      setShown((s) => {
        const next = Math.max(s, Math.min(real, byTime));
        if (next >= 0.999 && !doneRef.current) {
          doneRef.current = true;
          if (onStart) onStart();
          // авто-переход: exit-анимация → onDone
          setLeaving(true);
          setTimeout(() => { if (onDone) onDone(); }, 450);
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [real, onStart, onDone]);

  useEffect(() => {
    if (doneRef.current) return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`loader-screen ${leaving ? 'leaving' : ''}`}>
      {/* фон — картинка */}
      {ASSETS.loader
        ? <img className="ls-bg" src={ASSETS.loader} alt="" draggable={false} />
        : <div className="ls-bg fallback">🧝🎁</div>}
      {/* градиенты сверху и снизу */}
      <div className="ls-grad" aria-hidden="true" />
      {/* размытие за заголовком */}
      <div className="ls-blur-top" aria-hidden="true" />

      {/* верхний блок: заголовок + подзаголовок */}
      <div className="ls-top">
        <h1 className="ls-title">Мастерская Деда Мороза</h1>
        <p className="ls-subtitle">
          Помогите эльфам собрать подарки к Новому году!
        </p>
      </div>

      {/* нижний блок: загрузка */}
      <div className="ls-bottom">
        <div className="ls-bar" aria-label={`Загрузка ${Math.round(shown * 100)}%`}>
          <div className="ls-bar-fill" style={{ width: `${shown * 100}%` }} />
        </div>
        <div className="ls-tip" key={tip}>{TIPS[tip]}</div>
      </div>
    </div>
  );
}
