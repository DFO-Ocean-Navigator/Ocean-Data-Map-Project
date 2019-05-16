import LngDetector from "i18next-browser-languagedetector"; 
//import { changeLanguage } from "i18next/dist/commonjs";
import i18n from "i18next";
//var i18next = require("i18next"); //.default;


i18n
  .init({
    lng: "en",
    nsSeparator: false,
    keySeparator: false,
    whitelist: ["en", "fr"],
    fallbackLng: ["en"],
    resources: {
      fr: {
        translation: require("../../translations/fr.json"),
      },
      en: {
        translation: require("../../translations/en.json"),
      },
    },
  });


module.exports = i18n;
