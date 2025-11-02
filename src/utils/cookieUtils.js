// src/utils/cookieUtils.js

/**
 * Utility functions for handling cookies created by the backend API
 * Based on HMS implementation
 */

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  return null;
};

/**
 * Get all cookies as an object
 * @returns {object} - Object with cookie names as keys and values as values
 */
export const getAllCookies = () => {
  if (typeof document === 'undefined') return {};
  
  return document.cookie
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }, {});
};

/**
 * Check if a cookie exists
 * @param {string} name - Cookie name
 * @returns {boolean} - True if cookie exists, false otherwise
 */
export const hasCookie = (name) => {
  return getCookie(name) !== null;
};

/**
 * Get authentication token from various possible cookie names
 * Backend APIs commonly use different cookie names for JWT tokens
 * @returns {string|null} - Auth token or null if not found
 */
export const getAuthToken = () => {
  // Common cookie names for auth tokens
  const possibleTokenNames = [
    'authToken',
    'token', 
    'accessToken',
    'jwt',
    'authorization',
    'auth_token',
    'access_token'
  ];
  
  for (const tokenName of possibleTokenNames) {
    const token = getCookie(tokenName);
    if (token) {
      return token;
    }
  }
  
  return null;
};

/**
 * Get refresh token from cookies
 * @returns {string|null} - Refresh token or null if not found
 */
export const getRefreshToken = () => {
  const possibleRefreshNames = [
    'refreshToken',
    'refresh_token',
    'refresh',
    'rt'
  ];
  
  for (const tokenName of possibleRefreshNames) {
    const token = getCookie(tokenName);
    if (token) {
      return token;
    }
  }
  
  return null;
};

/**
 * Debug function to log all available cookies
 * Useful for development to see what cookies the backend is setting
 */
export const debugCookies = () => {
  console.log('All available cookies:', getAllCookies());
  console.log('Auth token:', getAuthToken());
  console.log('Refresh token:', getRefreshToken());
  console.log('Raw document.cookie:', document.cookie);
};

/**
 * Clear a cookie by setting it to expire in the past
 * Note: This only works for cookies that don't have the HttpOnly flag
 * @param {string} name - Cookie name
 * @param {string} path - Cookie path (default: '/')
 * @param {string} domain - Cookie domain (optional)
 */
export const clearCookie = (name, path = '/', domain = null) => {
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  if (domain) {
    cookieString += ` domain=${domain};`;
  }
  document.cookie = cookieString;
};

/**
 * Set a cookie (client-side)
 * Note: Backend-set cookies are usually preferred for auth tokens
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days
 * @param {string} path - Cookie path (default: '/')
 * @param {boolean} secure - Use secure flag (default: true)
 * @param {boolean} httpOnly - Use httpOnly flag (default: false, can't be set from JS)
 */
export const setCookie = (name, value, days = 7, path = '/', secure = true, sameSite = 'strict') => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}; SameSite=${sameSite}`;
  
  if (secure && window.location.protocol === 'https:') {
    cookieString += '; Secure';
  }
  
  document.cookie = cookieString;
};