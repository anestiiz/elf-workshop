// src/components/layout/Header.jsx
import { useEffect, useState } from 'react';
import './Header.css';
import MTSHeader from './MTSHeader';

const logoutUrl = 'https://login.mts.ru/amserver/UI/Logout?goto=' + window.location.origin + window.location.pathname

const loginUrl = (() => {
  try {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('auth', '1');
    return currentUrl.toString();
  } catch {
    return window.location.href || '#';
  }
})();

const Header = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (event) => {
      setIsDarkTheme(event.matches);
    };

    setIsDarkTheme(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }

    mediaQuery.addListener(handleThemeChange);
    return () => mediaQuery.removeListener(handleThemeChange);
  }, []);

  return (
    <header className="header">
      <div className="container">
        <div className="header__content">
          <div className="header__logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">
  <rect width="44" height="44" fill="#FF0032"/>
  <path d="M29.3133 3.35336V5.40608H33.7355V13.437L33.7364 13.5693H36.2122V5.40608H40.6343V3.35336H29.3133Z" fill="white"/>
  <path d="M13.3874 3.38394L10.1531 10.0992L6.91875 3.38394H3.38745V13.5378H5.86314V6.2709L9.02457 12.4102H11.2816L14.4439 6.2709V13.5378H16.9196V3.38394H13.3874Z" fill="white"/>
  <path d="M38.1524 37.2292C38.1062 37.6042 37.9353 37.9529 37.6673 38.2191C37.3889 38.4725 37.0466 38.6452 36.6774 38.7185C36.1379 38.8254 35.5886 38.8752 35.0386 38.867C34.453 38.8775 33.8697 38.7921 33.3117 38.6141C32.8543 38.4656 32.4598 38.1681 32.1913 37.7691C31.9213 37.3696 31.7881 36.7928 31.7881 36.0593V35.019C31.7881 34.2801 31.9241 33.7033 32.1913 33.3038C32.4593 32.9056 32.8527 32.6085 33.309 32.4596C33.867 32.2816 34.4504 32.1962 35.036 32.2067C35.5859 32.1985 36.1352 32.2483 36.6748 32.3552C37.0439 32.4288 37.3861 32.6014 37.6646 32.8546C37.9326 33.121 38.1034 33.4696 38.1496 33.8445H40.6272C40.5824 33.0635 40.2845 32.3183 39.7785 31.7216C39.2796 31.1729 38.6337 30.7788 37.9175 30.586C36.9782 30.3381 36.009 30.2221 35.0377 30.2413C33.8507 30.2413 32.8212 30.4123 31.978 30.7488C31.1438 31.07 30.445 31.6675 29.9982 32.4416C29.5617 33.1912 29.3322 34.1919 29.3169 35.4185V35.5311V35.5364V35.6489C29.3322 36.8755 29.5617 37.8763 29.9982 38.6259C30.445 39.4 31.1438 39.9975 31.978 40.3186C32.8221 40.6552 33.8526 40.8261 35.0377 40.8261C36.009 40.8457 36.9783 40.7297 37.9175 40.4815C38.634 40.2894 39.2801 39.8951 39.7785 39.3458C40.2847 38.7492 40.5826 38.0039 40.6272 37.2229L38.1524 37.2292Z" fill="white"/>
          </svg>
          </div>
          <MTSHeader 
            logoutUrl={logoutUrl}
            loginUrl={loginUrl}
            darkTheme={isDarkTheme} 
            queryHideProductsButton={768}
          />         
        </div>
      </div>
    </header>
  );
};

export default Header;
