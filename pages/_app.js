import React from 'react';
import App, { Container } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { parseCookies } from 'nookies';
import { Provider } from '@shopify/app-bridge-react';
import { validateToken, redirect } from '../utils/auth';
import '@shopify/polaris/styles.css';

class MyApp extends App {
  static async getInitialProps({ ctx }) {
    // Verify that the request has a properly signed token using API_SECRET_KEY
    // and a "shop" query parameter. We also want to check if the accessToken
    // in the json web token is still authorized to confirm that the app is
    // still installed. If either of these conditions are not met, redirect
    // user to the proper authorization URI.
    const shopOrigin = ctx.query.shop;
    const authEndpoint = '/auth';
    const authUri = `${authEndpoint}?shop=${shopOrigin}`;
    if (shopOrigin) {
      if (!await validateToken(parseCookies(ctx).token, shopOrigin)) {
        redirect(ctx.res, authUri);
      }
    } else {
      redirect(ctx.res, authEndpoint);
    }
    return { shopOrigin, token: parseCookies(ctx).token, API_KEY: process.env.SHOPIFY_API_KEY };
  }

  render() {
    const {
      Component, pageProps, shopOrigin, API_KEY,
    } = this.props;
    const config = { apiKey: API_KEY, shopOrigin, forceRedirect: true };
    return (
      <Container>
        <Provider config={config}>
          <AppProvider>
            <Component shopOrigin={shopOrigin} {...pageProps} />
          </AppProvider>
        </Provider>
      </Container>
    );
  }
}

export default MyApp;
