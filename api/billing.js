import Cookies from 'cookies';
import { sign, verify } from 'jsonwebtoken';
import {
    ACTIVATED_STATUS,
    installScriptTag,
    createTokenObject,
    getRecurringChargeObject
} from '../utils/auth';
import { JSON_WEB_TOKEN_COOKIE_KEY } from '../utils/constants';
import connectToDatabase from '../utils/db';
import Shop from './models/Shop';

const { MONGODB_URI, SHOPIFY_API_SECRET_KEY } = process.env;

export default async (req, res) => {
    const cookies = new Cookies(req, res);
    const token = cookies.get(JSON_WEB_TOKEN_COOKIE_KEY);
    try {
        const decoded = verify(token, SHOPIFY_API_SECRET_KEY);
        const { shop, accessToken } = decoded;
        /**
         * Verify that the recurring charge object is activated
         */
        const response = await getRecurringChargeObject(
            shop,
            accessToken,
            `gid://shopify/AppSubscription/${req.query.charge_id}`
        );
        const status = response.node.status;
        /**
         * Handle inactive recurring charge by redirecting to beginning of auth flow
         */
        if (status !== ACTIVATED_STATUS) {
            res.writeHead(302, {
                Location: `/?shop=${shop}`,
            });
            res.end();
            return;
        }
        /**
         * Persist this recurring charge in db
         */
        await connectToDatabase(MONGODB_URI);
        await Shop.updateOne({ shop }, {
            shop,
            appSubscriptionId: req.query.charge_id
        }, { upsert: true });
        /**
         * Install the script tag
         */
        await installScriptTag(shop, accessToken);
        /**
         * Set recurringChargeActivated boolean to true to allow merchant to use
         * app
         */
        cookies.set(
            JSON_WEB_TOKEN_COOKIE_KEY,
            sign(createTokenObject(shop, accessToken, true, true), SHOPIFY_API_SECRET_KEY),
            { overwite: true, }
        );
        res.writeHead(302, {
            Location: `/?shop=${shop}`,
        });
        res.end();
    } catch (error) {
        res.writeHead(302, {
            Location: '/',
        });
        res.end();
    }
}