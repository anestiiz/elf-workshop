import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ASSETS } from './assets.js';
import { levelCfg } from './data.js';

// 12 смен — путь по Северному полюсу снизу вверх.
export const MAP_LEVELS = 12;
const STEP = 132;            // расстояние между точками по вертикали, px
const PAD_BOTTOM = 150;      // отступ снизу до первой точки
const PAD_TOP = 230;         // место сверху под резиденцию

// x в процентах ширины карты — дорожка петляет змейкой
const XS = [50, 70, 74, 54, 30, 24, 42, 66, 76, 58, 36, 50];

export const ZONES = [
  { from: 1, to: 3, key: 'workshop', name: 'Цех игрушек', icon: '🧸', sky: '#1d3b5c', ground: '#e9f3fb' },
  { from: 4, to: 6, key: 'post', name: 'Почта Деда Мороза', icon: '✉️', sky: '#25335e', ground: '#eef0fb' },
  { from: 7, to: 9, key: 'reindeer', name: 'Оленья ферма', icon: '🦌', sky: '#2a2a5a', ground: '#f1eefa' },
  { from: 10, to: 11, key: 'mountains', name: 'Ледяные горы', icon: '🏔️', sky: '#1e2550', ground: '#e8f2ff' },
  { from: 12, to: 12, key: 'residence', name: 'Резиденция Деда Мороза', icon: '🏰', sky: '#161c40', ground: '#f4f0ff' },
];

// что нового на смене — значок на карте
const NEWS = {
  2: { icon: '🎅', text: 'Срочные заказы' },
  3: { icon: '❄️', text: 'Бонусы на ленте' },
  4: { icon: '↩️', text: 'Помехи' },
  5: { icon: '🌀', text: 'Детали путаются' },
  12: { icon: '🎄', text: 'Новогодняя ночь' },
};

export const levelTitle = (L) => (L === MAP_LEVELS ? 'Новогодняя ночь' : `Смена ${L}`);

// Нарисованные зоны: фон-картинка во всю ширину, точки смен — в долях картинки (x, y от верхнего края).
// Пока картинки нет — зона рисуется заглушкой (холмы и эмодзи) со старыми отступами.
const ZONE_ART = {
  workshop: {
    img: 'map_zone_workshop', ratio: 1620 / 1080,
    nodes: [[0.55, 0.80], [0.73, 0.53], [0.71, 0.26]],   // смены 1, 2, 3 — на расчищенной дорожке
    sign: [0.25, 0.905],                                     // табличка «Цех игрушек» — на снегу внизу слева
  },
};
const artOf = (z) => (ZONE_ART[z.key] && ASSETS[ZONE_ART[z.key].img] ? ZONE_ART[z.key] : null);

// раскладка карты снизу вверх: высота каждой зоны и координаты всех точек
function buildLayout(W) {
  const pos = {}, zones = {};
  let bottom = 0;            // считаем от низа карты вверх (в px), потом перевернём
  const tmp = [];
  ZONES.forEach((z, zi) => {
    const art = artOf(z);
    const n = z.to - z.from + 1;
    let h;
    if (art) {
      h = W * art.ratio;
      for (let i = 0; i < n; i++) {
        const [xf, yf] = art.nodes[i] || [0.5, 1 - (i + 0.5) / n];
        tmp.push({ L: z.from + i, x: xf * 100, fromBottom: bottom + (1 - yf) * h });
      }
    } else {
      const first = zi === 0 ? PAD_BOTTOM : STEP * 0.5;
      h = first + (n - 1) * STEP + STEP * 0.5 + (z.key === 'residence' ? PAD_TOP : 0);
      for (let i = 0; i < n; i++) tmp.push({ L: z.from + i, x: XS[(z.from + i - 1) % XS.length], fromBottom: bottom + first + i * STEP });
    }
    zones[z.key] = { fromBottom: bottom, h, art };
    bottom += h;
  });
  const H = Math.round(bottom);
  tmp.forEach((t) => { pos[t.L] = { x: t.x, y: H - t.fromBottom }; });
  Object.values(zones).forEach((zz) => { zz.top = H - zz.fromBottom - zz.h; });
  return { H, pos, zones };
}

