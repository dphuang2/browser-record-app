import React from 'react';
import App, { Container } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { parseCookies } from 'nookies';
import { Provider } from '@shopify/app-bridge-react';
import { validateToken, redirect } from '../utils/auth';
import '@shopify/polaris/styles.css';

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
    const { token } = parseCookies(ctx);
    if (shopOrigin) {
      if (!await validateToken(token, shopOrigin)) {
        redirect(ctx.res, authUri);
      }
    } else {
      redirect(ctx.res, authEndpoint);
    }
    return {
      shopOrigin,
      token,
      apiKey: process.env.SHOPIFY_API_KEY,
    };
  }

  render() {
    const {
      Component, pageProps, shopOrigin, apiKey,
    } = this.props;
    const config = { apiKey, shopOrigin, forceRedirect: true };
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
