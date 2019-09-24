/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import { sign } from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';
import {
  isSubscriptionActive,
  getAppSubscriptionConfirmationUrl,
  createTokenObject,
  MONTHLY_CHARGE_AMOUNT,
  TRIAL_DAYS,
} from '../utils/auth';
import { JSON_WEB_TOKEN_COOKIE_KEY } from '../utils/constants';

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

    /**
     * Get access token to get recurring charge url
     */
    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET_KEY,
      code,
    };
    try {
      const response = await axios.post(accessTokenRequestUrl, accessTokenPayload);
      const accessToken = response.data.access_token;
      /**
       * Check if we already have a recurring charge subscription under our
       * name. If we do find one, let the merchant use our app.
       */
      const subscriptionActive = await isSubscriptionActive(shop, accessToken);
      if (subscriptionActive) {
        /**
         * We found the activated recurring charge so we can safely let the
         * merchant use our app
         */
        cookies.set(
          JSON_WEB_TOKEN_COOKIE_KEY,
          sign(createTokenObject(shop, accessToken, true, false), SHOPIFY_API_SECRET_KEY),
          { overwite: true, }
        );
        /**
         * Redirect to the app
         */
        res.writeHead(302, {
          Location: `/?shop=${shop}`,
        });
        res.end();
        return;
      }
      /**
       * Get recurring charge url to redirect to
       */
      const confirmationUrl = await getAppSubscriptionConfirmationUrl(
        shop,
        accessToken,
        `https://${req.headers.host}/auth/billing`,
        MONTHLY_CHARGE_AMOUNT,
        TRIAL_DAYS
      );
      /**
       * Set cookie with shop and access token for validation when entering the
       * app and for the installation process it after successfull billing
       */
      cookies.set(
        JSON_WEB_TOKEN_COOKIE_KEY,
        sign(createTokenObject(shop, accessToken, false, false), SHOPIFY_API_SECRET_KEY),
        { overwite: true, }
      );
      /**
       * Redirect to the recurring charge activation!
       */
      res.writeHead(302, {
        Location: confirmationUrl,
      });
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).send();
    }
  } else {
    res.status(400).send('Required parameters missing');
  }
};
