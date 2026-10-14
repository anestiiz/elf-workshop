import React, { useEffect, useRef, useState } from 'react';
import { MTSButton } from './components/MTSButton/MTSButton.jsx';
import { PARTS, TOYS, BOX_COLORS, SHIFT_SECONDS, SPEED_STEP_SECONDS, levelCfg } from './data.js';
import { sfx, alarm, bimbom, buzz, setMuted, isMuted, music } from './sound.js';
import { TUT, TUT_JUNK_STEP } from './tutorial.js';
import Loader from './Loader.jsx';
import WorldMap, { MAP_LEVELS, levelTitle } from './WorldMap.jsx';
import { ASSETS } from './assets.js';
music.init(ASSETS.music_bg, ASSETS.music_bg_fallback);
import { Pause, VolumeMax, VolumeMute, Speed } from './icons.jsx';
import { SnowButton } from './components/SnowButton/SnowButton.jsx';

/* ───────────────── сохранение ───────────────── */
const SAVE_KEY = 'elf-workshop-v3';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && s.unlocked) return s;
  } catch {}
  return { unlocked: 1, stars: {}, best: {}, muted: false };
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }

/* ───────────────── утилиты ───────────────── */
let UID = 1;
const uid = () => UID++;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtTime = (s) => {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};
const comboMult = (c) => 1 + Math.min(3, Math.floor(c / 3));
const TOY_BY_ID = Object.fromEntries(TOYS.map((t) => [t.id, t]));

