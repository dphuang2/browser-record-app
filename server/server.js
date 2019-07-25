import Koa from 'koa';
import { sign } from 'jsonwebtoken';
import createShopifyAuth from '@shopify/koa-shopify-auth';
import 'isomorphic-fetch'; // for fetch in node.js

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES } = process.env;

const app = new Koa();

app.use(
  createShopifyAuth({
    apiKey: SHOPIFY_API_KEY,
    secret: SHOPIFY_API_SECRET_KEY,
    scopes: [SCOPES],
    afterAuth(ctx) {
      // TODO: Use provided code in ctx.query.code to get access token to add script tag
      const { query: { shop } } = ctx;
      ctx.cookies.set('token', sign({ shop }, SHOPIFY_API_SECRET_KEY), {
        overwrite: true,
      });
      ctx.redirect(`/?shop=${shop}`);
    },
  }),
);


export default app.callback();
