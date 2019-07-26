import React from 'react';
import Router from 'next/router';
import App, { Container } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { parseCookies } from 'nookies';
import { Provider } from '@shopify/app-bridge-react';
import { redirect, validateToken } from '../utils/auth';
import '@shopify/polaris/styles.css';

class MyApp extends App {
  static getInitialProps({ ctx }) {
    // Verify that the request has a properly signed token using API_SECRET_KEY
    // and a "shop" query parameter. If not, redirect it to the proper
    // authorization URI.
    const shopOrigin = ctx.query.shop;
    const authEndpoint = '/auth';
    const authUri = `${authEndpoint}?shop=${shopOrigin}`;
    if (shopOrigin) {
      if (!validateToken(parseCookies(ctx).token, shopOrigin)) {
        redirect(ctx.res, authUri);
      }
    } else {
      redirect(ctx.res, authEndpoint);
    }
    return { shopOrigin, token: parseCookies(ctx).token };
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
