module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
    'node': true,
  },
  'settings': {
    'react': {
      'version': 'detect',
    },
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    'google',
  ],
  'parserOptions': {
    'ecmaFeatures': {
      'jsx': true,
    },
    'ecmaVersion': 12,
    'sourceType': 'module',
  },
  'plugins': [
    'react',
  ],
  'rules': {
  },
};
