// Utility to clear Apollo cache
export const clearApolloCache = async () => {
  try {
    // Get Apollo client from window
    const client = window.apolloClient;
    
    if (client) {
      // Clear the cache
      await client.clearStore();
      console.log('✅ Apollo cache cleared');
    }
    
    // Remove localStorage cache
    localStorage.removeItem('apollo-cache-persist');
    console.log('✅ LocalStorage cache cleared');
    
    // Reload the page
    window.location.reload();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Auto-run on import if query param present
if (window.location.search.includes('clearCache=true')) {
  clearApolloCache();
}
