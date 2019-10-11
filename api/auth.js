import nonce from 'nonce';
import Cookies from 'cookies';
import {
  HTTP_FOUND,
  HTTP_BAD_REQUEST
} from '../utils/constants';

export default async (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const state = nonce()();
    const installUrl = `https://${shop
      }/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY
      }&scope=${process.env.SCOPES
      }&state=${state
      }&redirect_uri=https://${req.headers.host}/auth/callback`;

    const cookies = new Cookies(req, res);
    cookies.set('state', state);
    res.writeHead(HTTP_FOUND, {
      Location: installUrl,
    });
    res.end();
    return;
  }
  res.status(HTTP_BAD_REQUEST).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
};
