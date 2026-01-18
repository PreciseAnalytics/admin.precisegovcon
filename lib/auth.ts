import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const IP_WHITELIST = process.env.IP_WHITELIST 
  ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim())
  : [];

export interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function checkIPWhitelist(ip: string): boolean {
  if (IP_WHITELIST.length === 0) {
    return true;
  }
  return IP_WHITELIST.includes(ip);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      console.log('No token found in cookies');
      return null;
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      console.log('Invalid token payload');
      return null;
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: null,
      role: payload.role,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized - No valid session');
  }

  return session;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden - Admin access required');
  }

  return session;
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return '127.0.0.1';
}