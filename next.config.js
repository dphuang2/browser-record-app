const { parsed: localEnv } = require('dotenv').config();
const withCSS = require('@zeit/next-css');

module.exports = withCSS({
  env: { localEnv },
  target: 'serverless',
});
