import api from '../services/api';

export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  
  // Si ya es una URL completa con http/https
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Obtener la URL base configurada (o por defecto)
  const baseURL = (api.defaults.baseURL as string) || 'http://localhost:8000';
  
  // Limpiar la URL base asegurando que no termine en '/'
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  
  // Extraer el host real, removiendo '/api' si existiera (aunque en este proyecto no se usa el prefijo /api)
  const serverURL = cleanBaseURL.endsWith('/api') ? cleanBaseURL.slice(0, -4) : cleanBaseURL;
  
  // Si la ruta ya incluye /media/
  if (imagePath.startsWith('/media/')) {
    return `${serverURL}${imagePath}`;
  }
  
  if (imagePath.startsWith('media/')) {
    return `${serverURL}/${imagePath}`;
  }
  
  // Si la ruta empieza con un slash pero no es media
  if (imagePath.startsWith('/')) {
    return `${serverURL}/media${imagePath}`;
  }
  
  // Para rutas como 'products/archivo.jpg'
  return `${serverURL}/media/${imagePath}`;
};
