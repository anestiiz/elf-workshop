import React from 'react';
import { ASSETS } from '../../assets.js';

// Снежные шапки на кнопке — из макета Figma «Правила» (109:1113 — «corners», 109:1052 — «wide»).
// Снег лежит поверх кнопки, но вне её: у MTS Button overflow: hidden, поэтому кнопка оборачивается.
export function SnowButton({ variant = 'corners', className = '', children }) {
  return (
    <div className={`snow-btn snow-${variant} ${className}`}>
      {children}
      {variant === 'corners' && (
        <>
          <img className="snow snow-l" src={ASSETS.btn_snow_left} alt="" aria-hidden="true" draggable={false} />
          <img className="snow snow-r" src={ASSETS.btn_snow_right} alt="" aria-hidden="true" draggable={false} />
        </>
      )}
      {variant === 'wide' && (
        <img className="snow snow-w" src={ASSETS.btn_snow_wide} alt="" aria-hidden="true" draggable={false} />
      )}
    </div>
  );
}