// плавная дорожка через все точки (Catmull-Rom → кубические кривые)
function pathD(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const LABEL_SIDE = { workshop: 'left', post: 'right', reindeer: 'right', mountains: 'left' };

// декорации зон (эмодзи-заглушки, пока нет нарисованного фона карты)
const DECOR = [
  { L: 1, x: 14, dy: -30, e: '🎁', s: 38 }, { L: 2, x: 10, dy: 10, e: '🧸', s: 40 }, { L: 3, x: 16, dy: -20, e: '🪀', s: 32 },
  { L: 1, x: 30, dy: 30, e: '🌲', s: 44 }, { L: 3, x: 6, dy: 40, e: '🌲', s: 36 },
  { L: 4, x: 12, dy: -10, e: '📮', s: 40 }, { L: 5, x: 8, dy: 20, e: '✉️', s: 30 }, { L: 6, x: 14, dy: -30, e: '📦', s: 36 },
  { L: 5, x: 22, dy: -40, e: '🌲', s: 40 },
  { L: 7, x: 12, dy: -50, e: '🦌', s: 44 }, { L: 8, x: 12, dy: -20, e: '🛷', s: 40 }, { L: 9, x: 8, dy: 20, e: '🌲', s: 46 },
  { L: 9, x: 22, dy: -30, e: '🌲', s: 34 },
  { L: 10, x: 14, dy: -55, e: '🏔️', s: 54 }, { L: 11, x: 14, dy: 20, e: '⛷️', s: 34 }, { L: 11, x: 6, dy: -40, e: '❄️', s: 26 },
];

const FLAKES = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, delay: `${(i * 0.53) % 8}s`, dur: `${7 + (i % 5) * 1.6}s`, size: 3 + (i % 4) * 2,
}));

