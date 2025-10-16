/**
 * Returns the current date and time
 */
export function now(): Date {
  return new Date();
}

/**
 * Adds a specified number of minutes to a date
 * @param date - The base date
 * @param minutes - Number of minutes to add
 * @returns New date with added minutes
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}
