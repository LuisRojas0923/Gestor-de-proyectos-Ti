// Exportar el sistema de logging
export { logger, development, phases, api, modal, validation, debug } from './logger';

export const normalizeArea = (value: string): string =>
  value
    .toUpperCase()
    .replace(new RegExp('[^A-ZÁÉÍÓÚÜÑÀÈÌÒÙÂÊÎÔÛÄËÏÖÜ0-9\\s\\-&$()/.]', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
