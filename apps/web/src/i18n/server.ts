import { cookies } from 'next/headers';
import { type Language, LANG_COOKIE_NAME } from './translations';

export { LANG_COOKIE_NAME };

export async function getServerLanguage(): Promise<Language> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LANG_COOKIE_NAME)?.value;
    if (cookieVal === 'my') {
      return 'my';
    }
    return 'en';
  } catch {
    return 'en';
  }
}
