
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
        
        // Process poles
        const poles: PoleRow[] = [];
        if (json.clientData?.poles && Array.isArray(json.clientData.poles)) {
          json.clientData.poles.forEach((pole: any) => {
            const stationId = pole.aliases && pole.aliases[0]?.id ? pole.aliases[0].id : pole.externalId || "";
            
            // Add pole to list
            poles.push({
              id: stationId,
              existing: null, // Will be filled later
              final: null,    // Will be filled later
              notes: ""
            });
          });
        }
        
        // Process design layers for loading values
        if (json.designLayers && Array.isArray(json.designLayers)) {
          const measuredDesign = json.designLayers.find((layer: any) => layer.label === "Measured Design");
          const recommendedDesign = json.designLayers.find((layer: any) => layer.label === "Recommended Design");
          
          // Count unique pole IDs for comments
          const uniquePoleIds = new Set(poles.map(pole => pole.id));
          const poleCount = uniquePoleIds.size;
          const plaCount = json.designLayers.length;
          
          // Default comments
          const comments = `${plaCount} PLAs on ${poleCount} poles`;
          
          // Fill in existing and final loading values for each pole
          poles.forEach((pole, index) => {
            if (measuredDesign?.results && Array.isArray(measuredDesign.results)) {
              const existingResult = measuredDesign.results.find((result: any) => 
                result.component === "Pole" && result.analysisType === "STRESS");
              if (existingResult) {
                poles[index].existing = existingResult.actual;
              }
            }
            
            if (recommendedDesign?.results && Array.isArray(recommendedDesign.results)) {
              const finalResult = recommendedDesign.results.find((result: any) => 
                result.component === "Pole" && result.analysisType === "STRESS");
              if (finalResult) {
                poles[index].final = finalResult.actual;
              }
            }
          });
          
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
        } else {
          resolve({ success: false, error: "Missing design layers in SPIDAcalc file" });
        }
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
