/**
 * PlayBeat Digital mobile app — runtime configuration.
 *
 * The app talks to the SAME backend as the storefront (playbeat.digital/api/*)
 * and the SAME MongoDB customer collection — there is no separate mobile
 * customer database. One account works everywhere.
 */

/** Production API — always https. */
export const API_BASE = 'https://playbeat.digital';

/** Deep-link scheme registered in app.json ("scheme": "playbeat"). */
export const OAUTH_REDIRECT_URI = 'playbeat://oauth/callback';

/** SecureStore keys — deliberately mirror the web localStorage key names. */
export const TOKEN_KEY = 'playbeat_user_token';
export const USER_KEY = 'playbeat_user';

/** App version surfaced to push-token registration. */
export const APP_VERSION = '1.0.0';
