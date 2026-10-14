import React, { useLayoutEffect, useRef, useState } from 'react';

// Гирлянда с пушистой мишурой поверх карточки: идёт по верхнему краю провисами
// и заходит на боковые стороны. Рисуется SVG под реальную ширину карточки.
const M = 16;          // насколько гирлянда выходит за края карточки
const SIDE = 96;       // как далеко свисает по бокам
const TOP_Y = -12;      // линия крючков над верхним краем карточки
const SAG = 8;         // провис между крючками
const COLORS = ['#e8352c', '#ffd23f', '#2fb35a'];   // классика: красный, золотой, зелёный

function build(w) {
  const pts = [];
  const push = (x, y) => pts.push([x + M, y + M]);
  // левый бок: снизу вверх, лёгкая волна
  for (let y = SIDE; y >= 12; y -= 3) push(-4 + 2.2 * Math.sin(y / 14), y);
  // левый угол
  for (let a = 0; a <= 1; a += 0.1) push(-4 + 10 * a * a, 12 - (12 - TOP_Y) * Math.sin(a * Math.PI / 2));
  // верх: провисы между крючками
  const x0 = 6, x1 = w - 6;
  const n = Math.max(3, Math.round((x1 - x0) / 78));
  const span = (x1 - x0) / n;
  const swags = [];
  for (let i = 0; i < n; i++) {
    for (let t = 0; t <= 1; t += 0.04) push(x0 + span * (i + t), TOP_Y + SAG * Math.sin(Math.PI * t));
    swags.push(x0 + span * (i + 0.5));
  }
  // правый угол и правый бок сверху вниз
  for (let a = 0; a <= 1; a += 0.1) push(w + 4 - 10 * (1 - a) * (1 - a), TOP_Y + (12 - TOP_Y) * Math.sin(a * Math.PI / 2));
  for (let y = 12; y <= SIDE; y += 3) push(w + 4 - 2.2 * Math.sin(y / 14), y);
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');
  // лампочки: в нижней точке каждого провиса, между ними, и по бокам
  const bulbs = [];
  swags.forEach((sx, i) => {
    bulbs.push({ x: sx + M, y: TOP_Y + SAG + M, r: 0 });
    if (i < n - 1) bulbs.push({ x: x0 + span * (i + 1) + M, y: TOP_Y + M, r: 0, small: true });
  });
  for (let y = 30; y <= SIDE - 6; y += 30) {
    bulbs.push({ x: -4 + 2.2 * Math.sin(y / 14) + M, y: y + M, r: 34 });
    bulbs.push({ x: w + 4 - 2.2 * Math.sin(y / 14) + M, y: y + M, r: -34 });
  }
  // мишура: пушистые «иголки» во все стороны вокруг провода, золото с красным и серебром вперемешку
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const PAL = ['#f8cf4a', '#f3c03a', '#e7a82a', '#ffe58a', '#d9971f', '#fff1b8'];   // только золото, разные оттенки
  const strands = [];
  pts.forEach(([x, y], i) => {
    if (i % 1) return;
    for (let k = 0; k < 11; k++) {
      const a = rnd() * Math.PI * 2, L = 7 + rnd() * 10;
      strands.push({ x, y, dx: Math.cos(a) * L, dy: Math.sin(a) * L, c: PAL[Math.floor(rnd() * PAL.length)] });
    }
  });
  // искорки на мишуре
  const sparks = pts.filter((_, i) => i % 9 === 4).map(([x, y], i) => ({ x: x + ((i * 7) % 9) - 4, y: y + ((i * 5) % 9) - 4, d: (i * 0.37) % 2.4 }));
  return { d, bulbs, sparks, strands };
}

export function Garland() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const card = ref.current && ref.current.parentElement;
    if (!card) return;
    const upd = () => setW(card.clientWidth);
    upd();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null;
    if (ro) ro.observe(card);
    return () => ro && ro.disconnect();
  }, []);
  if (!w) return <span ref={ref} className="card-garland" aria-hidden="true" />;
  const { d, bulbs, sparks, strands } = build(w);
  return (
    <span ref={ref} className="card-garland" aria-hidden="true">
      <svg width={w + 2 * M} height={SIDE + 2 * M + 20} viewBox={`0 0 ${w + 2 * M} ${SIDE + 2 * M + 20}`}>
        <defs>
          <radialGradient id="gl-glass" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".25" stopColor="#fff" stopOpacity=".15" />
            <stop offset="1" stopColor="#000" stopOpacity=".25" />
          </radialGradient>
          <filter id="gl-blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        {/* мишура */}
        <path d={d} fill="none" stroke="#c48f1e" strokeWidth="14" strokeLinejoin="round" />
        <g strokeWidth="1.8" strokeLinecap="round">
          {strands.map((t, i) => (
            <line key={i} x1={t.x.toFixed(1)} y1={t.y.toFixed(1)} x2={(t.x + t.dx).toFixed(1)} y2={(t.y + t.dy).toFixed(1)} stroke={t.c} />
          ))}
        </g>
        {sparks.map((s, i) => (
          <circle key={i} className="gl-spark" cx={s.x} cy={s.y} r="1.6" fill="#fff" style={{ animationDelay: `${s.d}s` }} />
        ))}
        {/* лампочки */}
        {bulbs.map((b, i) => {
          const c = COLORS[i % COLORS.length];
          const s = b.small ? 0.72 : b.r ? 1 : 0.88;
          return (
            <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r}) scale(${s})`}>
              <circle className="gl-glow" cx="0" cy="18" r="13" fill={c} filter="url(#gl-blur)" style={{ animationDelay: `${(i % 3) * 0.5}s` }} />
              <rect x="-4" y="1" width="8" height="7" rx="2" fill="#d8a93a" stroke="#8a6414" strokeWidth=".8" />
              <path d="M0 7 C 9 9, 10 22, 0 30 C -10 22, -9 9, 0 7 Z" fill={c} />
              <path d="M0 7 C 9 9, 10 22, 0 30 C -10 22, -9 9, 0 7 Z" fill="url(#gl-glass)" />
              <ellipse cx="-3" cy="14" rx="1.8" ry="4" fill="#fff" opacity=".8" />
            </g>
          );
        })}
      </svg>
    </span>
  );
}
