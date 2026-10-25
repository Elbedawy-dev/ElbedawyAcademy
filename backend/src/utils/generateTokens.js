import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { sha256 } from './crypto.js';

const ISSUER = 'elbedawy-academy';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
    issuer: ISSUER,
  });
}

export function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  const token = jwt.sign({ sub: String(user._id), jti, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d`,
    issuer: ISSUER,
  });
  return { token, tokenHash: sha256(token), expiresAt };
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER });
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER });
  if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

/**
 * Builds the token pair returned to clients. The refresh token record (hash only)
 * must be persisted by the caller.
 */
export function generateAuthTokens(user) {
  const accessToken = signAccessToken(user);
  const refresh = signRefreshToken(user);
  return {
    accessToken,
    refreshToken: refresh.token,
    refreshRecord: { tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt },
    accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

export const hashToken = sha256;
