import React from 'react';
import App from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { parseCookies } from 'nookies';
import { Provider } from '@shopify/app-bridge-react';
import enTranslations from '@shopify/polaris/locales/en.json';
import { JSON_WEB_TOKEN_COOKIE_KEY } from '../utils/constants';
import { decodeToken, validateToken, redirect } from '../utils/auth';
import '@shopify/polaris/styles.scss';

class MyApp extends App {

  static async getInitialProps({ ctx }) {
    // First check if the shop query parameter is set, redirect if not. Then we
    // verify that the request has a properly signed token using
    // API_SECRET_KEY. We want to check if the accessToken in the json web
    // token is still authorized to confirm that the app is still installed and
    // if the shop parameter matches the one claimed in the query string of the
    // URI. If any of these conditions are not met, redirect user to the proper
    // authorization URI.
    const shopOrigin = ctx.query.shop;
    const authEndpoint = '/auth';
    const authUri = `${authEndpoint}?shop=${shopOrigin}`;
    const token = parseCookies(ctx)[JSON_WEB_TOKEN_COOKIE_KEY];
    if (shopOrigin) {
      if (!await validateToken(token, shopOrigin)) {
        redirect(ctx.res, authUri);
      }
    } else {
      redirect(ctx.res, authEndpoint);
    }
    const decodedToken = decodeToken(token);
    return {
      shopOrigin,
      apiKey: process.env.SHOPIFY_API_KEY,
      decodedToken,
    };
  }

  render() {
    const {
      Component, pageProps, shopOrigin, apiKey, decodedToken
    } = this.props;
    const config = { apiKey, shopOrigin, forceRedirect: false };
    return (
      <Provider config={config}>
        <AppProvider i18n={enTranslations}>
          <Component decodedToken={decodedToken} apiKey={apiKey} shopOrigin={shopOrigin} {...pageProps} />
        </AppProvider>
      </Provider>
    );
  }
}

export default MyApp;
