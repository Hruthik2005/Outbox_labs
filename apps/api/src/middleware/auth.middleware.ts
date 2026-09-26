import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/crypto.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../config/database.js';

interface SessionPayload {
  userId: string;
  email: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies.reachinbox_session) {
    token = req.cookies.reachinbox_session;
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    return;
  }

  const payload = verifyToken<SessionPayload>(token);
  if (!payload || !payload.userId) {
    sendError(res, 'Invalid or expired session', 401, 'INVALID_SESSION');
    return;
  }

  // Verify user still exists in database
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      sendError(res, 'User no longer exists', 401, 'USER_NOT_FOUND');
      return;
    }

    req.userId = user.id;
    next();
  } catch {
    // If DB check fails, fallback to session payload
    req.userId = payload.userId;
    next();
  }
}
