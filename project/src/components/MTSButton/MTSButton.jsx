import React, { forwardRef } from 'react';
import './MTSButton.css';

// Компонент спиннера
const Spinner = ({ variant, size = 20 }) => {
  const isLightSpinner = ['primary', 'primary-alternative', 'blur'].includes(variant);

  return (
    <span
      className={[
        'mts-button-spinner',
        isLightSpinner ? 'mts-button-spinner--light' : 'mts-button-spinner--dark',
      ].join(' ')}
      style={{
        width: size,
        height: size,
      }}
      aria-hidden="true"
    />
  );
};

// Основной компонент кнопки
export const MTSButton = forwardRef((props, ref) => {
  const {
    disabled = false,
    variant = 'primary',
    size = 44,
    waiting,
    type = 'button',
    fluid = false,
    contextBackgroundColor,
    onClick,
    onBlur,
    onFocus,
    children,
    tabIndex,
    className = '',
    role,
    ariaLabel,
    ariaDescription,
    ...restProps
  } = props;

  const showSpinner = Boolean(waiting);

  const buttonClasses = [
    'mts-button',
    `mts-button--${variant}`,
    `mts-button--size-${size}`,
    disabled ? 'mts-button--disabled' : '',
    fluid ? 'mts-button--fluid' : '',
    contextBackgroundColor ? `mts-button--context-${contextBackgroundColor}` : '',
    showSpinner ? 'mts-button--waiting' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  let spinnerContent = null;

  if (showSpinner) {
    if (typeof waiting === 'function') {
      spinnerContent = waiting({
        buttonVariant: variant,
        buttonSize: size,
      });
    } else {
      spinnerContent = <Spinner variant={variant} />;
    }
  }

  const ariaAttributes = {};

  if (ariaLabel) {
    ariaAttributes['aria-label'] = ariaLabel;
  }

  if (ariaDescription) {
    ariaAttributes['aria-describedby'] = ariaDescription;
  }

  if (showSpinner) {
    ariaAttributes['aria-busy'] = 'true';
  }

  if (disabled || showSpinner) {
    ariaAttributes['aria-disabled'] = 'true';
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || showSpinner}
      className={buttonClasses}
      onClick={onClick}
      onBlur={onBlur}
      onFocus={onFocus}
      tabIndex={tabIndex}
      role={role}
      {...ariaAttributes}
      {...restProps}
    >
      <span className="mts-button__content">
        {showSpinner ? (
          <span className="mts-button__spinner-wrapper">
            {spinnerContent}
          </span>
        ) : (
          <span className="mts-button__text">{children}</span>
        )}
      </span>
    </button>
  );
});

MTSButton.displayName = 'MTSButton';