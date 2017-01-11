import LngDetector from 'i18next-browser-languagedetector';

var i18n = require('i18next');

i18n
    .use(LngDetector)
    .init({
        nsSeparator: false,
        keySeparator: false,
        whitelist: ['en', 'fr'],
        resources: {
            fr: {
                translation: require('../../translations/fr.json'),
            },
            en: {
                translation: require('../../translations/en.json'),
            },
        },
    });

module.exports = i18n;

