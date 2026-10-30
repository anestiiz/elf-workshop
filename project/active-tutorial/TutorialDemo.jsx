import { RECIPE, BELT_PARTS, JUNK_PARTS, DURATION, demoFrame, between, lerpPoint, useVisibleElapsed } from './timeline.mjs';
export { useDemoAdvance } from './timeline.mjs';

// Use the live build's React instance and assets. The legacy project/src/ entry point is older.
export function createTutorialDemo(React, assets, sound) {
  const part = id => assets[`part_${id}`];
  const Pointer = ({ point, pressing }) => <span className={`tp-auto-pointer ${pressing ? 'is-pressing' : ''}`} style={{ left: point.x, top: point.y }} aria-hidden="true">
    <i /><svg viewBox="0 0 28 34" fill="none"><path d="M10 16V5a3 3 0 0 1 6 0v9l1-1a3 3 0 0 1 4 1l1-1a3 3 0 0 1 4 3v7c0 5-3 9-8 9h-3c-3 0-5-1-7-4l-5-7a3 3 0 0 1 4-4l3 3v-4Z" fill="#fff9ef" stroke="#591d04" strokeWidth="1.5" strokeLinejoin="round"/></svg>
  </span>;
  const Badge = ({ children, bad = false }) => <span className={`tp-badge tp-badge--${bad ? 'bad' : 'ok'}`}>{!bad && <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}{children}</span>;

  return function TutorialDemo({ kind, onDone }) {
    const time = useVisibleElapsed(React, kind, true, DURATION[kind]);
    const frame = demoFrame(kind, time);
    const root = React.useRef(null), slot = React.useRef(null), destination = React.useRef(null), trash = React.useRef(null);
    const sources = React.useRef({});
    const [points, setPoints] = React.useState(null);
    const done = React.useRef(false), lastCue = React.useRef('');
    const callback = React.useRef(onDone); callback.current = onDone;
    const [calm] = React.useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    React.useLayoutEffect(() => {
      const measure = () => {
        if (!root.current) return;
        const bounds = root.current.getBoundingClientRect();
        const point = node => {
          if (!node) return { x: bounds.width / 2, y: bounds.height / 2 };
          const r = node.getBoundingClientRect();
          return { x: r.left - bounds.left + r.width / 2, y: r.top - bounds.top + r.height / 2 };
        };
        setPoints({ slot: point(slot.current), destination: point(destination.current), trash: point(trash.current), sources: Object.fromEntries(Object.entries(sources.current).map(([id, node]) => [id, point(node)])), start: { x: bounds.width * .12, y: bounds.height * .68 } });
      };
      measure();
      const observer = new ResizeObserver(measure); observer.observe(root.current);
      return () => observer.disconnect();
    }, [kind]);
    React.useEffect(() => {
      const cue = kind === 'collect' ? frame.count ? `part-${frame.count}` : '' : frame.clean ? 'clean' : frame.armed ? 'trash' : '';
      if (!cue || cue === lastCue.current) return;
      lastCue.current = cue;
      if (frame.clean) sound?.trash?.();
      else if (kind === 'collect') frame.count === 3 ? sound?.toy?.() : sound?.land?.(2);
      else sound?.pick?.();
    }, [kind, frame.count, frame.clean, frame.armed]);
    React.useEffect(() => {
      if (frame.complete && !done.current) { done.current = true; callback.current?.(); }
    }, [frame.complete]);

    let pointer = points?.start, dragPoint = null, shippingPoint = null;
    if (points && kind === 'collect') {
      const source = points.sources[RECIPE[frame.index]] || points.start;
      const from = frame.index === 0 ? points.start : points.slot;
      if (time < 7.8) {
        pointer = frame.local < .35 ? lerpPoint(from, source, between(frame.local, 0, .35)) : frame.local < .7 ? source : lerpPoint(source, points.slot, calm ? 1 : between(frame.local, .7, 1.7));
        if (frame.moving) dragPoint = pointer;
      } else pointer = points.slot;
      if (frame.shipping) shippingPoint = lerpPoint(points.slot, points.destination, calm ? 1 : between(time, 9.4, 10.2));
    } else if (points) {
      pointer = time < 1.9 ? lerpPoint(points.start, points.trash, calm ? 1 : between(time, 1.3, 1.9)) : time < 2.4 ? points.trash : lerpPoint(points.trash, points.slot, calm ? 1 : between(time, 2.4, 3.2));
      if (frame.flying) dragPoint = lerpPoint(points.slot, points.trash, calm ? 1 : between(time, 3.5, 4.3));
    }
    const position = p => ({ left: p.x, top: p.y });
    return <div ref={root} className={`tp-scene tp-autoplay ${kind === 'trash' ? 'tp-scene--trash' : ''}`} style={{ backgroundImage: `url(${assets.bg})` }} data-demo-kind={kind} data-demo-phase={frame.phase} data-demo-parts={frame.count ?? 0} data-demo-complete={frame.complete ? 'true' : 'false'} aria-label={kind === 'collect' ? 'Автоматическая демонстрация сборки подарка' : 'Автоматическая демонстрация очистки брака'}>
      {kind === 'collect' ? <>
        <div className="tp-order"><div className="tp-order-parts">{RECIPE.map((id, i) => <img key={id} src={part(id)} alt="" className={i < frame.count ? 'got' : ''} draggable={false}/>)}</div><div className="tp-order-toy" ref={destination}><img src={frame.shipped ? assets.box_blue : time >= 9.4 ? assets.box_open : assets.toy_wand} alt="" draggable={false}/></div></div>
        <div ref={slot} className={`tp-slot ${frame.moving ? 'tp-target' : ''} ${frame.count === 3 ? 'is-done' : ''}`}>
          <img className="tp-slot-bg" src={assets.slot} alt="" draggable={false}/>
          {frame.count === 3 ? !frame.shipping && !frame.shipped && <img className="tp-slot-toy" src={assets.toy_wand} alt="" draggable={false}/> : RECIPE.slice(0, frame.count).map(id => <img key={id} className="tp-slot-part" src={part(id)} alt="" draggable={false}/>)}
          {frame.count === 3 && <Badge>{frame.shipped ? 'Упаковано' : 'Готово'}</Badge>}
        </div>
        <div className="tp-belt" style={{ backgroundImage: `url(${assets.belt_tile})` }}>{BELT_PARTS.map(id => <span key={id} ref={node => { sources.current[id] = node; }} className="tp-auto-part"><img src={part(id)} alt="" draggable={false} style={{ visibility: RECIPE.indexOf(id) >= 0 && (RECIPE.indexOf(id) < frame.count || frame.moving && id === RECIPE[frame.index]) ? 'hidden' : 'visible' }}/></span>)}</div>
        {dragPoint && <img className="tp-auto-ghost" style={position(dragPoint)} src={part(RECIPE[frame.index])} alt="" draggable={false}/>}
        {shippingPoint && <img className="tp-auto-ghost tp-auto-toy" style={position(shippingPoint)} src={assets.toy_wand} alt="" draggable={false}/>}
      </> : <>
        <div ref={slot} className={`tp-slot tp-slot--big ${frame.armed && !frame.flying ? 'tp-target' : ''}`}>
          <img className="tp-slot-bg" src={assets.slot} alt="" draggable={false}/>
          {!frame.clean && !frame.flying && JUNK_PARTS.map(id => <img key={id} className="tp-slot-part" src={part(id)} alt="" draggable={false}/>)}
          {!frame.clean && !frame.flying && <Badge bad>Брак</Badge>}{frame.clean && <Badge>Чисто</Badge>}
        </div>
        <div ref={trash} className={`tp-trash ${frame.armed ? 'armed' : ''}`}><img src={assets.trash} alt="" draggable={false}/></div>
        {dragPoint && <span className="tp-auto-junk" style={position(dragPoint)}>{JUNK_PARTS.map(id => <img key={id} src={part(id)} alt="" draggable={false}/>)}</span>}
      </>}
      {frame.cursor && pointer && <Pointer point={pointer} pressing={frame.press}/>}
      <span className="tp-auto-status sr-only" role="status" aria-live="polite">{frame.status}</span>
    </div>;
  };
}
