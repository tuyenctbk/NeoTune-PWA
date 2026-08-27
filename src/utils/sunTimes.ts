/**
 * Astronomical Solar Sunrise/Sunset Calculator Utility
 * Calculates sunrise and sunset hours in decimal local time based on GPS coordinates.
 */

export interface SunTimes {
  sunrise: number; // Hour of day in decimal local time (e.g., 6.25 for 06:15)
  sunset: number;  // Hour of day in decimal local time (e.g., 18.5 for 18:30)
}

/**
 * Calculates local sunrise and sunset decimal hours for a given lat/lng and date.
 * If geolocation is unavailable or calculations fail, falls back to standard 6 AM / 6 PM.
 */
export function getSunTimes(lat: number, lng: number, date: Date = new Date()): SunTimes {
  try {
    // Day of the year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Convert latitude to radians
    const latRad = (lat * Math.PI) / 180;
    
    // Declination of the sun (approximate in radians)
    const declination = 0.409 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
    
    // Sunset hour angle (zenith angle of 90.833 degrees accounts for solar disc refraction)
    const cosH = (Math.sin(-0.0145) - Math.sin(latRad) * Math.sin(declination)) / (Math.cos(latRad) * Math.cos(declination));
    
    let H = 0;
    if (cosH >= 1) {
      // Polar night - sun never rises
      return { sunrise: 12, sunset: 12 };
    } else if (cosH <= -1) {
      // Polar day - sun never sets
      return { sunrise: 0, sunset: 24 };
    } else {
      H = Math.acos(cosH);
    }
    
    // Time offset in hours from solar noon
    const timeOffset = (H * 12) / Math.PI;
    
    // Calculate solar noon in standard local time
    const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
    const standardMeridian = timezoneOffsetHours * 15;
    const solarNoonAdjustment = (standardMeridian - lng) / 15; // Longitude correction (4 min per degree)
    
    // Equation of time (Earth orbital eccentricity correction in hours)
    const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
    const eqTime = (9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)) / 60;
    
    const solarNoon = 12 + solarNoonAdjustment - eqTime;
    
    const sunrise = Math.max(0, Math.min(24, solarNoon - timeOffset));
    const sunset = Math.max(0, Math.min(24, solarNoon + timeOffset));
    
    return { sunrise, sunset };
  } catch (error) {
    console.warn('Error calculating solar times, falling back to default 6 AM / 6 PM:', error);
    return { sunrise: 6.0, sunset: 18.0 };
  }
}