// входят ли детали parts в рецепт need (с учётом повторов)
function fits(parts, need) {
  const left = [...need];
  for (const p of parts) {
    const i = left.indexOf(p);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

/* картинка, если есть в assets/, иначе эмодзи */
function Sprite({ name, emoji, className = '' }) {
  const src = ASSETS[name];
  if (src) return <img className={`sprite ${className}`} src={src} alt="" draggable={false} />;
  return <span className={`sprite emoji ${className}`}>{emoji}</span>;
}
const PartSprite = ({ id, className }) =>
  <Sprite name={`${PARTS[id].junk ? 'junk' : 'part'}_${id}`} emoji={PARTS[id].e} className={className} />;
const ToySprite = ({ id, className }) =>
  <Sprite name={`toy_${id}`} emoji={TOY_BY_ID[id].e} className={className} />;

function GiftBox({ color, open }) {
  const name = open ? 'box_open' : `box_${color}`;
  if (ASSETS[name]) return <img className="sprite box-img" src={ASSETS[name]} alt="" draggable={false} />;
  return (
    <span className={`cssbox c-${color} ${open ? 'open' : ''}`}>
      <i className="lid" /><i className="body" /><i className="ribbon" /><i className="knot" />
    </span>
  );
}

/* гора подарков за эльфом: x — от центра, y — вверх от пола, s — масштаб */
const OPEN_SPOT = { x: -74, y: 0, s: 1.2 };   // здесь всегда стоит открытая пустая коробка
const PILE = [
  { x: 66, y: 0, s: 1.05 }, { x: -38, y: 6, s: 1 }, { x: 40, y: 4, s: 1.1 }, { x: 0, y: 8, s: 1.15 },
  { x: -56, y: 34, s: 0.95 }, { x: 54, y: 32, s: 1 }, { x: -24, y: 40, s: 1 }, { x: 24, y: 42, s: 0.95 },
  { x: -42, y: 64, s: 0.9 }, { x: 40, y: 62, s: 0.95 }, { x: -8, y: 72, s: 1 }, { x: 18, y: 96, s: 0.85 }, { x: -22, y: 98, s: 0.85 }, { x: 0, y: 120, s: 0.8 },
];

/* ───────── позиции движущихся объектов (общие для React и быстрого кадра) ───────── */
const flyerTf = (f) => {
  const p = Math.min(1, f.p), e = 1 - Math.pow(1 - p, 3);
  const x = f.x0 + (f.x1 - f.x0) * e;
  const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(p * Math.PI) * (f.arc || 60);
  return `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%,-50%) scale(${(1.1 - 0.4 * p).toFixed(3)})`;
};
const partTf = (p) => `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.rot.toFixed(0)}deg)`;
const partOp = (p) => Math.max(0, 1 - p.age / p.life).toFixed(2);
const floatTf = (f) => `translate3d(${f.x.toFixed(1)}px, ${(f.y - f.age * 40).toFixed(1)}px, 0) translate(-50%,-50%)`;
const floatOp = (f) => { const L = f.life || 1.1; return (f.age < L - 0.35 ? 1 : Math.max(0, (L - f.age) / 0.35)).toFixed(2); };
const handTf = (h) => `translate3d(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px, 0) translate(-50%,-60%)`;
const vignetteOf = (G) => {
  const beatPulse = Math.exp(-(G.t - G.beatAt) * 5);
  return G.danger > 0 ? (0.3 + 0.7 * G.danger) * (0.45 + 0.55 * beatPulse) : 0;
};

/* ───────────────── состояние игры ───────────────── */
const emptySlot = () => ({ state: 'build', parts: [], toy: null, flash: 0 });

function makeGame(L, demo = false, tutorial = false) {
  const cfg = levelCfg(L);
  if (tutorial) cfg.travel = 9;
  return {
    demo, L, cfg,
    t: 0,
    timeLeft: SHIFT_SECONDS,
    stage: 0,
    belts: [{ items: [], spawnIn: 0.1 }, { items: [], spawnIn: 0.8 }],
    beltOff: 0,
    orders: [],
    nextOrderAt: 1.0,
    tut: tutorial ? { step: 0, at: 0 } : null,
    slots: [emptySlot(), emptySlot(), emptySlot()],
    gifts: [],
    hand: null,          // деталь в руке: { kind, x, y, mode: 'drag'|'held', from }
    hover: -1,           // над какой ячейкой тащим
    trashMode: false,
    score: 0, combo: 0, maxCombo: 0, delivered: 0, failed: 0,
    danger: 0, nextBeat: 0, beatAt: -10,
    flyers: [], parts: [], floats: [],
    elf: { text: demo || tutorial ? '' : 'Поехали!', until: demo || tutorial ? 0 : 1.8, mood: 'happy' },
    banner: null,
    lastSec: SHIFT_SECONDS,
    freezeUntil: 0, reverseUntil: 0,
    nextBonusAt: cfg.bonusEvery ? 12 : Infinity,
    nextHazardAt: cfg.hazardEvery ? 26 : Infinity,
    bonusFlip: 0, hadUrgent: false,
  };
}

/* первое знакомство с новинкой — игра встаёт на паузу и объясняет */
const INTROS = {
  urgent: { icon: '🎅', title: 'Срочный заказ!', text: 'Золотая карточка — заказ лично от Деда Мороза. Времени на него меньше, зато награда двойная.' },
  freeze: { icon: '❄️', title: 'Волшебная снежинка', text: 'Нажми на снежинку на ленте — все заказы замёрзнут на 5 секунд, и время остановится.' },
  magnet: { icon: '🧲', title: 'Магнит', text: 'Нажми на магнит — он сам притянет с ленты нужные детали и разложит их по ячейкам.' },
  reverse: { icon: '↩️', title: 'Лента сломалась!', text: 'Иногда лента пару секунд едет назад. Не паникуй — детали скоро поедут обратно.' },
  shuffle: { icon: '🌀', title: 'Детали перепутались!', text: 'Озорник перемешал всё, что едет по ленте. Смотри внимательно, что берёшь.' },
};

function addOrder(g, toy, leftFrac = 1, urgent = false) {
  const patience = g.cfg.patience * (urgent ? 0.6 : 1);
  g.orders.push({
    uid: uid(), toy, left: patience * leftFrac, patience,
    state: 'active', endAt: 0, born: g.t, urgent,
  });
  if (urgent) {
    alarm.urgent();
    g.banner = { text: 'Срочно от Деда Мороза!', t: g.t, gold: true };
    say(g, 'Срочный заказ!', 'panic', 1.3);
  } else {
    bimbom();
    say(g, 'Новый заказ!', 'happy', 1.1);
  }
}

function neededParts(g) {
  const needed = [];
  g.orders.filter((o) => o.state === 'active').forEach((o) => needed.push(...o.toy.need));
  g.slots.forEach((s) => s.parts.forEach((p) => { const i = needed.indexOf(p); if (i >= 0) needed.splice(i, 1); }));
  return needed;
}

function pickKind(g) {
  const cfg = g.cfg;
  if (g.demo) return pick(Object.keys(PARTS).filter((k) => !PARTS[k].coal && !PARTS[k].bonus));
  if (g.tut) {
    const id = TUT[g.tut.step].id;
    const need = neededParts(g);
    return need.length && (id === 'build' || Math.random() < 0.85) ? pick(need) : pick(['star', 'bow', 'candy_cane', 'glass_ball', 'gold_cap', 'paint']);
  }
  if (Math.random() < cfg.junk) {
    const junk = Object.keys(PARTS).filter((k) => PARTS[k].junk && (cfg.coal || !PARTS[k].coal));
    return pick(junk);
  }
  const pool = [...new Set(cfg.toys.flatMap((t) => t.need))];
  // чего не хватает активным заказам (за вычетом уже лежащего в ячейках)
  const needed = [];
  g.orders.filter((o) => o.state === 'active').forEach((o) => needed.push(...o.toy.need));
  g.slots.forEach((s) => s.parts.forEach((p) => { const i = needed.indexOf(p); if (i >= 0) needed.splice(i, 1); }));
  const onBelt = {};
  g.belts.forEach((b) => b.items.forEach((it) => { onBelt[it.kind] = (onBelt[it.kind] || 0) + 1; }));
  const want = needed.filter((k) => (onBelt[k] || 0) < 2);
  if (want.length && Math.random() < 0.6) return pick(want);
  return pick(pool);
}

function evalSlot(g, s) {
  const slot = g.slots[s];
  if (slot.parts.some((p) => PARTS[p].junk)) { slot.state = 'junk'; return 'junk'; }
  const cand = g.cfg.toys.filter((t) => fits(slot.parts, t.need));
  if (!cand.length) { slot.state = 'junk'; return 'junk'; }
  if (slot.parts.length === 3) { slot.state = 'toy'; slot.toy = cand[0].id; return 'toy'; }
  return 'build';
}

// подсказка: во что может превратиться ячейка (только среди текущих заказов)
function slotHint(g, slot) {
  if (slot.state !== 'build' || !slot.parts.length) return null;
  const ids = [...new Set(g.orders.filter((o) => o.state === 'active').map((o) => o.toy.id))];
  const c = ids.filter((id) => fits(slot.parts, TOY_BY_ID[id].need));
  return c.length === 1 ? c[0] : null;
}

function say(g, text, mood = 'happy', dur = 1.4) { g.elf = { text, mood, until: g.t + dur }; }

/* ───────────────── компонент ───────────────── */
// полосы одной планки ленты в долях шага (снято с belt_tile.png): тёмный зазор, блик, светлая грань
const RIB_BANDS = [
  { at: 0.36, len: 0.2, c: '#313234' },
  { at: 0.62, len: 0.09, c: '#aeb0b4' },
  { at: 0.71, len: 0.12, c: '#8b8e92' },
];
// сдвиг пунктира на изгибе так, чтобы планки продолжали прямой участок без скачка
function ribOffset(gm, beltPx, at) {
  const P = gm.P, v = (gm.a - (beltPx || 0) - 1 - at * P) % P;
  return v < 0 ? v + P : v;
}

export default function App() {
  const [save, setSave] = useState(loadSave);
  const [screen, setScreen] = useState('loading'); // loading | menu | play | paused | result
  const [result, setResult] = useState(null);
  const [, setFrame] = useState(0);
  const [muted, setMutedState] = useState(() => { const m = loadSave().muted; setMuted(m); return m; });

  const g = useRef(makeGame(1, true));
  if (typeof window !== 'undefined') window.__elfGame = g; // для отладки из консоли
  const saveRef = useRef(save); saveRef.current = save;
  const screenRef = useRef(screen); screenRef.current = screen;
  const root = useRef(null);
  const refs = useRef({});
  const els = useRef({ items: new Map(), flyers: new Map(), parts: new Map(), floats: new Map() });
  const bindEl = (map, key) => (el) => { if (el) els.current[map].set(key, el); else els.current[map].delete(key); };
  const consumed = useRef(false);
  const setRef = (k) => (el) => { if (el) refs.current[k] = el; else delete refs.current[k]; };

  const rootRect = () => root.current.getBoundingClientRect();
  const center = (el) => {
    const r = el.getBoundingClientRect(); const R = rootRect();
    return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2 };
  };
  /* путь ленты: прямо вниз → S-изгиб к центру → вниз параллельно соседней ленте */
  const beltGeom = (bi) => {
    const tr = refs.current[`track-${bi}`], bl = refs.current[`belt-${bi}`], cen = refs.current.center;
    if (!tr || !bl || !cen || !root.current) return null;
    const R = root.current.getBoundingClientRect(), t = tr.getBoundingClientRect(), b = bl.getBoundingClientRect(), c = cen.getBoundingClientRect();
    const Lx = t.left + t.width / 2 - R.left, top = t.top - R.top, y0 = t.bottom - R.top;
    const Cx = c.left + c.width / 2 - R.left;
    const dir = Cx > Lx ? 1 : -1;
    const bw = b.width;
    const Ex = Cx - dir * bw * 0.49;              // ленты внизу идут рядом, не сливаясь
    const D = Math.abs(Ex - Lx);
    let r = Math.max(bw * 0.62, 40);
    if (D > 2 * r) r = D / 2;
    const th = Math.acos(1 - D / (2 * r));       // угол поворота каждой дуги
    const a = y0 - top, arc = r * th;
    const yEnd = y0 + 2 * r * Math.sin(th);
    // деталь видна, только когда целиком ниже верхнего края люка — иначе она торчит над крышкой
    const hop = bl.querySelector('.hopper-img, .hopper');
    const hopTop = hop ? hop.getBoundingClientRect().top : t.top;
    const showY = 34 - (t.top - hopTop);
    const P = ASSETS.belt_tile ? t.width / 12 : 18;   // шаг планок ленты, как в belt_tile (12 планок на плитку)
    return { showY, P, Lx, top, y0, Cx, Ex, dir, r, th, a, arc, yEnd, total: a + 2 * arc + Math.max(0, R.height - yEnd) + 60, ox: b.left - R.left, oy: b.top - R.top, bw, H: R.height };
  };
  const pathPoint = (gm, s) => {
    const { Lx, top, y0, dir, r, th, a, arc, Ex, yEnd } = gm;
    if (s <= a) return { x: Lx, y: top + s };
    s -= a;
    if (s <= arc) { const f = s / r; return { x: Lx + dir * r * (1 - Math.cos(f)), y: y0 + r * Math.sin(f) }; }
    s -= arc;
    if (s <= arc) {
      const g2 = th - s / r;
      return { x: Lx + dir * r * (2 * (1 - Math.cos(th)) - (1 - Math.cos(g2))), y: y0 + r * (2 * Math.sin(th) - Math.sin(g2)) };
    }
    s -= arc;
    return { x: Ex, y: yEnd + s };
  };

  const addFloat = (x, y, text, cls = '', life = 1.1) => g.current.floats.push({ id: uid(), x, y, text, cls, age: 0, life });
  const burst = (x, y, n = 22, palette = ['#f4c04e', '#e2483f', '#4fbf7a', '#fff3d6', '#6ec6f0']) => {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 140 + Math.random() * 240;
      g.current.parts.push({
        id: uid(), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, c: pick(palette),
        age: 0, life: 0.8 + Math.random() * 0.5, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 720, w: 5 + Math.random() * 5,
      });
    }
  };
  const slotFlash = (s, kind) => { g.current.slots[s].flash = g.current.t; g.current.slots[s].flashKind = kind; };

  const [intro, setIntro] = useState(null);
  // true — если показали объяснение (игра на паузе до «Понятно»)
  const introduce = (key) => {
    const sv = saveRef.current;
    if (g.current.tut || (sv.seen && sv.seen[key])) return false;
    const next = { ...sv, seen: { ...(sv.seen || {}), [key]: true } };
    saveRef.current = next; setSave(next); writeSave(next);
    if (g.current.hand) returnHand();
    setIntro(INTROS[key]); setScreen('intro');
    return true;
  };

  /* награда над эльфом */
  const rewardAboveElf = (text, sub, cls = '') => {
    const el = refs.current.elf;
    if (!el) return;
    const R = rootRect(), r = el.getBoundingClientRect();
    const x = r.left - R.left + r.width / 2;
    const y = Math.max(40, r.top - R.top + r.height * 0.12);
    addFloat(x, y, text, `reward ${cls}`, 1.7);
    if (sub) addFloat(x, y + 34, sub, 'reward-sub', 1.7);
  };

  /* ───────── бонусы и помехи ───────── */
  const activateBonus = (kind, pos) => {
    const G = g.current;
    burst(pos.x, pos.y, 18, kind === 'freeze' ? ['#bfe9ff', '#ffffff', '#7fd0ff'] : ['#ff5a4a', '#c9d2dc', '#ffffff']);
    if (kind === 'freeze') {
      G.freezeUntil = G.t + 5;
      G.banner = { text: 'Время заморожено!', t: G.t, ice: true };
      say(G, 'Брр, успеваем!', 'happy', 1.4);
      alarm.freeze(); buzz(30);
    } else if (kind === 'magnet') {
      alarm.magnet(); buzz(30);
      const active = G.orders.filter((o) => o.state === 'active');
      const sim = G.slots.map((s) => (s.state === 'build' ? [...s.parts] : null));
      const okFor = (parts) => active.some((o) => fits(parts, o.toy.need));
      let pulled = 0;
      const cands = [];
      G.belts.forEach((b, bi) => b.items.forEach((it) => { if (it.y > 0 && !PARTS[it.kind].junk && !PARTS[it.kind].bonus) cands.push({ it, bi }); }));
      cands.sort((p1, p2) => p2.it.y - p1.it.y);
      for (const { it, bi } of cands) {
        if (pulled >= 3) break;
        let best = -1;
        sim.forEach((parts, s) => {
          if (!parts || parts.length >= 3 || !okFor([...parts, it.kind])) return;
          if (best < 0 || parts.length > sim[best].length) best = s;
        });
        if (best < 0) continue;
        sim[best].push(it.kind);
        const gm = G.geom && G.geom[bi];
        const from = gm ? pathPoint(gm, it.y) : pos;
        G.belts[bi].items = G.belts[bi].items.filter((x) => x !== it);
        const slotEl = refs.current[`slot-${best}`];
        const to = slotEl ? center(slotEl) : pos;
        const s = best, k = it.kind;
        G.flyers.push({ id: uid(), node: <PartSprite id={k} />, x0: from.x, y0: from.y, x1: to.x, y1: to.y, p: 0, dur: 0.45, arc: 60,
          land: () => {
            // пока деталь летела, игрок мог положить в ячейку своё — тогда не портим её браком,
            // а ищем другую подходящую ячейку или возвращаем деталь на ленту
            const ok = (i) => { const sl = G.slots[i]; return sl.state === 'build' && sl.parts.length < 3 && G.cfg.toys.some((t) => fits([...sl.parts, k], t.need)); };
            const tgt = ok(s) ? s : [0, 1, 2].find(ok);
            if (tgt !== undefined) applyPart(tgt, k);
            else G.belts[bi].items.push({ uid: uid(), kind: k, y: Math.max(40, it.y), x: 0, spin: 0 });
          } });
        pulled++;
      }
      G.banner = { text: pulled ? 'Магнит!' : 'Нужных деталей нет', t: G.t };
      if (!pulled) addFloat(pos.x, pos.y - 30, 'Нечего притянуть', 'muted');
    }
  };

  const startHazard = (type) => {
    const G = g.current;
    if (type === 'reverse') {
      G.reverseUntil = G.t + 2.6;
      G.banner = { text: 'Лента едет назад!', t: G.t, bad: true };
      say(G, 'Ой-ой!', 'panic', 1.3);
      alarm.reverse(); buzz(60);
    } else if (type === 'shuffle') {
      const pool = [...new Set(G.cfg.toys.flatMap((t) => t.need))];
      G.belts.forEach((b, bi) => b.items.forEach((it) => {
        if (PARTS[it.kind].bonus) return;
        it.kind = Math.random() < 0.15 ? 'chocolate' : pick(pool);
        const gm = G.geom && G.geom[bi];
        if (gm && it.y > 0) { const pt = pathPoint(gm, it.y); burst(pt.x, pt.y, 6, ['#b38cff', '#ffffff', '#6fe0ff']); }
      }));
      G.banner = { text: 'Детали перепутались!', t: G.t, bad: true };
      say(G, 'Кто это сделал?!', 'panic', 1.4);
      alarm.shuffle(); buzz(60);
    }
  };

  /* ───────── рука: взять / положить / вернуть ───────── */
  const returnHand = () => {
    const G = g.current; const h = G.hand;
    if (!h) return;
    G.belts[h.from.belt].items.push({ uid: uid(), kind: h.kind, y: h.from.y, x: h.from.x, spin: h.from.spin });
    G.hand = null; G.hover = -1;
  };

  const grab = (bi, itemUid, e) => {
    const G = g.current;
    if (G.demo || screenRef.current !== 'play') return;
    consumed.current = true;
    if (G.hand) returnHand();
    G.trashMode = false;
    const belt = G.belts[bi];
    const it = belt.items.find((x) => x.uid === itemUid);
    if (!it) return;
    belt.items = belt.items.filter((x) => x !== it);
    const R = rootRect();
    if (PARTS[it.kind].bonus) { activateBonus(PARTS[it.kind].bonus, { x: e.clientX - R.left, y: e.clientY - R.top }); return; }
    G.hand = {
      kind: it.kind, mode: 'drag', moved: false,
      x: e.clientX - R.left, y: e.clientY - R.top, sx: e.clientX, sy: e.clientY,
      from: { belt: bi, y: it.y, x: it.x, spin: it.spin },
    };
    sfx.pick(); buzz(8);
  };

  // ячейка под пальцем: если палец между двумя ячейками — берём ближайшую, а не верхнюю
  const slotAtClient = (cx, cy) => {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < 3; i++) {
      const el = refs.current[`slot-${i}`]; if (!el) continue;
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - cx, 0, cx - r.right), dy = Math.max(r.top - cy, 0, cy - r.bottom);
      if (dx > 12 || dy > 8) continue;
      const d = Math.hypot(cx - (r.left + r.right) / 2, (cy - (r.top + r.bottom) / 2) * 1.5);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  const dropInto = (s) => {
    const G = g.current; const h = G.hand; const slot = G.slots[s];
    if (!h) return;
    const p = center(refs.current[`slot-${s}`]);
    if (slot.state !== 'build') {
      addFloat(p.x, p.y - 30, slot.state === 'toy' ? 'Сначала забери игрушку' : 'Тут брак — в корзину', 'warn');
      slotFlash(s, 'bad'); sfx.nope(); buzz(30);
      returnHand();
      return;
    }
    if (G.tut && G.tut.step < TUT_JUNK_STEP) {
      const test = [...slot.parts, h.kind];
      if (!G.cfg.toys.some((t) => fits(test, t.need))) {
        addFloat(p.x, p.y - 30, 'Эта деталь сюда не подходит', 'warn');
        slotFlash(s, 'bad'); sfx.nope(); returnHand();
        return;
      }
    }
    G.hand = null; G.hover = -1;
    applyPart(s, h.kind);
  };

  // положить деталь в ячейку (из руки или магнитом)
  const applyPart = (s, kind) => {
    const G = g.current; const slot = G.slots[s];
    const p = center(refs.current[`slot-${s}`]);
    slot.parts.push(kind);
    const res = evalSlot(G, s);
    if (res === 'junk') {
      slotFlash(s, 'bad'); alarm.junk(); buzz(50);
      addFloat(p.x, p.y - 26, PARTS[slot.parts[slot.parts.length - 1]].coal ? 'Уголь! Брак' : 'Не сходится — брак', 'bad');
      say(G, 'Ой, брак!', 'sad', 1.2);
    } else if (res === 'toy') {
      slotFlash(s, 'good'); alarm.assembled(); buzz(20);
      burst(p.x, p.y, 14);
      addFloat(p.x, p.y - 30, `${TOY_BY_ID[slot.toy].n}! Жми`, 'good');
    } else {
      sfx.land(slot.parts.length * 2); buzz(8);
    }
  };

  /* ───────── ячейки ───────── */
  const tapSlot = (s) => {
    const G = g.current;
    if (screenRef.current !== 'play') return;
    consumed.current = true;
    const slot = G.slots[s];
    const p = center(refs.current[`slot-${s}`]);

    if (G.trashMode) {
      G.trashMode = false;
      if (!slot.parts.length) { addFloat(p.x, p.y, 'Тут пусто', 'muted'); return; }
      G.slots[s] = emptySlot();
      alarm.whoosh();
      const tr = refs.current.trash;
      if (tr) {
        const to = center(tr);
        G.flyers.push({ id: uid(), node: <span className="junkball">🗑️</span>, x0: p.x, y0: p.y, x1: to.x, y1: to.y, p: 0, dur: 0.35, land: () => sfx.trash() });
      }
      return;
    }
    if (G.hand && G.hand.mode === 'held') { dropInto(s); return; }
    if (slot.state === 'toy') { deliver(s); return; }
    if (slot.state === 'junk') {
      addFloat(p.x, p.y - 26, 'Нажми на корзину, потом сюда', 'warn');
      G.trashPulse = G.t;
      sfx.nope();
    }
  };

  const deliver = (s) => {
    const G = g.current; const slot = G.slots[s];
    const toyId = slot.toy;
    const p = center(refs.current[`slot-${s}`]);
    const orders = G.orders.filter((o) => o.state === 'active' && o.toy.id === toyId).sort((a, b) => a.left - b.left);
    const o = orders[0];
    if (!o) {
      addFloat(p.x, p.y - 30, 'Такую никто не заказывал', 'warn');
      slotFlash(s, 'bad'); sfx.nope(); buzz(30);
      return;
    }
    o.state = 'done'; o.endAt = G.t;
    G.slots[s] = emptySlot();
    G.combo += 1; G.maxCombo = Math.max(G.maxCombo, G.combo); G.delivered += 1;
    const m = comboMult(G.combo);
    const tip = Math.round(25 * (o.left / o.patience));
    const urgentMult = o.urgent ? 2 : 1;
    const pts = (40 + tip) * m * urgentMult;
    G.score += pts;
    const card = refs.current[`card-${o.uid}`];
    if (card) { const c = center(card); burst(c.x, c.y, o.urgent ? 30 : 16); }
    const parts = [];
    if (o.urgent) parts.push('срочный ×2');
    if (m > 1) parts.push(`комбо ×${m}`);
    if (tip >= 15) parts.push(`чаевые +${tip}`);
    rewardAboveElf(`+${pts}`, parts.join(' · '), o.urgent ? 'gold' : '');
    alarm.reward();
    // игрушка летит назад в праздничную коробку
    const pile = refs.current.pile;
    const slotPos = OPEN_SPOT; // игрушка падает в открытую коробку
    let to = p;
    if (pile) { const c = center(pile); to = { x: c.x + slotPos.x, y: c.y + pile.offsetHeight / 2 - slotPos.y - 20 }; }
    const color = pick(BOX_COLORS);
    G.flyers.push({
      id: uid(), node: <ToySprite id={toyId} className="fly-sprite" />, x0: p.x, y0: p.y, x1: to.x, y1: to.y + 4, p: 0, dur: 0.5, arc: 110,
      land: () => { G.gifts.push({ id: uid(), toy: toyId, color, born: G.t, rot: (Math.random() - 0.5) * 16 }); sfx.toy(); },
    });
    say(G, '', 'happy', 1.2); // радуется молча — над головой и так награда
    sfx.pick(); buzz(25);
  };

  const tapTrash = () => {
    const G = g.current;
    if (screenRef.current !== 'play') return;
    consumed.current = true;
    if (G.hand) returnHand();
    if (!G.trashMode && !G.slots.some((s) => s.parts.length)) {
      const p = center(refs.current.trash); addFloat(p.x, p.y - 30, 'Нечего выбрасывать', 'muted'); return;
    }
    G.trashMode = !G.trashMode;
    sfx.bench();
  };

  /* ───────── указатель: перетаскивание ───────── */
  useEffect(() => {
    const move = (e) => {
      const G = g.current; const h = G.hand;
      if (!h || h.mode !== 'drag') return;
      const R = rootRect();
      h.x = e.clientX - R.left; h.y = e.clientY - R.top;
      if (Math.hypot(e.clientX - h.sx, e.clientY - h.sy) > 10) h.moved = true;
      G.hover = slotAtClient(e.clientX, e.clientY);
    };
    const up = (e) => {
      const G = g.current; const h = G.hand;
      if (!h || h.mode !== 'drag') return;
      if (!h.moved) { h.mode = 'held'; G.hover = -1; return; }
      const s = slotAtClient(e.clientX, e.clientY);
      if (s >= 0) dropInto(s); else { returnHand(); }
    };
    const down = () => {
      // тап мимо всего — деталь из руки возвращается на ленту
      if (consumed.current) { consumed.current = false; return; }
      const G = g.current;
      if (G.hand && G.hand.mode === 'held') returnHand();
      if (G.trashMode) G.trashMode = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('pointerdown', down);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('pointerdown', down);
    };
  }, []);

  /* ───────── игровой цикл ───────── */
  const step = (dt) => {
    const G = g.current;
    const playing = !G.demo;
    if (G.over) return;            // смена закончена — ничего больше не происходит
    G.t += dt;

    // ускорение ленты по ходу смены
    const elapsed = SHIFT_SECONDS - G.timeLeft;
    const stage = playing && !G.tut ? Math.floor(elapsed / SPEED_STEP_SECONDS) : 0;
    if (playing && stage > G.stage) {
      G.stage = stage;
      G.banner = { text: 'Лента ускоряется!', t: G.t };
      say(G, 'Быстрее!', 'panic', 1.2);
      alarm.speedup(); buzz(40);
    }
    const travel = G.cfg.travel / (1 + 0.2 * G.stage);
    // геометрию лент меряем раз в полсекунды (и при смене размера), а не каждый кадр
    if (!G.geom || !G.geom[0] || G.t - (G.geomAt || 0) > 0.5 || G.geomDirty) { G.geom = [beltGeom(0), beltGeom(1)]; G.geomAt = G.t; G.geomDirty = false; }
    const H = (G.geom[0] && G.geom[0].a) || 500;
    const reversing = G.t < G.reverseUntil;
    const dirMul = reversing ? -0.8 : 1;
    const speedPx = H / travel;          // скорость в пикселях по пути ленты
    const gap = travel / (G.tut ? 7 : 5);   // в обучении детали идут чаще — меньше ждать
    G.beltOff += (dt / travel) * dirMul;
    G.beltPx = (G.beltPx || 0) + dt * speedPx * dirMul;
    G.belts.forEach((b, bi) => {
      const total = (G.geom[bi] && G.geom[bi].total) || 1200;
      b.items.forEach((it) => { it.y += dt * speedPx * dirMul; });
      b.items = b.items.filter((it) => it.y < total && it.y > -60);
      if (!reversing) b.spawnIn -= dt;
      if (b.spawnIn <= 0) {
        b.items.push({ uid: uid(), kind: pickKind(G), y: -12, x: (Math.random() - 0.5) * 12, spin: (Math.random() - 0.5) * 30 });
        b.spawnIn = gap * (0.75 + Math.random() * 0.5);
      }
    });

    if (playing && G.tut) {
      const st = TUT[G.tut.step];
      // after — пауза после выполнения шага, чтобы игрок успел увидеть результат (награду и т. п.)
      if (st.wait && G.t - G.tut.at > 0.3 && st.wait(G)) {
        if (!G.tut.okAt) G.tut.okAt = G.t;
        if (G.t - G.tut.okAt >= (st.after || 0)) advanceTut();
      }
    }

    if (playing) {
      if (!G.tut && !G.endAt) G.timeLeft -= dt;
      const sec = Math.ceil(G.timeLeft);
      if (sec !== G.lastSec) { G.lastSec = sec; if (sec <= 10 && sec > 0) sfx.tick(); }

      const elapsedNow = SHIFT_SECONDS - G.timeLeft;
      // бонус на ленте (смена 3+)
      if (!G.tut && !G.endAt && G.t >= G.nextBonusAt) {
        const kind = G.bonusFlip++ % 2 === 0 ? 'bonus_freeze' : 'bonus_magnet';
        const bi = Math.random() < 0.5 ? 0 : 1;
        G.belts[bi].items.push({ uid: uid(), kind, y: -12, x: 0, spin: 0 });
        G.nextBonusAt = G.t + G.cfg.bonusEvery * (0.8 + Math.random() * 0.4);
        G.pendingIntro = kind === 'bonus_freeze' ? 'freeze' : 'magnet';
        G.pendingIntroAt = G.t + 1.2; // объясняем, когда бонус выедет из люка
      }
      if (G.pendingIntro && G.t >= G.pendingIntroAt) { const k = G.pendingIntro; G.pendingIntro = null; if (introduce(k)) return; }
      // помеха (смена 4+), но не когда горит заказ
      if (!G.tut && !G.endAt && G.t >= G.nextHazardAt && G.danger === 0 && G.t > G.reverseUntil) {
        const type = pick(G.cfg.hazards);
        G.nextHazardAt = G.t + G.cfg.hazardEvery * (0.8 + Math.random() * 0.4);
        const shown = introduce(type);
        startHazard(type);
        if (shown) return;
      }

      // заказы
      const active = G.orders.filter((o) => o.state === 'active');
      // заказы приходят по одному; если пусто — следующий не заставит себя ждать
      if (!G.tut && active.length === 0 && G.nextOrderAt - G.t > 2) G.nextOrderAt = G.t + 2;
      // пока какой-то заказ горит (или смена уже сорвана) — новые не приходят
      if (G.danger > 0 || G.endAt) G.nextOrderAt = Math.max(G.nextOrderAt, G.t + 2);
      if (!G.tut && !G.endAt && G.danger === 0 && G.t >= G.nextOrderAt && G.orders.length < G.cfg.maxOrders) {
        const busy = active.map((o) => o.toy.id);
        const free = G.cfg.toys.filter((t) => !busy.includes(t.id));
        // срочный заказ: первый — гарантированно на 12-й секунде смены 2+, дальше случайно
        const urgent = G.cfg.urgent > 0 && !active.some((o) => o.urgent) && elapsedNow > 10 &&
          (!G.hadUrgent || Math.random() < G.cfg.urgent);
        if (urgent) G.hadUrgent = true;
        addOrder(G, pick(free.length ? free : G.cfg.toys), 1, urgent);
        G.nextOrderAt = G.t + G.cfg.orderEvery * (active.length === 0 ? 0.6 : 1);
        if (urgent && introduce('urgent')) return;
      }
      let danger = 0;
      G.orders.forEach((o) => {
        if (o.state !== 'active') return;
        if (G.tut) {
          // в обучении срок тикает только на шаге про таймер и не сгорает до конца
          if (TUT[G.tut.step].id === 'timer') o.left = Math.max(o.patience * 0.06, o.left - dt);
        } else if (G.t >= G.freezeUntil) o.left -= dt;   // снежинка: время стоит
        const frac = o.left / o.patience;
        if (G.t >= G.freezeUntil) danger = Math.max(danger, clamp((0.3 - frac) / 0.3, 0, 1));
        if (o.left <= 0) {
          o.state = 'fail'; o.endAt = G.t;
          G.failed += 1; G.combo = 0;
          G.score = Math.max(0, G.score - 20);
          const card = refs.current[`card-${o.uid}`];
          if (card) { const c = center(card); addFloat(c.x, c.y + 10, '−20', 'bad'); }
          say(G, 'Заказ сорван!', 'panic', 1.6);
          alarm.expire(); buzz(120);
          if (!G.endAt) G.endAt = G.t + 1.1; // даём увидеть штамп «Сорван», потом итоги
        }
      });
      G.orders = G.orders.filter((o) => o.state === 'active' || G.t - o.endAt < 0.9);
      G.danger = danger;
      music.setDuck(1 - 0.65 * danger);
      // стук сердца — чем ближе к срыву, тем чаще и громче
      if (danger > 0 && G.t >= G.nextBeat) {
        alarm.heart(danger);
        G.beatAt = G.t;
        G.nextBeat = G.t + (1.0 - 0.5 * danger);
        if (danger > 0.6) buzz(20);
      }
      if (danger > 0.5 && G.t >= G.elf.until) G.elf = { text: '', mood: 'panic', until: G.t + 0.2 };
    }

    // полёты, частицы, надписи
    G.flyers.forEach((f) => { f.p += dt / f.dur; });
    const landed = G.flyers.filter((f) => f.p >= 1);
    G.flyers = G.flyers.filter((f) => f.p < 1);
    landed.forEach((f) => f.land && f.land());
    G.parts.forEach((p) => { p.age += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; });
    G.parts = G.parts.filter((p) => p.age < p.life);
    G.floats.forEach((f) => { f.age += dt; });
    G.floats = G.floats.filter((f) => f.age < (f.life || 1.1));

    if (playing && !G.tut && G.timeLeft <= 0 && !G.endAt) {
      G.timeLeft = 0; G.endAt = G.t + 1.2;
      G.banner = { text: 'Время вышло!', t: G.t };
      alarm.speedup();
    }
    if (playing && G.endAt && G.t >= G.endAt) endShift();
  };

  const endShift = () => {
    const G = g.current; const sv = saveRef.current;
    if (G.over) return;
    G.over = true;
    if (G.hand) returnHand();
    G.trashMode = false; G.danger = 0; music.setDuck(1);
    G.banner = null; G.floats = []; G.freezeUntil = 0;
    const th = G.cfg.stars;
    const stars = G.failed > 0 ? 0 : th.filter((v) => G.score >= v).length;
    const won = stars >= 1;
    const prevBest = sv.best[G.L] || 0;
    const next = {
      ...sv,
      unlocked: won ? Math.max(sv.unlocked, G.L + 1) : sv.unlocked,
      stars: { ...sv.stars, [G.L]: Math.max(sv.stars[G.L] || 0, stars) },
      best: { ...sv.best, [G.L]: Math.max(prevBest, G.score) },
    };
    setSave(next); writeSave(next);
    setResult({
      won, stars, L: G.L, score: G.score, thresholds: th, delivered: G.delivered,
      failed: G.failed, failedOut: G.failed > 0, maxCombo: G.maxCombo, newBest: G.score > prevBest && G.score > 0,
    });
    G.flyers = []; G.danger = 0; G.trashMode = false;
    G.elf = won ? { text: '', mood: 'happy', until: G.t + 999 } : { text: '', mood: 'panic', until: G.t + 999 };
    if (won) { sfx.win(); const R = rootRect(); burst(R.width / 2, R.height * 0.3, 60); } else sfx.lose();
    setScreen('result');
  };

  const fastPaint = () => {
    const G = g.current, r = refs.current, E = els.current;
    G.belts.forEach((b, bi) => {
      const gm = G.geom && G.geom[bi];
      if (gm) b.items.forEach((it) => {
        const el = E.items.get(it.uid); if (!el) return;
        const pt = pathPoint(gm, it.y);
        el.style.transform = `translate3d(${(pt.x - gm.ox + it.x).toFixed(1)}px, ${(pt.y - gm.oy).toFixed(1)}px, 0) translate(-50%, -50%)`;
        const hide = it.y < (gm.showY ?? 0);
        if (el.dataset.hid !== String(hide)) { el.dataset.hid = String(hide); el.style.visibility = hide ? 'hidden' : ''; }
        if (it.y < 80) {   // затемнение только пока деталь в туннеле — дальше стиль не трогаем
          const dark = it.y < 70 ? 0.25 + 0.75 * Math.max(0, it.y) / 70 : 1;
          el.style.setProperty('--dark', (1 - dark).toFixed(2));
        }
      });
      const ribs = r[`ribs-${bi}`];
      if (ribs) {
        const tile = ASSETS.belt_tile ? (r[`track-${bi}`]?.clientWidth || 64) : 18;
        const off = (((G.beltPx || 0) % tile) + tile) % tile;
        ribs.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      }
      const gmb = G.geom && G.geom[bi];
      if (gmb) RIB_BANDS.forEach((rb, k) => r[`rib-${bi}-${k}`]?.setAttribute('stroke-dashoffset', ribOffset(gmb, G.beltPx, rb.at).toFixed(1)));
    });
    G.flyers.forEach((f) => { const el = E.flyers.get(f.id); if (el) el.style.transform = flyerTf(f); });
    G.parts.forEach((p) => { const el = E.parts.get(p.id); if (el) { el.style.transform = partTf(p); el.style.opacity = partOp(p); } });
    E.parts.forEach((el, id) => { if (!G.parts.some((p) => p.id === id)) el.style.opacity = '0'; });
    G.floats.forEach((f) => { const el = E.floats.get(f.id); if (el) { el.style.transform = floatTf(f); el.style.opacity = floatOp(f); } });
    if (G.hand && r.hand) r.hand.style.transform = handTf(G.hand);
    if (r.danger) r.danger.style.opacity = screenRef.current === 'play' && !G.demo ? vignetteOf(G).toFixed(3) : '0';
  };

  // React перестраивает интерфейс только когда что-то поменялось (или ~15 раз в секунду для таймеров)
  const signature = (G) => {
    const mood = G.t < G.elf.until ? G.elf.mood + G.elf.text : (G.danger > 0.5 ? 'panic' : 'idle');
    return [
      screenRef.current, G.belts[0].items.length, G.belts[1].items.length, G.flyers.length, G.parts.length > 0,
      G.floats.length, G.orders.map((o) => o.uid + o.state).join(','), G.slots.map((s) => s.state + s.parts.length).join(''),
      G.gifts.length, G.hand ? G.hand.mode : '', G.trashMode, G.hover, G.banner && G.t - G.banner.t < 1.8, mood,
      G.stage, Math.ceil(G.timeLeft), G.score, G.combo, Math.ceil(Math.max(0, G.freezeUntil - G.t)), G.tut ? G.tut.step : -1,
      G.danger > 0, G.over,
    ].join('|');
  };

  useEffect(() => {
    let raf, last = performance.now(), frameNo = 0, lastSig = '';
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sc = screenRef.current;
      if (sc === 'play' || (g.current.demo && sc !== 'map')) {
        step(dt);
        frameNo += 1;
        const sig = signature(g.current);
        if (sig !== lastSig || frameNo % 6 === 0) { lastSig = sig; setFrame((f) => (f + 1) % 1e6); }
        else fastPaint();
      }
      else if (sc === 'result') {
        const G = g.current;
        G.parts.forEach((p) => { p.age += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; });
        G.parts = G.parts.filter((p) => p.age < p.life);
        setFrame((f) => (f + 1) % 1e6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => { g.current.geomDirty = true; };
    window.addEventListener('resize', onResize);
    const onVis = () => { if (document.hidden && screenRef.current === 'play') setScreen('paused'); };
    document.addEventListener('visibilitychange', onVis);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (screenRef.current === 'play') setScreen('paused');
        else if (screenRef.current === 'paused') setScreen('play');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('keydown', onKey); };
  }, []);

  // музыка молчит на паузе и в свёрнутой вкладке, возвращается при игре
  useEffect(() => {
    music.hold = screen === 'paused';
    if (screen === 'paused') { if (music.el) music.el.pause(); }
    else if (music.wanted) music.sync();
  }, [screen]);

  const start = (L) => { g.current = makeGame(L, false); setResult(null); setScreen('play'); sfx.pick(); music.start(); };
  const startTutorial = () => { g.current = makeGame(1, false, true); tutEnter(g.current, TUT[0]); setResult(null); setScreen('play'); sfx.pick(); music.start(); };

  function advanceTut() {
    const G = g.current;
    if (!G.tut) return;
    if (G.tut.step >= TUT.length - 1) { finishTut(); return; }
    G.tut.step += 1; G.tut.at = G.t; G.tut.okAt = 0;
    tutEnter(G, TUT[G.tut.step]);
    sfx.bench();
  }
  // подготовка шага обучения: заказ на карточке, брак в ячейке
  function tutEnter(G, st) {
    if (!st.enter) return;
    if (st.enter.order) {
      G.orders = G.orders.filter((o) => o.state === 'active' && o.toy.id !== st.enter.order);
      addOrder(G, TOY_BY_ID[st.enter.order], st.enter.left || 1);
    }
    if (st.enter.junk) {
      let i = G.slots.findIndex((sl) => sl.state === 'build' && !sl.parts.length);
      if (i < 0) i = 0;
      G.slots[i] = { ...emptySlot(), parts: ['chocolate'], state: 'junk' };
      slotFlash(i, 'bad'); alarm.junk(); buzz(50);
      say(G, 'Ой, брак!', 'sad', 1.4);
    }
  }
  function finishTut() {
    const next = { ...saveRef.current, tutorialDone: true };
    setSave(next); writeSave(next);
    start(1);
  }
  const toMenu = () => { g.current = makeGame(Math.min(saveRef.current.unlocked, MAP_LEVELS), true); setScreen('menu'); };
  const [mapWalkFrom, setMapWalkFrom] = useState(0);
  const toMap = (walkFrom = 0) => {
    g.current = makeGame(Math.min(saveRef.current.unlocked, MAP_LEVELS), true);
    setMapWalkFrom(walkFrom); setResult(null); setScreen('map');
  };
  const pause = () => { if (screenRef.current === 'play') { if (g.current.hand) returnHand(); setScreen('paused'); } };
  const toggleMute = () => {
    const m = !isMuted(); setMuted(m); setMutedState(m);
    const next = { ...saveRef.current, muted: m }; setSave(next); writeSave(next);
  };

  /* ───────── отрисовка ───────── */
  const G = g.current;
  const inGame = !G.demo;
  const timeLow = inGame && G.timeLeft <= 10;
  const th = G.cfg.stars;
  const scoreMax = th[2] * 1.12;
  const beatPulse = Math.exp(-(G.t - G.beatAt) * 5);
  const vignette = vignetteOf(G);
  const elfMood = G.t < G.elf.until ? G.elf.mood : (G.danger > 0.5 ? 'panic' : 'idle');
  const orderCols = G.cfg.maxOrders;
  const orderCells = [...G.orders];
  while (orderCells.length < orderCols) orderCells.push(null);
  const tutStep = G.tut ? TUT[G.tut.step] : null;

  return (
    <div className="app">
      <div className={`game ${ASSETS.bg ? 'has-bg' : ''} ${G.hand ? 'holding' : ''} ${G.trashMode ? 'trash-mode' : ''}`} ref={root}
        style={ASSETS.bg ? { backgroundImage: `url(${ASSETS.bg})` } : undefined}>
        <div className="garland" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}
        </div>

        {/* HUD */}
        <header className={`hud ${inGame ? '' : 'hud-idle'}`}>
          <div className="hud-row">
            <span className="shift">{G.tut ? 'Обучение' : levelTitle(G.L)}</span>
            <span className={`timer ${timeLow ? 'low' : ''} ${G.tut ? 'tut' : ''}`}>{!G.tut && ASSETS.ui_clock && <img className="timer-ico" src={ASSETS.ui_clock} alt="" draggable={false} />}{G.tut ? `${G.tut.step + 1} / ${TUT.length}` : fmtTime(G.timeLeft)}</span>
            {!G.tut && (
              <span key={G.stage} className={`speed lvl-${Math.min(G.stage, 3)} ${G.stage > 0 ? 'bumped' : ''}`} title="Скорость ленты" aria-label={`Скорость ленты ×${(1 + 0.2 * G.stage).toFixed(1)}`}>
                <Speed />
                <b>×{(1 + 0.2 * G.stage).toFixed(1).replace('.', ',')}</b>
              </span>
            )}
            <button className="icon-btn" onPointerDown={(e) => { consumed.current = true; e.stopPropagation(); }} onClick={toggleMute} aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
              {muted ? <VolumeMute /> : <VolumeMax />}
            </button>
            <button className="icon-btn" onPointerDown={(e) => { consumed.current = true; e.stopPropagation(); }} onClick={pause} aria-label="Пауза" disabled={screen !== 'play'}>
              <Pause />
            </button>
          </div>
          <div className="scorebar">
            <div className="scorebar-track">
              <div className="scorebar-fill" style={{ width: `${Math.min(1, G.score / scoreMax) * 100}%` }} />
              {th.map((v, i) => (
                <span key={i} className={`mark ${G.score >= v ? 'on' : ''}`} style={{ left: `${(v / scoreMax) * 100}%` }}>{ASSETS.ui_star ? <img src={ASSETS.ui_star} alt="" draggable={false} /> : '★'}</span>
              ))}
            </div>
            <div className="score">
              <span>{G.score.toLocaleString('ru-RU')}</span>
              {comboMult(G.combo) > 1 && <em className="mult">×{comboMult(G.combo)}</em>}
            </div>
          </div>
        </header>

        {/* Заказы */}
        <section className="orders" style={{ '--cols': orderCols }} aria-label="Заказы">
          {orderCells.map((o, idx) => {
            if (!o) return <div key={`e${idx}`} className="order-gap" />;
            const frac = Math.max(0, o.left / o.patience);
            const urgent = o.state === 'active' && frac < 0.3;
            return (
              <div key={o.uid} ref={setRef(`card-${o.uid}`)} className={`order ${o.state} ${urgent ? 'urgent' : ''} ${o.urgent ? 'vip' : ''} ${G.t < G.freezeUntil ? 'frozen' : ''} ${G.t - (o.born || 0) < 1.4 ? 'fresh' : ''}`}>
                {o.urgent && <span className="vip-badge">🎅 срочно ×2</span>}
                {G.t - (o.born || 0) < 1.4 && <span className="new-badge">новый</span>}
                <div className="order-need">
                  {o.toy.need.map((k, i) => <span key={i} className="need"><PartSprite id={k} /></span>)}
                </div>
                <div className="order-toy">
                  <ToySprite id={o.toy.id} className="toy-sprite" />
                  <div className="patience"><div style={{ '--w': `${frac * 100}%`, '--h': `${Math.round(frac * 120)}` }} /></div>
                </div>
                {o.state === 'done' && <div className="stamp ok">Готово</div>}
                {o.state === 'fail' && <div className="stamp no">Сорван</div>}
              </div>
            );
          })}
        </section>

        {/* Цех */}
        <main className="floor">
          {/* изгибы лент к центру — рисуются кодом и стыкуются с прямыми участками */}
          {G.geom && G.geom[0] && G.geom[1] && (
            <svg className="curves" width={G.geom[0].H ? undefined : 0} aria-hidden="true">
              {G.geom.map((gm, bi) => {
                const { Lx, y0, Ex, yEnd, dir, r, th, bw } = gm;
                const p1x = Lx + dir * r * (1 - Math.cos(th)), p1y = y0 + r * Math.sin(th);
                const d = `M ${Lx} ${y0 - 1} L ${Lx} ${y0} A ${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${p1x} ${p1y} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${Ex} ${yEnd} L ${Ex} ${gm.H + 80}`;
                return (
                  <g key={bi} fill="none" strokeLinecap="butt">
                    {/* бортики — те же пропорции и цвета, что у рамки прямого участка (belt_frame.png) */}
                    <path d={d} stroke="#0c4422" strokeWidth={bw * 0.966} />
                    <path d={d} stroke="#0a351a" strokeWidth={bw * 0.86} />
                    <path d={d} stroke="#543c07" strokeWidth={bw * 0.847} />
                    <path d={d} stroke="#fcdf6c" strokeWidth={bw * 0.827} />
                    <path d={d} stroke="#fcd051" strokeWidth={bw * 0.81} />
                    <path d={d} stroke="#ab6704" strokeWidth={bw * 0.70} />
                    <path d={d} stroke="#3d1f02" strokeWidth={bw * 0.667} />
                    {/* полотно и планки — как в belt_tile.png, планки едут в фазе с прямым участком */}
                    <path d={d} stroke="#727579" strokeWidth={bw * 0.653} />
                    {RIB_BANDS.map((rb, k) => (
                      <path key={k} ref={setRef(`rib-${bi}-${k}`)} d={d} stroke={rb.c} strokeWidth={bw * 0.653}
                        strokeDasharray={`${(rb.len * gm.P).toFixed(2)} ${((1 - rb.len) * gm.P).toFixed(2)}`}
                        strokeDashoffset={ribOffset(gm, G.beltPx, rb.at).toFixed(1)} />
                    ))}
                  </g>
                );
              })}
            </svg>
          )}
          {[0, 1].map((bi) => {
            const gm = G.geom && G.geom[bi];
            return (
            <div key={bi} ref={setRef(`belt-${bi}`)} className={`belt belt-${bi} ${ASSETS.belt_frame ? 'framed' : ''} ${ASSETS.hopper ? 'has-hopper' : ''}`}>
              <div className="side-pipe" aria-hidden="true"><i /></div>
              {ASSETS.hopper
                ? <div className="hopper-img" style={{ borderImageSource: `url(${ASSETS.hopper})` }} aria-hidden="true" />
                : <div className="hopper"><span /></div>}
              <div className="track" ref={setRef(`track-${bi}`)}>
                {(() => {
                  // лента едет ровно с той же скоростью, что и детали; сдвиг — transform по модулю высоты плитки
                  const tile = ASSETS.belt_tile ? (refs.current[`track-${bi}`]?.clientWidth || 64) : 18;
                  const off = (((G.beltPx || 0) % tile) + tile) % tile;
                  return (
                    <div className="ribs" ref={setRef(`ribs-${bi}`)} style={{
                      top: -tile, transform: `translate3d(0, ${off.toFixed(1)}px, 0)`,
                      ...(ASSETS.belt_tile ? { backgroundImage: `url(${ASSETS.belt_tile})`, backgroundSize: '100% auto' } : {}),
                    }} />
                  );
                })()}
              </div>
              {ASSETS.belt_frame && <div className="frame" style={{ borderImageSource: `url(${ASSETS.belt_frame_straight || ASSETS.belt_frame})` }} aria-hidden="true" />}
              <div className="items-layer">
                {gm && G.belts[bi].items.map((it) => {
                  const pt = pathPoint(gm, it.y);
                  const dark = it.y < 70 ? 0.25 + 0.75 * Math.max(0, it.y) / 70 : 1; // выезжает из тёмного туннеля
                  return (
                    <button key={it.uid} ref={bindEl('items', it.uid)}
                      className={`item ${PARTS[it.kind].coal ? 'coal' : ''} ${PARTS[it.kind].bonus ? `bonus ${PARTS[it.kind].bonus}` : ''}`}
                      style={{ transform: `translate3d(${(pt.x - gm.ox + it.x).toFixed(1)}px, ${(pt.y - gm.oy).toFixed(1)}px, 0) translate(-50%, -50%)`, '--r': `${it.spin}deg`, '--dark': (1 - dark).toFixed(2), visibility: it.y < (gm.showY ?? 0) ? 'hidden' : undefined }}
                      onPointerDown={(e) => { e.preventDefault(); grab(bi, it.uid, e); }}
                      aria-label={PARTS[it.kind].n} tabIndex={-1}>
                      <PartSprite id={it.kind} />
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}

          <div className="center" ref={setRef('center')}>
            {/* сзади — гора подарков, спереди — эльф */}
            <div className="back">
              <div className="pile" ref={setRef('pile')}>
                {G.gifts.slice(0, PILE.length).map((gift, i) => {
                  const pos = PILE[i];
                  const fresh = G.t - gift.born < 0.5;
                  return (
                    <div key={gift.id} className={`gift ${fresh ? 'just' : ''}`} style={{
                      marginLeft: pos.x, bottom: pos.y, zIndex: 20 - Math.floor(pos.y / 20),
                      '--s': pos.s, '--rot': `${gift.rot || 0}deg`,
                    }}>
                      {fresh && <span className="gift-toy"><ToySprite id={gift.toy} /></span>}
                      <GiftBox color={gift.color} open={false} />
                    </div>
                  );
                })}
                {inGame && (() => {
                  const pos = OPEN_SPOT;
                  const i = G.gifts.length;
                  return (
                    <div key={`open-${i}`} className="gift open-next" style={{
                      marginLeft: pos.x, bottom: pos.y, zIndex: 20 - Math.floor(pos.y / 20), '--s': pos.s, '--rot': '0deg',
                    }}>
                      <GiftBox color="red" open />
                    </div>
                  );
                })()}
                {G.gifts.length > 0 && <span className="pile-count">🎁 {G.gifts.length}</span>}
              </div>
              <div className={`elf ${elfMood}`} ref={setRef('elf')} aria-hidden="true">
                <Sprite name={`elf_${elfMood === 'sad' ? 'panic' : elfMood}`} emoji="🧝" className="elf-sprite" />
              </div>
              {G.t < G.elf.until && G.elf.text && <div className={`bubble ${G.elf.mood}`}>{G.elf.text}</div>}
            </div>

            <div className={`bench ${ASSETS.bench ? 'img' : ''}`} style={ASSETS.bench ? { borderImageSource: `url(${ASSETS.bench})` } : undefined}>
              {G.slots.map((slot, s) => {
                const hint = slotHint(G, slot);
                const flashing = slot.flash && G.t - slot.flash < 0.45;
                const canDrop = G.hand && slot.state === 'build';
                return (
                  <button key={s} ref={setRef(`slot-${s}`)}
                    className={[
                      'slot', `st-${slot.state}`, ASSETS.slot ? 'img' : '',
                      G.hover === s ? 'hover' : '',
                      canDrop ? 'can-drop' : '',
                      G.trashMode && slot.parts.length ? 'trash-target' : '',
                      flashing ? `flash-${slot.flashKind}` : '',
                    ].join(' ')}
                    onPointerDown={(e) => { e.stopPropagation(); consumed.current = true; tapSlot(s); }}
                    style={ASSETS.slot ? { borderImageSource: `url(${ASSETS.slot})` } : undefined}
                    aria-label={`Ячейка ${s + 1}`}>
                    {slot.state === 'toy' ? (
                      <span className="slot-toy"><ToySprite id={slot.toy} /><em>нажми</em></span>
                    ) : (
                      <span className="sockets">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={`socket ${slot.parts[i] ? 'filled' : ''}`}>
                            {slot.parts[i] && <PartSprite id={slot.parts[i]} />}
                          </span>
                        ))}
                        {hint && <span className="ghost"><ToySprite id={hint} /></span>}
                      </span>
                    )}
                    {slot.state === 'junk' && (
                      <span className={`junk-tag ${ASSETS.junk ? 'with-img' : ''}`}>{ASSETS.junk ? <img src={ASSETS.junk} alt="" className="junk-img" /> : null}<b>Брак</b></span>
                    )}
                    {G.trashMode && slot.parts.length > 0 && <span className="trash-hint">очистить</span>}
                  </button>
                );
              })}
            </div>

            <button ref={setRef('trash')}
              className={`trash ${G.trashMode ? 'active' : ''} ${G.trashPulse && G.t - G.trashPulse < 1 ? 'pulse' : ''} ${G.slots.some((x) => x.state === 'junk') ? 'has-junk' : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); tapTrash(); }}
              aria-label="Корзина">
              <Sprite name="trash" emoji="🗑️" className="trash-sprite" />
              <span>{G.trashMode ? 'Выбери ячейку' : 'Корзина'}</span>
            </button>
          </div>
        </main>

        {/* тревога: красная пульсация по краям */}
        <div className="danger" ref={setRef('danger')} style={{ opacity: inGame && screen === 'play' ? vignette : 0 }} aria-hidden="true" />

        {G.banner && G.t - G.banner.t < 1.8 && (
          <div className={`banner ${G.banner.gold ? 'gold' : ''} ${G.banner.ice ? 'ice' : ''} ${G.banner.bad ? 'bad' : ''}`} key={G.banner.t}>{G.banner.text}</div>
        )}
        {inGame && G.t < G.freezeUntil && (
          <div className="frost" aria-hidden="true"><span>❄️ {Math.ceil(G.freezeUntil - G.t)}</span></div>
        )}

        {/* эффекты */}
        <div className="fx" aria-hidden="true">
          {G.flyers.map((f) => {
            return <span key={f.id} ref={bindEl('flyers', f.id)} className="flyer" style={{ transform: flyerTf(f) }}>{f.node}</span>;
          })}
          {G.hand && (
            <span className={`hand ${G.hand.mode}`} ref={setRef('hand')} style={{ transform: handTf(G.hand) }}>
              <PartSprite id={G.hand.kind} />
            </span>
          )}
          {G.parts.map((p) => (
            <i key={p.id} ref={bindEl('parts', p.id)} className="part" style={{
              transform: partTf(p), background: p.c, width: p.w, height: p.w * 0.6, opacity: partOp(p),
            }} />
          ))}
          {G.floats.map((f) => (
            <span key={f.id} ref={bindEl('floats', f.id)} className={`float ${f.cls}`} style={{ transform: floatTf(f), opacity: floatOp(f) }}>{f.text}</span>
          ))}
        </div>

        {/* обучение */}
        {tutStep && screen === 'play' && (
          <Coach step={tutStep} index={G.tut.step} total={TUT.length} G={G}
            refs={refs} rootRect={rootRect}
            onNext={() => { consumed.current = true; advanceTut(); }}
            onSkip={() => { consumed.current = true; finishTut(); }} />
        )}

        {/* экраны */}
        {screen === 'loading' && (
          <Loader onStart={() => { sfx.pick(); music.start(); }} onDone={() => setScreen('menu')} />
        )}
        {screen === 'menu' && (
          <div className="overlay">
            <div className="card menu">
              <div className="card-head">
                <div className="eyebrow">Мастерская Деда Мороза</div>
                <div className="card-title">
                  <h1>Эльфийский цех</h1>
                  <p className="lead">Дед Мороз и его эльфы собирают подарки для всех детей. Помоги им успеть к празднику!</p>
                </div>
              </div>
              <div className="card-actions">
              <SnowButton variant="corners">
                <MTSButton variant="primary" size={52} fluid className="btn primary" onClick={() => (save.tutorialDone ? toMap() : startTutorial())}>
                  {!save.tutorialDone ? 'Начать' : 'Играть'}
                </MTSButton>
              </SnowButton>
              {save.tutorialDone && <MTSButton variant="ghost" size={52} fluid className="btn ghost" onClick={startTutorial}>Пройти обучение</MTSButton>}
              <button className="link" onClick={toggleMute}>{muted ? 'Звук выключен' : 'Звук включён'}</button>
              </div>
            </div>
          </div>
        )}

        {screen === 'intro' && intro && (
          <div className="overlay">
            <div className="card small intro-card">
              <div className="card-head">
                <div className="intro-icon">{intro.icon}</div>
                <div className="eyebrow">Новинка</div>
                <div className="card-title">
                  <h2>{intro.title}</h2>
                  <p className="lead">{intro.text}</p>
                </div>
              </div>
              <div className="card-actions">
                <SnowButton variant="wide"><MTSButton variant="primary" size={52} fluid className="btn primary" onClick={() => { setIntro(null); setScreen('play'); }}>Понятно</MTSButton></SnowButton>
              </div>
            </div>
          </div>
        )}

        {screen === 'map' && (
          <WorldMap save={save} walkFrom={mapWalkFrom}
            onPlay={(L) => start(L)} onBack={toMenu} onWalked={() => setMapWalkFrom(0)} />
        )}

        {screen === 'paused' && (
          <div className="overlay">
            <div className="card small">
              <div className="card-head">
                <div className="card-title">
                  <h2>Перерыв на какао</h2>
                  <p className="lead">{levelTitle(G.L)} · осталось {fmtTime(G.timeLeft)}</p>
                </div>
              </div>
              <div className="card-actions">
              <SnowButton variant="wide"><MTSButton variant="primary" size={52} fluid className="btn primary" onClick={() => setScreen('play')}>Продолжить</MTSButton></SnowButton>
              <MTSButton variant="secondary" size={52} fluid className="btn" onClick={() => start(G.L)}>Начать заново</MTSButton>
              <MTSButton variant="ghost" size={52} fluid className="btn ghost" onClick={() => toMap()}>На карту</MTSButton>
              <button className="link" onClick={toggleMute}>{muted ? 'Звук выключен' : 'Звук включён'}</button>
              </div>
            </div>
          </div>
        )}

        {screen === 'result' && result && (
          <div className="overlay result-ov">
            <div className={`card result ${result.won ? 'won' : 'lost'}`}>
              <div className="card-head">
                <div className="eyebrow">{levelTitle(result.L)}</div>
                <div className="card-title">
                  <h2>{result.won ? 'Смена закрыта!' : result.failedOut ? 'Заказ сорван!' : 'Дед Мороз недоволен'}</h2>
                  {result.failedOut && <p className="lead">Ребёнок остался без подарка, и смена закончилась. Успевай собрать каждый заказ.</p>}
                </div>
              </div>
              <div className="card-body">
              <div className="stars">
                {[0, 1, 2].map((i) => <span key={i} className={i < result.stars ? 'on' : ''} style={{ '--d': `${i * 0.15}s` }}>{ASSETS.ui_star ? <img src={ASSETS.ui_star} alt="" draggable={false} /> : '★'}</span>)}
              </div>
              <div className="thresholds">
                {result.thresholds.map((v, i) => <span key={i} className={result.score >= v ? 'on' : ''}>{'★'.repeat(i + 1)} {v}</span>)}
              </div>
              <dl className="stats">
                <div><dt>Очки</dt><dd>{result.score.toLocaleString('ru-RU')}{result.newBest && <em className="best">рекорд</em>}</dd></div>
                <div><dt>Подарков</dt><dd>{result.delivered}</dd></div>
                <div><dt>Сорвано</dt><dd>{result.failed}</dd></div>
                <div><dt>Лучшее комбо</dt><dd>{result.maxCombo}</dd></div>
              </dl>
              </div>
              <div className="card-actions">
              <SnowButton variant="corners">
                {result.won
                  ? <MTSButton variant="primary" size={52} fluid className="btn primary" onClick={() => toMap(result.L)}>{result.L >= MAP_LEVELS ? 'К карте' : 'Дальше по карте'}</MTSButton>
                  : <MTSButton variant="primary" size={52} fluid className="btn primary" onClick={() => start(result.L)}>Попробовать снова</MTSButton>}
              </SnowButton>
              {result.won && <MTSButton variant="secondary" size={52} fluid className="btn" onClick={() => start(result.L)}>Переиграть</MTSButton>}
              {!result.won && <MTSButton variant="ghost" size={52} fluid className="btn ghost" onClick={() => toMap()}>К карте</MTSButton>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── подсказки обучения ───────── */
function targetEls(id, G, refs) {
  const r = refs.current;
  const slotWhere = (fn) => { const i = G.slots.findIndex(fn); return i >= 0 ? [r[`slot-${i}`]] : []; };
  switch (id) {
    case 'order': { const o = G.orders.find((x) => x.state === 'active'); return o ? [r[`card-${o.uid}`]] : []; }
    case 'belts': return [r['track-0'], r['track-1']];
    case 'slotActive': return slotWhere((s) => s.state === 'build' && s.parts.length > 0);
    case 'slotToy': return slotWhere((s) => s.state === 'toy');
    case 'slotJunk': return slotWhere((s) => s.state === 'junk');
    case 'trash': return [r.trash];
    case 'junkFix': return G.trashMode ? slotWhere((s) => s.state === 'junk') : [r.trash];
    default: return [];
  }
}

function Coach({ step, index, total, G, refs, rootRect, onNext, onSkip }) {
  const RR = refs.current && Object.keys(refs.current).length ? rootRect() : null;
  const rects = RR ? targetEls(step.target, G, refs).filter(Boolean).map((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.left - RR.left, y: b.top - RR.top, w: b.width, h: b.height };
  }) : [];
  const pos = step.pos || (rects.length && rects[0].y < RR.height * 0.35 ? 'bottom' : 'top');
  // подсказка-палец: от середины левой ленты к первой пустой ячейке
  let hint = null;
  if (step.hint === 'drag' && RR) {
    const a = refs.current['track-0'], b = refs.current['slot-0'];
    if (a && b) {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      hint = {
        '--x0': `${ra.left - RR.left + ra.width / 2}px`, '--y0': `${ra.top - RR.top + ra.height * 0.45}px`,
        '--x1': `${rb.left - RR.left + rb.width / 2}px`, '--y1': `${rb.top - RR.top + rb.height / 2}px`,
      };
    }
  }
  const stop = (e) => e.stopPropagation();
  return (
    <div className="tut-layer">
      {pos === 'center' && <div className="tut-dim" />}
      {rects.map((r, i) => (
        <div key={i} className="tut-ring" style={{ left: r.x - 6, top: r.y - 6, width: r.w + 12, height: r.h + 12 }} />
      ))}
      {hint && <div className="tut-finger" style={hint}>👆</div>}
      <div className={`coach pos-${pos}`} onPointerDown={stop}>
        <div className="coach-elf"><Sprite name="elf_happy" emoji="🧝" /></div>
        <div className="coach-body">
          <div className="coach-head">
            {step.title && <h3>{step.title}</h3>}
            <p>{step.text}</p>
          </div>
          <div className="coach-actions">
            {step.button && <MTSButton variant="primary" size={44} className="btn primary small" onPointerDown={onNext}>{step.button}</MTSButton>}
            {step.id !== 'done' && <button className="coach-skip" onPointerDown={onSkip}>Пропустить обучение</button>}
            <span className="coach-count">{index + 1}/{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
