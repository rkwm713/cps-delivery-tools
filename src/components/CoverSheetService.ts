
import { CoverSheetData, PoleRow } from "@/context/CoverSheetContext";

export interface ProcessSpidaResult {
  success: boolean;
  data?: CoverSheetData;
  error?: string;
}

export const processSpidaFile = (file: File): Promise<ProcessSpidaResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || typeof event.target.result !== 'string') {
          resolve({ success: false, error: "Failed to read file" });
          return;
        }

        const json = JSON.parse(event.target.result);
        
        // Validate required fields
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
        
        const location = json.clientData?.generalLocation || "";
        const city = json.address?.city || "";
        const engineer = json.engineer || "";
        
        // Process poles from leads->locations structure
        const poles: PoleRow[] = [];
        let totalPLAs = 0;
        
        if (json.leads && Array.isArray(json.leads)) {
          // Process each lead
          json.leads.forEach(lead => {
            if (lead.locations && Array.isArray(lead.locations)) {
              // Process locations within each lead
              lead.locations.forEach(location => {
                // Extract station ID from location label
                const stationId = location.label || "";
                
                // Create default pole object
                const pole: PoleRow = {
                  id: stationId,
                  existing: null, 
                  final: null,
                  notes: ""
                };
                
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
              });
            }
          });
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
