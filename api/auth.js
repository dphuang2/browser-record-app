import nonce from 'nonce';
import Cookies from 'cookies';

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
    res.writeHead(302, {
      Location: installUrl,
    });
    res.end();
    return;
  }
  res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
};
