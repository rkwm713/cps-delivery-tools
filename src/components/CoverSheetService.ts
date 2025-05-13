
import { CoverSheetData, PoleRow } from "@/context/CoverSheetContext";
import { getAddressFromCoordinates, getClosestAddressFromCoordinates, formatCoordinates } from "@/services/GeocodingService";

export interface ProcessSpidaResult {
  success: boolean;
  data?: CoverSheetData;
  error?: string;
}

export const processSpidaFile = (file: File): Promise<ProcessSpidaResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target || typeof event.target.result !== 'string') {
          resolve({ success: false, error: "Failed to read file" });
          return;
        }

        const json = JSON.parse(event.target.result);
        
        // Add thorough debugging to see the structure
        console.log("JSON structure keys:", Object.keys(json));
        console.log("JSON has leads?", !!json.leads);
        
        if (json.project) {
          console.log("Project keys:", Object.keys(json.project));
          console.log("Project has leads?", !!json.project.leads);
        }
        
        // Examine the leads array if it exists
        if (json.leads && Array.isArray(json.leads) && json.leads.length > 0) {
          console.log("First lead structure:", Object.keys(json.leads[0]));
          
          // Check if locations exist in the first lead
          if (json.leads[0].locations && Array.isArray(json.leads[0].locations) && json.leads[0].locations.length > 0) {
            console.log("First location keys:", Object.keys(json.leads[0].locations[0]));
            console.log("First location label:", json.leads[0].locations[0].label);
            
            // Check specifically for geographicCoordinate structure
            const firstLocation = json.leads[0].locations[0];
            console.log("Has geographicCoordinate?", !!firstLocation.geographicCoordinate);
            
            if (firstLocation.geographicCoordinate) {
              console.log("geographicCoordinate structure:", firstLocation.geographicCoordinate);
            }
            
            // Check for other potential coordinate storage locations
            console.log("Direct lat/long properties?", {
              hasLatitude: firstLocation.latitude !== undefined,
              hasLongitude: firstLocation.longitude !== undefined
            });
            
            // Check for any properties that might contain "coord" in their name
            const coordProps = Object.keys(firstLocation).filter(key => 
              key.toLowerCase().includes("coord") || 
              key.toLowerCase().includes("gps") || 
              key.toLowerCase().includes("geo") ||
              key.toLowerCase().includes("lat") ||
              key.toLowerCase().includes("long")
            );
            
            if (coordProps.length > 0) {
              console.log("Potential coordinate properties:", coordProps);
              coordProps.forEach(prop => {
                console.log(`${prop} content:`, firstLocation[prop]);
              });
            }
          }
        }
        
        // Validate required fields - project info is typically at the root in SPIDAcalc files
        // but leads/locations are under the project key
        if (!json.label || !json.date) {
          resolve({ success: false, error: "Missing required fields in SPIDAcalc file" });
          return;
        }
        
        // Extract data according to mapping rules
        const jobNumber = json.label || "";
        
        // Format date to MM/DD/YYYY
        let formattedDate = "";
        try {
          const date = new Date(json.date);
          formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        } catch (e) {
          console.error("Date parsing error:", e);
        }
        
        // Get default location and city values from json
        let location = json.clientData?.generalLocation || "";
        let city = json.address?.city || "";
        const engineer = json.engineer || "";
        
        // Add debug logging for initial values
        console.log("Initial values:", { 
          jobNumber, 
          date: formattedDate, 
          location, 
          city, 
          engineer 
        });
        
        // Process poles from leads->locations structure
        const poles: PoleRow[] = [];
        let totalPLAs = 0;
        let scid1Coordinates = null;
        let firstPoleCoordinates = null;
        
        // Use the leads from the appropriate location - prefer direct access
        const leadsArray = json.leads || (json.project?.leads || []);
        
        if (Array.isArray(leadsArray) && leadsArray.length > 0) {
          console.log(`Found ${leadsArray.length} leads to process`);
          
          // Check if leads themselves have coordinates before checking locations
          for (let i = 0; i < Math.min(leadsArray.length, 2); i++) {
            const lead = leadsArray[i];
            console.log(`Lead ${i} keys:`, Object.keys(lead));
            
            // Check for coordinates at the lead level
            if (lead.geographicCoordinate || 
                lead.coordinate || 
                (lead.latitude !== undefined && lead.longitude !== undefined) || 
                lead.position) {
              console.log(`Lead ${i} might have coordinates:`, {
                hasGeographicCoordinate: !!lead.geographicCoordinate,
                hasCoordinate: !!lead.coordinate,
                hasLatLong: lead.latitude !== undefined && lead.longitude !== undefined,
                hasPosition: !!lead.position
              });
              
              // Extract lead-level coordinates if available
              let leadCoords = null;
              
              if (lead.geographicCoordinate && 
                  Array.isArray(lead.geographicCoordinate.coordinates) && 
                  lead.geographicCoordinate.coordinates.length >= 2) {
                leadCoords = {
                  latitude: lead.geographicCoordinate.coordinates[1],
                  longitude: lead.geographicCoordinate.coordinates[0]
                };
              } else if (lead.latitude !== undefined && lead.longitude !== undefined) {
                leadCoords = {
                  latitude: lead.latitude,
                  longitude: lead.longitude
                };
              } else if (lead.coordinate) {
                if (lead.coordinate.latitude !== undefined && lead.coordinate.longitude !== undefined) {
                  leadCoords = {
                    latitude: lead.coordinate.latitude,
                    longitude: lead.coordinate.longitude
                  };
                } else if (Array.isArray(lead.coordinate) && lead.coordinate.length >= 2) {
                  leadCoords = {
                    latitude: lead.coordinate[1],
                    longitude: lead.coordinate[0]
                  };
                }
              } else if (lead.position && 
                        Array.isArray(lead.position.coordinates) && 
                        lead.position.coordinates.length >= 2) {
                leadCoords = {
                  latitude: lead.position.coordinates[1],
                  longitude: lead.position.coordinates[0]
                };
              }
              
              if (leadCoords) {
                console.log(`Found coordinates at lead level:`, leadCoords);
                firstPoleCoordinates = leadCoords;
              }
            }
          }
          
          // Process each lead
          for (const lead of leadsArray) {
            if (lead.locations && Array.isArray(lead.locations)) {
              console.log(`Processing lead with ${lead.locations.length} locations`);
              // Process locations within each lead
              for (const location of lead.locations) {
                // Extract station ID from location label
                const stationId = location.label || "";
                
                // Create default pole object
                const pole: PoleRow = {
                  id: stationId,
                  existing: null, 
                  final: null,
                  notes: ""
                };
                
                // Extract coordinates for address lookup
                // First priority: SCID 1 pole
                // Second priority: First pole we encounter
                try {
                  // Check for different coordinate formats in the SPIDAcalc file
                  let coords = null;
                  
                  // Detailed logging of location structure
                  if (!firstPoleCoordinates) {
                    console.log(`Examining location ${stationId} for coordinates:`);
                    console.log("  Location properties:", Object.keys(location));
                    
                    // Log specific interesting properties for the first few locations
                    const importantProps = ['latitude', 'longitude', 'coordinate', 'geographicCoordinate', 
                                          'gps', 'position', 'point', 'mapData', 'spida'];
                    
                    importantProps.forEach(prop => {
                      if (location[prop] !== undefined) {
                        console.log(`  Location ${prop}:`, location[prop]);
                      }
                    });
                    
                    // Check if location is in original format vs. stringified or modified format
                    if (typeof location === 'object') {
                      console.log("  Location is a proper object");
                    } else {
                      console.log("  Location has unexpected type:", typeof location);
                    }
                  }
                  
                  // Enhanced coordinate extraction with more possible paths
                  
                  // Pattern 1: geographicCoordinate.coordinates array [longitude, latitude]
                  if (location.geographicCoordinate && 
                      Array.isArray(location.geographicCoordinate.coordinates) && 
                      location.geographicCoordinate.coordinates.length >= 2) {
                    
                    // Important: swap order - in this format, first is longitude, second is latitude
                    coords = {
                      latitude: location.geographicCoordinate.coordinates[1],  // Latitude is second
                      longitude: location.geographicCoordinate.coordinates[0]  // Longitude is first
                    };
                    
                    console.log(`Found coordinates array format for ${stationId}:`, coords);
                  } 
                  // Pattern 2: Direct latitude/longitude properties
                  else if (location.latitude !== undefined && location.longitude !== undefined) {
                    coords = {
                      latitude: location.latitude,
                      longitude: location.longitude
                    };
                    console.log(`Found direct lat/long properties for ${stationId}:`, coords);
                  } 
                  // Pattern 3: Nested coordinate object
                  else if (location.coordinate && location.coordinate.latitude !== undefined && location.coordinate.longitude !== undefined) {
                    coords = {
                      latitude: location.coordinate.latitude,
                      longitude: location.coordinate.longitude
                    };
                    console.log(`Found coordinate object properties for ${stationId}:`, coords);
                  } 
                  // Pattern 4: geographicCoordinate with direct lat/long properties
                  else if (location.geographicCoordinate && 
                          location.geographicCoordinate.latitude !== undefined && 
                          location.geographicCoordinate.longitude !== undefined) {
                    coords = {
                      latitude: location.geographicCoordinate.latitude,
                      longitude: location.geographicCoordinate.longitude
                    };
                    console.log(`Found geographicCoordinate properties for ${stationId}:`, coords);
                  }
                  // Pattern 5: Check for position.coordinates if available (sometimes used in GeoJSON)
                  else if (location.position && 
                          Array.isArray(location.position.coordinates) && 
                          location.position.coordinates.length >= 2) {
                    coords = {
                      latitude: location.position.coordinates[1],
                      longitude: location.position.coordinates[0]
                    };
                    console.log(`Found position.coordinates for ${stationId}:`, coords);
                  }
                  // Pattern 6: Check for gps.lat/lng if available
                  else if (location.gps && 
                          location.gps.lat !== undefined && 
                          location.gps.lng !== undefined) {
                    coords = {
                      latitude: location.gps.lat,
                      longitude: location.gps.lng
                    };
                    console.log(`Found gps.lat/lng for ${stationId}:`, coords);
                  }
                  // Pattern 7: Check for location.point if available
                  else if (location.point && 
                          Array.isArray(location.point) && 
                          location.point.length >= 2) {
                    coords = {
                      latitude: location.point[1],
                      longitude: location.point[0]
                    };
                    console.log(`Found point array for ${stationId}:`, coords);
                  }
                  
                  // If we have coordinates (removed pointHeight condition which might be too restrictive)
                  if (coords) {
                    console.log(`Valid coordinates found for ${stationId}:`, coords);
                    
                    // We only care about the FIRST pole in the file - that's SCID 1
                    // Set scid1Coordinates only if it's not already set
                    if (!scid1Coordinates) {
                      scid1Coordinates = coords;
                      console.log(`Using coordinates from first pole (${stationId}) as SCID 1:`, scid1Coordinates);
                    }
                    
                    // Always keep track of first pole with coordinates as fallback
                    if (!firstPoleCoordinates) {
                      firstPoleCoordinates = coords;
                      console.log("First pole coordinates set:", firstPoleCoordinates);
                    }
                  } else {
                    console.log(`No valid coordinates found for ${stationId}`);
                  }
                } catch (e) {
                  console.error("Error extracting coordinates:", e);
                }
                
                // Extract description of work from remedies
                if (location.remedies && Array.isArray(location.remedies) && location.remedies.length > 0) {
                  pole.notes = location.remedies.join(", ");
                }
                
                // Check if designs exist and process them
                if (location.designs && Array.isArray(location.designs)) {
                  // Find Measured Design and Recommended Design
                  const measuredDesign = location.designs.find(design => design.label === "Measured Design");
                  const recommendedDesign = location.designs.find(design => design.label === "Recommended Design");
                  
                  // Count PLAs (design analysis layers)
                  if (measuredDesign) totalPLAs++;
                  if (recommendedDesign) totalPLAs++;
                  
                  // Extract Existing % from Measured Design
                  if (measuredDesign && measuredDesign.analysis && Array.isArray(measuredDesign.analysis)) {
                    // Find Light - Grade C analysis or use the first analysis available
                    const analysis = measuredDesign.analysis.find(a => a.id === "Light - Grade C") || 
                                    (measuredDesign.analysis.length > 0 ? measuredDesign.analysis[0] : null);
                    
                    if (analysis && analysis.results && Array.isArray(analysis.results)) {
                      // Find pole stress result
                      const poleStress = analysis.results.find(result => 
                        result.component === "Pole" && result.analysisType === "STRESS"
                      );
                      
                      if (poleStress && poleStress.actual !== undefined) {
                        pole.existing = parseFloat(poleStress.actual);
                      }
                    }
                  }
                  
                  // Extract Final % from Recommended Design
                  if (recommendedDesign && recommendedDesign.analysis && Array.isArray(recommendedDesign.analysis)) {
                    // Find Light - Grade C analysis or use the first analysis available
                    const analysis = recommendedDesign.analysis.find(a => a.id === "Light - Grade C") || 
                                    (recommendedDesign.analysis.length > 0 ? recommendedDesign.analysis[0] : null);
                    
                    if (analysis && analysis.results && Array.isArray(analysis.results)) {
                      // Find pole stress result
                      const poleStress = analysis.results.find(result => 
                        result.component === "Pole" && result.analysisType === "STRESS"
                      );
                      
                      if (poleStress && poleStress.actual !== undefined) {
                        pole.final = parseFloat(poleStress.actual);
                      }
                    }
                  }
                }
                
                // Add pole to the array
                poles.push(pole);
              }
            }
          }
        }
        
        // Use coordinates for address lookup
        // For this implementation, the first pole = SCID 1
        // But keep the fallback to firstPoleCoordinates just in case
        const coordsToUse = scid1Coordinates || firstPoleCoordinates;
        
        // Log the decision explicitly for clarity
        if (coordsToUse === scid1Coordinates) {
          console.log("Using coordinates from the FIRST pole in the file for address lookup");
        } else if (coordsToUse === firstPoleCoordinates) {
          console.log("Using fallback first pole coordinates for address lookup");
        }
        
        console.log("Coordinates to use for geocoding:", coordsToUse);
        
        // If we still don't have coordinates, check if we can manually extract from pole IDs
        // Sometimes SPIDAcalc embeds coordinates in the pole ID or description
        if (!coordsToUse && poles.length > 0) {
          console.log("No coordinates found in standard locations, checking for embedded coordinates in pole data");
          
          // Examine all pole IDs and notes for possible embedded coordinate patterns
          for (const pole of poles) {
            // Common formats: "PL123 (LAT,LONG)" or "near: LAT,LONG" or "GPS: LAT,LONG"
            const idAndNotes = `${pole.id} ${pole.notes}`;
            
            // Look for coordinate patterns like "12.345,-67.890" or "12.345 N, 67.890 W"
            const coordPattern = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
            const match = idAndNotes.match(coordPattern);
            
            if (match && match.length >= 3) {
              const potentialLat = parseFloat(match[1]);
              const potentialLong = parseFloat(match[2]);
              
              // Basic validation - coordinates must be in reasonable ranges
              if (Math.abs(potentialLat) <= 90 && Math.abs(potentialLong) <= 180) {
                console.log(`Found potential embedded coordinates in pole data: ${potentialLat}, ${potentialLong}`);
                firstPoleCoordinates = {
                  latitude: potentialLat,
                  longitude: potentialLong
                };
                break;
              }
            }
          }
        }
        
        if (coordsToUse) {
          try {
            console.log("Requesting address for coordinates:", coordsToUse);
            
            // ALWAYS get closest address for location field regardless of whether location is already set
            const closestAddressResult = await getClosestAddressFromCoordinates(
              coordsToUse.latitude,
              coordsToUse.longitude
            );
            
            console.log("Closest address lookup result:", closestAddressResult);
            
            if (closestAddressResult) {
              // Replace location with closest address
              location = closestAddressResult.formattedAddress;
              
              // Add coordinates to the location string for technical reference
              const coordString = formatCoordinates(coordsToUse.latitude, coordsToUse.longitude);
              location = `${location} (${coordString})`;
              
              console.log("Updated location field:", location);
              
              // Only update city if it's not already set
              if ((!city || city === "") && closestAddressResult.city) {
                city = closestAddressResult.city;
                console.log("Updated city field:", city);
              }
            }
            
            // Fallback to original location geocoding if closest address lookup failed
            if (!closestAddressResult) {
              const geocodingResult = await getAddressFromCoordinates(
                coordsToUse.latitude, 
                coordsToUse.longitude
              );
              
              if (geocodingResult) {
                // Set location if we have a geocoding result
                if (geocodingResult.location) {
                  location = geocodingResult.location;
                  
                  // Add coordinates to the location string
                  const coordString = formatCoordinates(coordsToUse.latitude, coordsToUse.longitude);
                  location = `${location} (${coordString})`;
                }
                
                // Only update city if it's not already set
                if ((!city || city === "") && geocodingResult.city) {
                  city = geocodingResult.city;
                }
              }
            }
          } catch (error) {
            console.error("Geocoding error:", error);
            // Continue with existing location but add coordinates
            if (location) {
              const coordString = formatCoordinates(coordsToUse.latitude, coordsToUse.longitude);
              location = `${location} (${coordString})`;
            } else {
              // If no location, just use coordinates
              location = `Coordinates: ${formatCoordinates(coordsToUse.latitude, coordsToUse.longitude)}`;
            }
          }
        } else {
          console.error("No coordinates found in the file - cannot perform geocoding");
          
          // If we have no coordinates and no location, set a default message
          if (!location) {
            location = "No coordinates available for location lookup";
          }
        }
        
        // Final location check - ensure we have something
        if (!location) {
          location = "Location information not available";
        }
        
        // Count unique poles for comments
        const uniquePoleIds = new Set(poles.map(pole => pole.id));
        const poleCount = uniquePoleIds.size;
        
        // Generate comments
        const comments = `${totalPLAs} PLAs on ${poleCount} poles`;
        
        const coverSheetData: CoverSheetData = {
          jobNumber,
          client: "Charter/Spectrum", // Always this value
          date: formattedDate,
          location,
          city,
          engineer,
          comments,
          poles
        };
        
        resolve({ success: true, data: coverSheetData });
      } catch (error) {
        console.error("Error processing SPIDAcalc file:", error);
        resolve({ success: false, error: "Invalid SPIDAcalc file format" });
      }
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: "Error reading file" });
    };
    
    reader.readAsText(file);
  });
};

export const copyText = (text: string): Promise<boolean> => {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch((error) => {
      console.error("Failed to copy text:", error);
      return false;
    });
};
