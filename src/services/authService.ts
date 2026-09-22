import { ensureSeeded, getAll, put, STORES } from '@/db/database';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { UserRecord } from './types';

export interface LocalAuthResult {
  username: string;
  role: 'ADMIN' | 'USER';
}

async function findUser(username: string): Promise<UserRecord | undefined> {
  const users = await getAll<UserRecord>(STORES.users);
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function login(username: string, password: string): Promise<LocalAuthResult> {
  await ensureSeeded();

  const user = await findUser(username);
  if (!user || !user.enabled) {
    throw new Error('Incorrect username or password.');
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new Error('Incorrect username or password.');
  }
  return { username: user.username, role: user.role };
}

export async function changePassword(username: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await findUser(username);
  if (!user) throw new Error('User not found.');
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new Error('Current password is incorrect.');

  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await put(STORES.users, user);
}
