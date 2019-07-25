require('dotenv').config();
const withCSS = require('@zeit/next-css');

const webpack = require('webpack');

const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY);
const apiSecretKey = JSON.stringify(process.env.SHOPIFY_API_SECRET_KEY);

module.exports = withCSS({
  webpack: (config) => {
    const env = {
      API_KEY: apiKey,
      API_SECRET_KEY: apiSecretKey,
    };
    config.plugins.push(new webpack.DefinePlugin(env));
    return config;
  },
  target: 'serverless',
});
