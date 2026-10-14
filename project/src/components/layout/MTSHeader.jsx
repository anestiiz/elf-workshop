import React, { useEffect, useRef } from 'react';


const MTSProfileWidget = ({ 
  logoutUrl, 
  loginUrl,
  darkTheme = false,
  queryHideProductsButton = 768
}) => {
  const widgetRef = useRef(null);
  const containerId = 'name-profile';
  const widgetTheme = darkTheme ? 'dark' : 'light';

  useEffect(() => {
    // Check if the widget constructor is available
    if (typeof profileWidgetApp === 'undefined') {
      console.error('profileWidgetApp is not defined. Make sure the widget script is loaded.');
      return;
    }

    // Create the widget
    const widget = new profileWidgetApp({
      target: document.getElementById(containerId),
      props: {
        loginEndpoint: loginUrl,
        logoutEndpoint: logoutUrl,
        serviceManageEndpoint: false,
        queryHideProductsButton: queryHideProductsButton,
        theme: widgetTheme,
      }
    });

    // Store the widget instance for cleanup
    widgetRef.current = widget;

    // Cleanup function to destroy the widget
    return () => {
      if (widgetRef.current) {
        // Check for common widget destruction methods
        if (widgetRef.current.$destroy) {
          widgetRef.current.$destroy();
        } else if (widgetRef.current.destroy) {
          widgetRef.current.destroy();
        } else if (widgetRef.current.unmount) {
          widgetRef.current.unmount();
        }
        widgetRef.current = null;
      }
    };
  }, [logoutUrl, loginUrl, queryHideProductsButton, widgetTheme]); // Recreate if props change

  return (
    <div 
      id={containerId}
      className="profile-widget-container"
    />
  );
};

export default MTSProfileWidget;
