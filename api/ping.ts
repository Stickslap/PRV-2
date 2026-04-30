import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const keys = Object.keys(process.env).filter(k =>
    k.startsWith('BIG') || k.startsWith('SQUARE') || k === 'NODE_ENV' || k === 'VERCEL'
  );
  res.json({
    ok: true,
    node: process.version,
    env_keys: keys,
    bigcommerce_hash: process.env.BIGCOMMERCE_STORE_HASH ? 'set' : 'MISSING',
    bigcommerce_token: process.env.BIGCOMMERCE_ACCESS_TOKEN ? 'set' : 'MISSING',
  });
}
