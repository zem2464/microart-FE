/**
 * Utility to sync cookies between backend responses and Electron's cookie storage
 * Since file:// protocol doesn't support cookies automatically, we manually manage them
 * Note: Set-Cookie headers are not accessible from JavaScript, so this file is mainly
 * for adding cookies TO requests. The webRequest API in electron.js handles syncing FROM responses.
 */

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql';

/**
 * Get cookies from Electron storage and format for fetch request
 */
export async function getCookiesForRequest() {
  if (!window.electron?.isElectron) return '';
  
  try {
    const targetUrl = new URL(GRAPHQL_URL);
    const candidateOrigins = [targetUrl.origin];

    // Also try HTTPS origin in case secure cookies were stored under https
    if (targetUrl.protocol === 'http:') {
      candidateOrigins.push(`https://${targetUrl.host}`);
    }

    // Fetch cookies from all candidate origins and merge
    const collected = [];
    for (const origin of candidateOrigins) {
      try {
        const chunk = await window.electron.getCookies(origin);
        if (chunk?.length) {
          collected.push(...chunk);
        }
      } catch (err) {
        console.error('[ElectronCookieSync] Error getting cookies for', origin, err);
      }
    }

    if (!collected || collected.length === 0) return '';
    
    // Deduplicate by name to avoid duplicates across origins
    const byName = new Map();
    collected.forEach(c => byName.set(c.name, c));
    const cookies = Array.from(byName.values());

    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log('[ElectronCookieSync] Sending cookies:', cookies.map(c => c.name).join(', '));
    return cookieString;
  } catch (error) {
    console.error('[ElectronCookieSync] Error getting cookies:', error);
    return '';
  }
}

/**
 * Create a custom fetch function that adds cookies for Electron
 */
export function createElectronFetch() {
  const originalFetch = fetch;
  const origin = process.env.REACT_APP_APP_ORIGIN || 'http://localhost:3000';
  
  return async (uri, options = {}) => {
    console.log('[ElectronCookieSync] Making request to:', uri);
    
    // Add cookies from Electron storage to request
    const cookieString = await getCookiesForRequest();
    const headers = {
      ...options.headers,
      Origin: origin,
      Referer: `${origin}/`,
    };

    if (cookieString) {
      console.log('[ElectronCookieSync] Adding Cookie header:', cookieString);
      headers.Cookie = cookieString;
    } else {
      console.log('[ElectronCookieSync] No cookies to send');
    }

    options.headers = headers;

    // Ensure credentials are included so the server can set cookies
    if (!options.credentials) {
      options.credentials = 'include';
    }
    
    // Make request (cookies will be synced by webRequest API in electron.js)
    const response = await originalFetch(uri, options);
    console.log('[ElectronCookieSync] Response status:', response.status);
    
    return response;
  };
}

export default {
  getCookiesForRequest,
  createElectronFetch,
};