export default function WorldMap({ save, walkFrom, onPlay, onBack, onWalked }) {
  const scroller = useRef(null);
  const [W, setW] = useState(390);
  const layout = buildLayout(W);
  const H = layout.H;
  const nodePos = (L) => layout.pos[L];
  const unlocked = Math.min(save.unlocked, MAP_LEVELS);
  const allDone = save.unlocked > MAP_LEVELS;
  // эльф стоит на walkFrom и идёт к текущей смене
  const [elfAt, setElfAt] = useState(walkFrom && walkFrom < unlocked ? walkFrom : unlocked);
  const [walking, setWalking] = useState(false);
  const [toast, setToast] = useState(null);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setW(el.clientWidth);
    // прокрутка к текущей смене
    const p = nodePos(elfAt);
    el.scrollTop = Math.max(0, p.y - el.clientHeight * 0.6);
  }, []);

  useEffect(() => {
    if (elfAt === unlocked) return;
    const t1 = setTimeout(() => {
      setWalking(true);
      setElfAt(unlocked);
      const el = scroller.current;
      if (el) el.scrollTo({ top: Math.max(0, nodePos(unlocked).y - el.clientHeight * 0.6), behavior: 'smooth' });
    }, 650);
    const t2 = setTimeout(() => { setWalking(false); onWalked && onWalked(); }, 650 + 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const px = (pct) => (pct / 100) * W;
  const points = Array.from({ length: MAP_LEVELS }, (_, i) => { const p = nodePos(i + 1); return { x: px(p.x), y: p.y }; });
  const doneIdx = Math.max(0, Math.min(unlocked, MAP_LEVELS) - 1);
  const elfP = nodePos(elfAt);
  const totalStars = Object.values(save.stars || {}).reduce((a, b) => a + b, 0);

  const tapNode = (L) => {
    if (walking) return;
    if (L > unlocked) {
      setToast({ L, text: L - 1 === MAP_LEVELS ? 'Сначала пройди все смены' : `Сначала пройди смену ${L - 1}` });
      setTimeout(() => setToast(null), 1400);
      return;
    }
    onPlay(L);
  };

  return (
    <div className="map-screen">
      <header className="map-head">
        <button className="map-back" onClick={onBack} aria-label="В меню">‹</button>
        <div className="map-title">
          <small>Северный полюс</small>
          <b>Карта смен</b>
        </div>
        <div className="map-stars"><span>★</span> {totalStars} / {MAP_LEVELS * 3}</div>
      </header>

      <div className="map-scroll" ref={scroller}>
        <div className="map-world" style={{ height: H, backgroundImage: ASSETS.map_bg ? `url(${ASSETS.map_bg})` : undefined }}>
          {!ASSETS.map_bg && (
            <div className="map-zones" aria-hidden="true">
              {/* земля зон: широкие холмы во всю ширину, у каждой зоны свой оттенок */}
              <svg className="map-ground" width={W} height={H}>
                {ZONES.slice().reverse().map((z) => {
                  if (layout.zones[z.key].art) return null;
                  const topY = layout.zones[z.key].top + 20;
                  const amp = 26, w = W;
                  const d = `M 0 ${topY + amp} C ${w * 0.25} ${topY - amp}, ${w * 0.45} ${topY + amp * 1.4}, ${w * 0.7} ${topY} S ${w} ${topY - amp * 0.4}, ${w} ${topY + amp * 0.4} L ${w} ${H} L 0 ${H} Z`;
                  return <path key={z.key} d={d} className={`ground ground-${z.key}`} />;
                })}
              </svg>
              {DECOR.map((dc, i) => {
                const zk = ZONES.find((z) => dc.L >= z.from && dc.L <= z.to).key;
                if (layout.zones[zk].art) return null;
                const p = nodePos(dc.L);
                const pathX = XS[(dc.L - 1) % XS.length];
                const x = pathX > 50 ? dc.x : 100 - dc.x;   // всегда со стороны, свободной от дорожки
                return <span key={i} className="decor" style={{ left: `${x}%`, top: p.y + dc.dy, fontSize: dc.s }}>{dc.e}</span>;
              })}
              {ZONES.filter((z) => z.from !== MAP_LEVELS && !layout.zones[z.key].art).map((z) => {
                // табличка стоит на гребне холма своей зоны, со стороны, свободной от точек и подписей
                const zz = layout.zones[z.key];
                const y = z.from === 1 ? nodePos(1).y + 78 : zz.top + zz.h - 4;
                return (
                  <span key={z.key} className={`zone-label ${LABEL_SIDE[z.key]}`} style={{ top: y }}>
                    {ASSETS[`map_${z.key}`] ? <img src={ASSETS[`map_${z.key}`]} alt="" /> : <i>{z.icon}</i>}{z.name}
                  </span>
                );
              })}
              <div className="residence" style={{ top: nodePos(MAP_LEVELS).y - 215 }}>
                {ASSETS.map_residence ? <img src={ASSETS.map_residence} alt="" /> : <span>🏰</span>}
                <b>Резиденция Деда Мороза</b>
              </div>
              {FLAKES.map((f, i) => (
                <i key={i} className="flake" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.dur, width: f.size, height: f.size }} />
              ))}
            </div>
          )}

          {/* нарисованные зоны: фон + табличка с названием */}
          {ZONES.map((z) => {
            const zz = layout.zones[z.key];
            if (!zz.art) return null;
            return (
              <div key={`art-${z.key}`} className="zone-art" style={{ top: zz.top, height: zz.h }} aria-hidden="true">
                <img className="zone-bg" src={ASSETS[zz.art.img]} alt="" draggable={false} />
                {zz.art.sign && (
                  <span className="zone-sign" style={{ left: `${zz.art.sign[0] * 100}%`, top: `${zz.art.sign[1] * 100}%`, backgroundImage: ASSETS.map_sign ? `url(${ASSETS.map_sign})` : undefined }}>
                    <b>{z.name}</b>
                  </span>
                )}
              </div>
            );
          })}

          <svg className="map-path" width={W} height={H} aria-hidden="true">
            <path d={pathD(points)} className="path-base" />
            <path d={pathD(points.slice(0, doneIdx + 1))} className="path-done" />
          </svg>

          {points.map((p, i) => {
            const L = i + 1;
            const st = save.stars?.[L] || 0;
            const state = L < save.unlocked ? 'done' : L === unlocked && !allDone ? 'current' : allDone ? 'done' : 'locked';
            const cfg = levelCfg(L);
            const news = NEWS[L];
            return (
              <div key={L} className={`node node-${state} ${L === MAP_LEVELS ? 'final' : ''}`} style={{ left: p.x, top: p.y }}>
                {(() => {
                  const img = L !== MAP_LEVELS && ASSETS[`map_node_${state}`];
                  return (
                    <button onClick={() => tapNode(L)} aria-label={`${levelTitle(L)}${state === 'locked' ? ', закрыта' : ''}`}
                      className={img ? 'node-img' : ''} style={img ? { backgroundImage: `url(${img})` } : undefined}>
                      {state === 'locked'
                        ? (img ? null : <span className="lock">🔒</span>)
                        : <b>{L === MAP_LEVELS ? '🎄' : L}</b>}
                    </button>
                  );
                })()}
                {state !== 'locked' && (
                  <div className="node-stars">
                    {[0, 1, 2].map((k) => (ASSETS.ui_star
                      ? <img key={k} src={ASSETS.ui_star} alt="" className={k < st ? 'on' : ''} />
                      : <i key={k} className={k < st ? 'on' : ''}>★</i>))}
                  </div>
                )}
                {news && <span className={`node-news ${XS[i] > 50 ? 'left' : 'right'}`}><i>{news.icon}</i>{news.text}</span>}
                {state === 'current' && !walking && elfAt === L && <span className="node-play">Играть · {cfg.toys.length} игрушек</span>}
                {toast && toast.L === L && <span className="node-toast">{toast.text}</span>}
              </div>
            );
          })}

          <div className={`map-elf ${walking ? 'walking' : ''}`} style={{ left: px(elfP.x), top: elfP.y }} aria-hidden="true">
            {ASSETS.elf_happy
              ? <img src={walking ? ASSETS.elf_happy : ASSETS.elf_idle || ASSETS.elf_happy} alt="" />
              : <span>🧝</span>}
          </div>

          {allDone && (
            <div className="map-final" style={{ top: nodePos(MAP_LEVELS).y - 150 }}>
              Новый год спасён! 🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
