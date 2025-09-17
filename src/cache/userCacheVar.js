import { makeVar } from "@apollo/client";

// Apollo cache variable for user data
export const userCacheVar = makeVar(null);

// Apollo cache variable for login status
export const isLoggedIn = makeVar(false);

// Apollo cache variable for user data (similar to meUserData)
export const meUserData = makeVar(null);

// Apollo cache variable for application loading state
export const isApplicationLoading = makeVar(true);