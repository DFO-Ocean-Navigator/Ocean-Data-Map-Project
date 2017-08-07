module.exports = {
   
  "env": {
    "browser": true,
    "es6": true,
    "node" : true,
  },
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "parserOptions": {
    "ecmaFeatures": {
      "experimentalObjectRestSpread": true,
      "jsx": true,
      "templateStrings": true
    },
    "sourceType": "module"
  },
  "plugins": [
    "react"
  ],
  "rules": {
    "indent": [
      "error",
      2,
      {
        "SwitchCase": 1
      }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "always"
    ],
    "curly": [
      "error",
      "all"
    ],
    "no-console": [
      "error",
      {
        "allow": ["warn", "error"]
      }
    ],
    "no-unused-vars": [
      "error",
      {
        "varsIgnorePattern": "i18n",
        "args": "none"
      }
    ],
    "max-len": [
      "error",
      {
        "code": 80,
        "ignoreStrings": true
      }
    ],
    "react/jsx-uses-vars": "error",
    "react/jsx-uses-react": "error",
  },
  "globals": {
    "$": true,
    "jQuery": true,
    "_": true,
    "require": true,
  }
};
