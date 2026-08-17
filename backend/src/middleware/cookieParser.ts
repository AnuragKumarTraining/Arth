import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
    }
  }
}

export function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.cookies) {
    const cookieHeader = req.headers.cookie;
    const cookies: Record<string, string> = {};

    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        const name = parts[0]?.trim();
        const value = parts.slice(1).join('=').trim();
        if (name) {
          try {
            cookies[name] = decodeURIComponent(value);
          } catch {
            cookies[name] = value;
          }
        }
      });
    }

    req.cookies = cookies;
  }
  next();
}
