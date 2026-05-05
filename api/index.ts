import type { Request, Response } from 'express';

// Wrap import in try/catch so crash details surface as JSON instead of Vercel's generic 500
export default async function handler(req: Request, res: Response) {
  try {
    const { default: app } = await import('../server.js');
    app(req, res);
  } catch (e: any) {
    console.error('[api/index] Server module failed to load:', e);
    res.status(500).json({
      error: 'Server module failed to load',
      message: e?.message || String(e),
      code: e?.code,
      stack: e?.stack?.split('\n').slice(0, 6)
    });
  }
}
