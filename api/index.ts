import type { VercelRequest, VercelResponse } from '@vercel/node';

let _app: any = null;
let _initErr: any = null;

// Load server lazily and capture any init errors
async function getApp() {
  if (_app) return _app;
  if (_initErr) throw _initErr;
  try {
    const mod = await import('../server');
    _app = mod.default;
    return _app;
  } catch (err) {
    _initErr = err;
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err: any) {
    res.status(500).json({
      error: 'Server initialization failed',
      message: err?.message,
      name: err?.name,
      stack: (err?.stack || '').split('\n').slice(0, 8),
    });
  }
}
