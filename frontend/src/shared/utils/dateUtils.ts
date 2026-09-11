/**
 * Convierte un objeto Date a formato YYYY-MM-DD usando la hora local (evitando desfase por UTC).
 */
export const formatDateToLocalYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convierte un string YYYY-MM-DD a un objeto Date configurado al mediodía local (12:00:00),
 * evitando que la zona horaria (UTC-5) reste o sume un día al llamar métodos locales.
 */
export const parseYYYYMMDDToLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 12, 0, 0);
};
