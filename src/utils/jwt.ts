import jwt, { SignOptions } from 'jsonwebtoken';

export type UserRole = 'admin' | 'user';

export type TokenPayload = {
  sub: string;
  name: string;
  number: string;
  role: UserRole;
};

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is missing in environment variables');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is missing in environment variables');
  }
  return secret;
};

export const signAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, getAccessSecret(), options);
};

export const signRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, getRefreshSecret(), options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
};
