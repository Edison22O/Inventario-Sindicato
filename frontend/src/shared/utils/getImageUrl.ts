import api from '@/shared/services/api';

export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  
  // Obtener la URL base configurada (ej. http://localhost:8009)
  const baseURL = (api.defaults.baseURL as string) || 'http://localhost:8009';
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  const serverURL = cleanBaseURL.endsWith('/api') ? cleanBaseURL.slice(0, -4) : cleanBaseURL;

  // Si ya es una URL completa (http:// o https://)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const url = new URL(imagePath);
      // Si la URL generada por Django apunta al host interno de Docker (backend) o al puerto 8000,
      // reescribirla con el host y puerto accesibles del cliente (ej. localhost:8009)
      if (url.hostname === 'backend' || url.port === '8000' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        const targetServer = new URL(serverURL);
        url.protocol = targetServer.protocol;
        url.hostname = targetServer.hostname;
        url.port = targetServer.port;
        return url.toString();
      }
      return imagePath;
    } catch {
      if (imagePath.includes('/media/')) {
        const relative = imagePath.substring(imagePath.indexOf('/media/'));
        return `${serverURL}${relative}`;
      }
      return imagePath;
    }
  }

  // Si la ruta empieza con /media/
  if (imagePath.startsWith('/media/')) {
    return `${serverURL}${imagePath}`;
  }
  
  if (imagePath.startsWith('media/')) {
    return `${serverURL}/${imagePath}`;
  }
  
  if (imagePath.startsWith('/')) {
    return `${serverURL}/media${imagePath}`;
  }
  
  return `${serverURL}/media/${imagePath}`;
};
