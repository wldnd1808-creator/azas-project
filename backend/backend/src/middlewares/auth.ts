import type { FastifyRequest } from 'fastify';
import { verifyToken, type JwtPayload } from '../jwt.js';

export type AuthenticatedRequest = FastifyRequest & { user?: JwtPayload };

export async function requireAuth(request: AuthenticatedRequest) {
  const header = request.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  const user = await verifyToken(token);
  if (!user) return null;
  request.user = user;
  return user;
}

