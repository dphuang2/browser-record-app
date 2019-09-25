import React from 'react';
import App from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { setCookie, parseCookies } from 'nookies';
import { sign } from 'jsonwebtoken';
import { Provider } from '@shopify/app-bridge-react';
import enTranslations from '@shopify/polaris/locales/en.json';
import { JSON_WEB_TOKEN_COOKIE_KEY } from '../utils/constants';
import { isTokenValid, redirect, createTokenObject } from '../utils/auth';
import '@shopify/polaris/styles.scss';


const { SHOPIFY_API_SECRET_KEY } = process.env;

class MyApp extends App {

  static async getInitialProps({ ctx }) {
    // First check if the shop query parameter is set, redirect if not. Then we
    // verify that the request has a properly signed token using
    // API_SECRET_KEY. We want to check if the accessToken in the json web
    // token is still authorized to confirm that the app is still installed and
    // if the shop parameter matches the one claimed in the query string of the
    // URI. If any of these conditions are not met, redirect user to the proper
    // authorization URI.
    const authEndpoint = '/auth';
    const shopOrigin = ctx.query.shop;
    if (!shopOrigin) {
      redirect(ctx.res, authEndpoint);
      return;
    }
    const authUri = `${authEndpoint}?shop=${shopOrigin}`;
    const token = parseCookies(ctx)[JSON_WEB_TOKEN_COOKIE_KEY];
    if (!token) {
      redirect(ctx.res, authUri);
      return;
    }
    const { tokenVerified, decodedToken } = await isTokenValid(token, shopOrigin);
    if (!tokenVerified) {
      redirect(ctx.res, authUri);
      return;
    }
    const jwt = sign(
      createTokenObject(
        decodedToken.shop,
        decodedToken.accessToken,
        decodedToken.recurringChargeActivated,
        decodedToken.redirectedFromBilling,
        decodedToken.visitCount + 1
      ),
      SHOPIFY_API_SECRET_KEY,
    );
    setCookie(ctx, JSON_WEB_TOKEN_COOKIE_KEY, jwt);
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
