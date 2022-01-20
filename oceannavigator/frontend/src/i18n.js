import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

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
        translation: require("../../translations/fr.json"),
      },
      en: {
        translation: require("../../translations/en.json"),
      },
    },
  });

export default i18n;
