import React from 'react';
import App, { Container } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { parseCookies } from 'nookies';
import { Provider } from '@shopify/app-bridge-react';
import { redirect, validateToken } from '../utils/auth';
import '@shopify/polaris/styles.css';

class MyApp extends App {
  static getInitialProps({ ctx }) {
    const shopOrigin = ctx.query.shop;
    const authUri = `/auth?shop=${shopOrigin}`;
    if (!shopOrigin || !validateToken(parseCookies(ctx).token, shopOrigin)) {
      redirect(ctx.res, authUri);
    }
    return { shopOrigin };
  }

  render() {
    // pageProps is also a next.js feature
    const { Component, pageProps, shopOrigin } = this.props;
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
