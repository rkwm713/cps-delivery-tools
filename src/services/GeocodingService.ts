
/**
 * GeocodingService - A service for converting coordinates to addresses
 */

interface GeocodingResult {
  city: string;
  location: string;
  fullAddress: string;
}

/**
 * Get address information from coordinates using the Nominatim OpenStreetMap API
 * @param latitude The latitude coordinate
 * @param longitude The longitude coordinate
 * @returns Promise with the geocoding result or null if the geocoding failed
 */
export const getAddressFromCoordinates = async (
  latitude: number, 
  longitude: number
): Promise<GeocodingResult | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CPSToolApplication/1.0' // Nominatim requires a User-Agent header
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the city and full address
    let city = "";
    let location = "";
    
    if (data.address) {
      // Try different fields for city based on country/region
      city = data.address.city || 
             data.address.town || 
             data.address.village || 
             data.address.county || 
             data.address.state || 
             "";
      
      // Create location string from address components
      const components = [];
      
      if (data.address.road) components.push(data.address.road);
      if (data.address.suburb) components.push(data.address.suburb);
      if (data.address.city) components.push(data.address.city);
      else if (data.address.town) components.push(data.address.town);
      else if (data.address.village) components.push(data.address.village);
      if (data.address.county) components.push(data.address.county);
      if (data.address.state) components.push(data.address.state);
      if (data.address.postcode) components.push(data.address.postcode);
      
      location = components.join(", ");
      
      // If we couldn't create a good location string, use the display_name
      if (!location && data.display_name) {
        location = data.display_name;
      }
    }
    
    return { 
      city, 
      location,
      fullAddress: data.display_name || ""
    };
  } catch (error) {
    console.error("Error in geocoding:", error);
    return null;
  }
};

/**
 * Format a latitude and longitude pair for display
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};
