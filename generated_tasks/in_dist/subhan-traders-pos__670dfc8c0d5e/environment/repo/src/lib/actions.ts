'use server';

import { auth } from '@/auth';
import { headers } from 'next/headers';

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}
