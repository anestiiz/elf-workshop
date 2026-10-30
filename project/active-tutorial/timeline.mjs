export const RECIPE = ['star', 'bow', 'candy_cane'];
export const BELT_PARTS = ['star', 'gear', 'bow', 'candy_cane'];
export const JUNK_PARTS = ['gear', 'wheel', 'paint'];
export const PLAYBACK_RATE = 1.2;
export const DURATION = { collect: 11.6 / PLAYBACK_RATE, trash: 6.2 / PLAYBACK_RATE };
export const NEXT_DELAY = 1;
const clamp = n => Math.max(0, Math.min(1, n));
export const ease = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
export const between = (time, from, to) => ease((time - from) / (to - from));
export const lerpPoint = (a, b, progress) => ({ x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress });

// The scene state comes from one visible-time clock. No input or media playback is required.
export function demoFrame(kind, seconds) {
  const t = Math.max(0, seconds) * PLAYBACK_RATE;
  if (kind === 'collect') {
    let count = 0;
    for (let i = 0; i < RECIPE.length; i++) if (t >= 1.3 + i * 2.4 + 1.7) count++;
    const index = Math.min(2, Math.max(0, Math.floor((t - 1.3) / 2.4)));
    const local = t - 1.3 - index * 2.4;
    const moving = t >= 1.3 && t < 7.8 && local >= .7 && local < 1.7;
    return {
      kind, time: t, count, index, local, moving,
      phase: t < 1.3 ? 'order' : count < 3 ? 'drag' : t < 9.4 ? 'assembled' : t < 10.2 ? 'packing' : 'packed',
      press: t >= 1.3 && t < 7.8 && local >= .35 && local < .7 || t >= 9.1 && t < 9.4,
      shipping: t >= 9.4 && t < 10.2, shipped: t >= 10.2,
      complete: seconds >= DURATION.collect,
      cursor: t >= 1.3 && t < 9.4,
      status: t < 1.3 ? 'Смотрим на детали заказа' : count < 3 ? `Переносим деталь ${count + 1} из 3` : t < 9.4 ? 'Игрушка собрана' : t < 10.2 ? 'Упаковываем подарок' : 'Подарок упакован',
    };
  }
  return {
    kind: 'trash', time: t, armed: t >= 2.25 && t < 4.3, press: t >= 1.9 && t < 2.25 || t >= 3.2 && t < 3.5,
    flying: t >= 3.5 && t < 4.3, clean: t >= 4.3, complete: seconds >= DURATION.trash,
    cursor: t >= 1.3 && t < 4.6,
    phase: t < 1.3 ? 'junk' : t < 2.25 ? 'select-trash' : t < 3.5 ? 'select-slot' : t < 4.3 ? 'clearing' : 'clean',
    status: t < 1.3 ? 'В ячейке появился брак' : t < 2.25 ? 'Выбираем корзину' : t < 3.5 ? 'Выбираем ячейку с браком' : t < 4.3 ? 'Убираем брак в корзину' : 'Ячейка снова свободна',
  };
}

export function createVisibleClock(limit = Infinity) {
  let elapsed = 0, last = null;
  return {
    tick(now, visible = true) {
      if (!visible) { last = null; return elapsed; }
      if (last !== null) elapsed = Math.min(limit, elapsed + Math.max(0, Math.min(100, now - last)) / 1000);
      last = now;
      return elapsed;
    },
    suspend() { last = null; },
  };
}

export function useVisibleElapsed(React, key, running, limit) {
  const [stamp, setStamp] = React.useState({ key, running, elapsed: 0 });
  React.useEffect(() => {
    setStamp({ key, running, elapsed: 0 });
    if (!running) return;
    const clock = createVisibleClock(limit);
    let raf;
    const visibility = () => clock.suspend();
    const tick = now => {
      const time = clock.tick(now, !document.hidden);
      setStamp({ key, running, elapsed: time });
      if (time < limit) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', visibility);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibility); };
  }, [key, running, limit]);
  return stamp.key === key && stamp.running === running ? stamp.elapsed : 0;
}

// The parent keeps its original Next / Skip / Close buttons, but no Next click is necessary.
export function useDemoAdvance(React, ready, step, onNext) {
  const next = React.useRef(onNext); next.current = onNext;
  const fired = React.useRef(false);
  const time = useVisibleElapsed(React, step, ready, NEXT_DELAY);
  React.useEffect(() => { fired.current = false; }, [step, ready]);
  React.useEffect(() => {
    if (ready && time >= NEXT_DELAY && !fired.current) { fired.current = true; next.current(); }
  }, [ready, step, time]);
}
