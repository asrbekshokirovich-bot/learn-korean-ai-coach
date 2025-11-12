import { translations } from './translations';
import { settingsTranslations } from './translations-settings';

// Merge settings translations into main translations object
export const mergedTranslations = {
  uz: { ...translations.uz, ...settingsTranslations.uz },
  en: { ...translations.en, ...settingsTranslations.en },
  ko: { ...translations.ko, ...settingsTranslations.ko },
  ru: { ...translations.ru, ...settingsTranslations.ru },
};

// Re-export with merged translations as the default export
export { mergedTranslations as translations };
export type { Language } from './translations';
