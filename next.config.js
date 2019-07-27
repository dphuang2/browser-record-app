const { parsed: localEnv } = require('dotenv').config();
const withCSS = require('@zeit/next-css');
const WebpackBar = require('webpackbar');

module.exports = withCSS({
  env: { localEnv },
  target: 'serverless',
  webpack: (config) => {
    config.plugins.push(new WebpackBar());
    return config;
  },
});
