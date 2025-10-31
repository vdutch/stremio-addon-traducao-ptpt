require('dotenv/config');

const manifest = {
  id: 'org.yourname.synopsis.translator',
  version: '1.0.0',
  name: 'Synopsis Translator (Gemini)',
  description: 'Tradução automática de sinopses via Gemini',
  resources: ['meta'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  config: [
    {
      key: 'lang',
      title: 'Idioma da sinopse',
      type: 'select',
      options: ['pt-BR','pt-PT','es-ES','en-US','fr-FR'],
      default: 'pt-PT',
      required: true
    },
    {
      key: 'tone',
      title: 'Tom do texto',
      type: 'select',
      options: ['natural','formal','neutro'],
      default: 'natural',
      required: false
    }
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false
  },
  background: null,
  logo: null,
  encryptionSecret: process.env.JWT_SECRET || undefined
};

module.exports = manifest;
