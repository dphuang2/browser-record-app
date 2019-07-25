import Koa from 'koa';
import dotenv from 'dotenv';
import createShopifyAuth, { verifyRequest } from '@shopify/koa-shopify-auth';
import 'isomorphic-fetch'; // for fetch in node.js
import Router from 'koa-router';
import session from 'koa-session';

dotenv.config();
const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES } = process.env;

const app = new Koa();
const router = new Router();

app.use(session(app));

app.keys = [SHOPIFY_API_SECRET_KEY];

app.use(
  createShopifyAuth({
    apiKey: SHOPIFY_API_KEY,
    secret: SHOPIFY_API_SECRET_KEY,
    scopes: [SCOPES],
    afterAuth(ctx) {
      ctx.redirect('/');
    },
  }),
);

router.get('*', verifyRequest(), async (ctx) => {
  ctx.response = false;
  ctx.res.statusCode = 200;
  ctx.redirect('/');
});

app.use(router.allowedMethods());
app.use(router.routes());

export default app.callback();
