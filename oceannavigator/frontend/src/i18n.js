import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import frTranslation from "../../translations/fr.json";
import enTranslation from "../../translations/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false, // toggle to true to see debug output in browser console
    nsSeparator: false,
    keySeparator: false,
    supportedLngs: ["en", "fr"],
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: {
        translation: frTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
  });

export default i18n;
