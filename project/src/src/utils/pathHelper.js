export const getStaticUrl = (relativePath) => {
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  
  if (typeof window !== 'undefined' && window.BASE_STATIC_URL && window.ENV=='PROD') {
    return `${window.BASE_STATIC_URL}${cleanPath}`;
  }

  if (typeof window !== 'undefined' && window.BASE_STATIC_URL && window.ENV=='DEV') {
    return `/${cleanPath}`;
  }
  
  return `/${cleanPath}`;
};

export const getBaseStaticUrl = () => {
  if (typeof window !== 'undefined' && window.BASE_STATIC_URL) {
    return window.BASE_STATIC_URL;
  }
  return '/';
};