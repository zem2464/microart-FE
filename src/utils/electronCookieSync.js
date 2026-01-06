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
 * Remove auth-related cookies from Electron session to force logout
 */
export async function clearElectronCookies(cookieNames = ['authToken', 'refreshToken']) {
  console.log('========================================');
  console.log('[ElectronCookieSync] CLEARING COOKIES FOR LOGOUT');
  console.log('[ElectronCookieSync] Timestamp:', new Date().toISOString());
  console.log('[ElectronCookieSync] window.electron available:', !!window.electron);
  console.log('[ElectronCookieSync] window.electron.isElectron:', window.electron?.isElectron);
  console.log('[ElectronCookieSync] Cookies to clear:', cookieNames);
  
  if (!window.electron?.isElectron) {
    console.log('[ElectronCookieSync] Not in Electron environment - skipping');
    console.log('========================================');
    return;
  }

  try {
    const targetUrl = new URL(GRAPHQL_URL);
    const origins = [targetUrl.origin];

    // Also try HTTPS origin in case secure cookies were stored under https
    if (targetUrl.protocol === 'http:') {
      origins.push(`https://${targetUrl.host}`);
    }

    // Include cookie domain overrides if provided
    const configuredDomain = process.env.COOKIE_DOMAIN || process.env.REACT_APP_COOKIE_DOMAIN;
    if (configuredDomain) {
      const normalized = configuredDomain.startsWith('.')
        ? configuredDomain.slice(1)
        : configuredDomain;
      origins.push(`https://${normalized}`);
      origins.push(`http://${normalized}`);
    }

    const uniqueOrigins = Array.from(new Set(origins.filter(Boolean)));
    console.log('[ElectronCookieSync] Origins to check:', uniqueOrigins);

    let successCount = 0;
    let failCount = 0;

    for (const origin of uniqueOrigins) {
      console.log(`[ElectronCookieSync] Processing origin: ${origin}`);
      for (const name of cookieNames) {
        try {
          console.log(`[ElectronCookieSync] Attempting to remove cookie: ${name} from ${origin}`);
          
          // Verify removeCookie function exists
          if (typeof window.electron.removeCookie !== 'function') {
            console.error(`[ElectronCookieSync] ✗ window.electron.removeCookie is not a function!`);
            failCount++;
            continue;
          }
          
          await window.electron.removeCookie(`${origin}/`, name);
          console.log(`[ElectronCookieSync] ✓ Successfully removed cookie ${name} for ${origin}`);
          successCount++;
        } catch (err) {
          console.error(`[ElectronCookieSync] ✗ Error removing cookie ${name} for ${origin}:`, err);
          console.error(`[ElectronCookieSync] Error stack:`, err.stack);
          failCount++;
        }
      }
    }
    
    console.log('[ElectronCookieSync] Cookie clearing summary:');
    console.log(`[ElectronCookieSync] - Success: ${successCount}`);
    console.log(`[ElectronCookieSync] - Failed: ${failCount}`);
    console.log('========================================');
    
  } catch (error) {
    console.error('========================================');
    console.error('[ElectronCookieSync] ✗✗✗ CRITICAL ERROR clearing cookies:', error);
    console.error('[ElectronCookieSync] Error stack:', error.stack);
    console.error('========================================');
    throw error; // Re-throw so logout process knows cookies weren't cleared
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
  clearElectronCookies,
  createElectronFetch,
};
