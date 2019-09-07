const { parsed: localEnv } = require('dotenv').config();
const withSass = require('@zeit/next-sass');
const withCSS = require('@zeit/next-css');
const WebpackBar = require('webpackbar');

module.exports = withCSS(withSass({
  env: { localEnv },
  target: 'serverless',
  webpack: (config) => {
    config.plugins.push(new WebpackBar());
    return config;
  },
}));
