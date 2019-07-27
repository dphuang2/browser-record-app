/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import { sign } from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET_KEY } = process.env;

export default async (req, res) => {
  const {
    shop, hmac, code, state, timestamp,
  } = req.query;
  const cookies = new Cookies(req, res);
  const stateCookie = cookies.get('state');

  if (state !== stateCookie) {
    res.status(403).send('Request origin cannot be verified');
    return;
  }

  if (shop && hmac && code) {
    // Validate request is from Shopify
    const message = querystring.stringify({
      code,
      shop,
      state,
      timestamp,
    });
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', SHOPIFY_API_SECRET_KEY)
        .update(message)
        .digest('hex'),
      'utf-8',
    );
    let hashEquals = false;

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
    } catch (e) {
      hashEquals = false;
    }

    if (!hashEquals) {
      res.status(400).send('HMAC validation failed');
      return;
    }

    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET_KEY,
      code,
    };
    try {
      const response = await axios.post(accessTokenRequestUrl, accessTokenPayload);
      const accessToken = response.data.access_token;
      cookies.set('token', sign({ shop, accessToken }, SHOPIFY_API_SECRET_KEY), {
        overwite: true,
      });
      res.writeHead(302, {
        Location: `/?shop=${shop}`,
      });
      res.end();
    } catch (error) {
      res.status(500).send(error);
    }
  } else {
    res.status(400).send('Required parameters missing');
  }
};
