import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Import messages statically
import en from '../../messages/en.json';
import ur from '../../messages/ur.json';

export const locales = ['en', 'ur'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const messages = {
  en,
  ur,
} as const;

export default getRequestConfig(async () => {
  // Get locale from cookie or default
  const cookieStore = await cookies();
  const localeValue = cookieStore.get('locale')?.value;
  const locale = (localeValue === 'ur' ? 'ur' : 'en') as Locale;

  return {
    locale,
    messages: messages[locale],
  };
});
