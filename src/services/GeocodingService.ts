
/**
 * GeocodingService - A service for converting coordinates to addresses
 */

interface GeocodingResult {
  city: string;
  location: string;
  fullAddress: string;
}

/**
 * Enhanced result that focuses on the closest physical address
 */
interface ClosestAddressResult {
  formattedAddress: string;  // The full formatted address string
  streetAddress: string;     // Just the street-level address (road + house number if available)
  city: string;              // City/town/village
  state: string;             // State/province
  postalCode: string;        // Zip/postal code
}

/**
 * Get the closest street address from coordinates using the Nominatim OpenStreetMap API
 * This function prioritizes street-level address details for precise location reporting
 * 
 * @param latitude The latitude coordinate
 * @param longitude The longitude coordinate
 * @returns Promise with the closest address result or null if the geocoding failed
 */
export const getClosestAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<ClosestAddressResult | null> => {
  try {
    // Use zoom parameter 18 for street-level detail
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CPSToolApplication/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('No address data returned from geocoding service');
    }
    
    // Extract address components
    const { address } = data;
    
    // Build street-level address (house number + road)
    let streetAddress = "";
    if (address.house_number) {
      streetAddress = `${address.house_number} `;
    }
    
    if (address.road) {
      streetAddress += address.road;
    } else if (address.pedestrian) {
      streetAddress += address.pedestrian;
    } else if (address.street) {
      streetAddress += address.street;
    } else if (address.path) {
      streetAddress += address.path;
    } else if (address.footway) {
      streetAddress += address.footway;
    }
    
    // If we have no street address but have a neighborhood/suburb
    if (!streetAddress && (address.neighbourhood || address.suburb)) {
      streetAddress = address.neighbourhood || address.suburb;
    }
    
    // Get city information
    const city = address.city || 
                address.town || 
                address.village || 
                address.hamlet ||
                address.county || 
                "";
                
    // Get state
    const state = address.state || "";
    
    // Get postal code
    const postalCode = address.postcode || "";
    
    // Create a formatted address that focuses on the precise location
    let formattedAddress = streetAddress;
    
    // Add neighborhood if available and not already part of street address
    if (address.neighbourhood && !streetAddress.includes(address.neighbourhood)) {
      formattedAddress += formattedAddress ? `, ${address.neighbourhood}` : address.neighbourhood;
    } else if (address.suburb && !streetAddress.includes(address.suburb)) {
      formattedAddress += formattedAddress ? `, ${address.suburb}` : address.suburb;
    }
    
    // Add city, state, postal code
    if (city && !formattedAddress.includes(city)) {
      formattedAddress += formattedAddress ? `, ${city}` : city;
    }
    
    if (state && !formattedAddress.includes(state)) {
      formattedAddress += formattedAddress ? `, ${state}` : state;
    }
    
    if (postalCode && !formattedAddress.includes(postalCode)) {
      formattedAddress += formattedAddress ? ` ${postalCode}` : postalCode;
    }
    
    // If we couldn't create a good address, fall back to display_name
    if (!formattedAddress && data.display_name) {
      formattedAddress = data.display_name;
    }
    
    return {
      formattedAddress,
      streetAddress,
      city,
      state,
      postalCode
    };
  } catch (error) {
    console.error("Error finding closest address:", error);
    return null;
  }
};

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
