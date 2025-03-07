/**
 * Utility functions for data processing and optimization
 */

/**
 * Samples a large dataset to reduce the number of points while preserving the overall shape
 * @param data The array of data to sample
 * @param maxPoints The maximum number of points to return
 * @returns A sampled subset of the original data
 */
export function sampleDataPoints<T>(data: T[], maxPoints: number): T[] {
  if (!data || data.length === 0) return [];
  
  // If we have fewer points than the maximum, return all data
  if (data.length <= maxPoints) return data;
  
  // Calculate the sampling interval
  const interval = Math.ceil(data.length / maxPoints);
  
  // Sample the data at regular intervals
  return data.filter((_, index) => index % interval === 0).slice(0, maxPoints);
}

/**
 * Optimizes memory usage by limiting the history size
 * @param currentHistory Current history array
 * @param newItem New item to add
 * @param maxSize Maximum size of the history array
 * @returns Updated history array with limited size
 */
export function addToLimitedHistory<T>(currentHistory: T[], newItem: T, maxSize: number): T[] {
  const newHistory = [...currentHistory, newItem];
  return newHistory.length > maxSize ? newHistory.slice(-maxSize) : newHistory;
}

/**
 * Checks if data should be fetched based on cache timeout
 * @param lastFetchTime Timestamp of the last fetch
 * @param cacheTimeout Cache timeout in milliseconds
 * @returns Boolean indicating if data should be fetched
 */
export function shouldFetchData(lastFetchTime: number, cacheTimeout: number): boolean {
  const now = Date.now();
  return now - lastFetchTime > cacheTimeout;
}