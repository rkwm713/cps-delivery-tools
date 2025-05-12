import type { ProcessedRow } from "@/pages/Index";
import * as XLSX from 'xlsx';

// Interface for verification results
export interface VerificationResult {
  missingInSpida: string[];
  missingInKatapult: string[];
  duplicatesInSpida: string[];
  duplicatesInKatapult: string[];
  formattingIssues: Array<{poleId: string, issue: string}>;
}

/**
 * Process the uploaded files and return the comparison data
 */
export const processFiles = async (
  katapultFile: File,
  spidaFile: File
): Promise<{rows: ProcessedRow[], verification: VerificationResult}> => {
  try {
    // Read the files
    const katapultData = await readExcelFile(katapultFile);
    const spidaData = await readJsonFile(spidaFile);
    
    // Log sample data to debug field names and formats
    if (katapultData.length > 0) {
      console.log("Katapult sample row:", katapultData[0]);
    }
    
    // Extract pole information from both sources
    const katapultPoles = extractKatapultPoles(katapultData);
    const spidaPoles = extractSpidaPoles(spidaData);
    
    console.log("Katapult poles extracted:", katapultPoles.size);
    console.log("SPIDA poles extracted:", spidaPoles.size);
    
    // Verify pole numbers between the two sources
    const verification = verifyPoleNumbers(katapultPoles, spidaPoles);
    
    // Generate comparison data
    const comparisonData = generateComparisonData(katapultPoles, spidaPoles);
    
    // Log a few sample results for debugging
    if (comparisonData.length > 0) {
      console.log("Sample comparison result:", comparisonData[0]);
    }
    
    return {
      rows: comparisonData,
      verification
    };
  } catch (error) {
    console.error("Error processing files:", error);
    throw error;
  }
};

/**
 * Read Excel file content
 */
const readExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error("Failed to read Excel file"));
          return;
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse sheet to JSON (header is on row 2)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
        console.log("Excel headers:", Object.keys(jsonData[0] || {}));
        resolve(jsonData);
      } catch (err) {
        reject(new Error(`Error parsing Excel file: ${err}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read Excel file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Read JSON file content
 */
const readJsonFile = async (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error("Failed to read JSON file"));
          return;
        }
        
        const jsonData = JSON.parse(e.target.result as string);
        resolve(jsonData);
      } catch (err) {
        reject(new Error(`Error parsing JSON file: ${err}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read JSON file"));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Extract pole data from Katapult Excel file
 */
interface KatapultPole {
  poleId: string;
  normalizedPoleId: string;
  poleSpec: string;
  existingLoading: number;
  finalLoading: number;
  scid?: string;
  plNumber?: string;
}

/**
 * Case-insensitive object property access with fallback options
 */
const getFieldValue = (obj: any, fieldOptions: string[]): any => {
  if (!obj) return undefined;
  
  // Try each field option in order
  for (const field of fieldOptions) {
    // Try exact match
    if (obj[field] !== undefined) {
      return obj[field];
    }
    
    // Try case-insensitive match
    const lowerField = field.toLowerCase();
    const match = Object.keys(obj).find(key => key.toLowerCase() === lowerField);
    if (match && obj[match] !== undefined) {
      return obj[match];
    }
  }
  
  return undefined;
};

const extractKatapultPoles = (excelData: any[]): Map<string, KatapultPole> => {
  const poles = new Map<string, KatapultPole>();
  const duplicates = new Set<string>();
  
  // Filter data to only include rows where node_type is "pole"
  const poleData = excelData.filter(row => {
    const nodeType = getFieldValue(row, ['node_type', 'Node Type', 'NODE_TYPE']);
    return nodeType === "pole";
  });
  
  console.log(`Found ${poleData.length} poles in Katapult data`);
  
  poleData.forEach((row, index) => {
    // Get SCID (required field)
    const scid = getFieldValue(row, ['scid', 'SCID']);
    if (!scid) {
      console.log(`Row ${index} skipped: missing SCID`);
      return;
    }
    
    // Find the actual pole ID using fallback logic
    const poleTag = getFieldValue(row, ['pole_tag', 'Pole Tag', 'POLE_TAG']);
    const dlocNumber = getFieldValue(row, ['DLOC_number', 'dloc_number', 'Dloc Number']);
    const plNumber = getFieldValue(row, ['PL_number', 'pl_number', 'Pl Number']);
    
    let poleIdValue = poleTag;
    if (!poleIdValue && dlocNumber) {
      poleIdValue = dlocNumber;
    }
    if (!poleIdValue && plNumber) {
      poleIdValue = plNumber;
    }
    
    // Skip if we couldn't find any pole ID
    if (!poleIdValue) {
      console.log(`Row ${index} skipped: no valid pole ID found`);
      return;
    }
    
    // Create pole ID with scid
    const poleId = `${scid}-${poleIdValue}`;
    const normalizedPoleId = normalizePoleId(poleId);
    
    // Check for duplicates
    if (poles.has(normalizedPoleId)) {
      duplicates.add(normalizedPoleId);
      console.log(`Duplicate found: ${poleId}`);
    }
    
    // Get pole specification
    const poleSpec = getFieldValue(row, ['pole_spec', 'Pole Spec']) || "";
    
    // Get loading percentages - try multiple field name variations
    let existingLoading = 0;
    let finalLoading = 0;
    
    // Handle multiple possible field names for loading percentages
    const existingLoadingOptions = [
      'existing_capacity_%', 
      'Existing Capacity %',
      'existing_capacity',
      'Existing Capacity',
      'capacity_existing_percent',
      'existing capacity'
    ];
    
    const finalLoadingOptions = [
      'final_passing_capacity_%',
      'Final Passing Capacity %',
      'final_passing_capacity',
      'Final Passing Capacity', 
      'capacity_final_percent',
      'final capacity'
    ];
    
    const existingLoadingRaw = getFieldValue(row, existingLoadingOptions);
    const finalLoadingRaw = getFieldValue(row, finalLoadingOptions);
    
    // Parse values, handling potential string formatting with % symbol
    if (existingLoadingRaw !== undefined) {
      if (typeof existingLoadingRaw === 'string') {
        existingLoading = parseFloat(existingLoadingRaw.replace('%', '')) || 0;
      } else {
        existingLoading = parseFloat(existingLoadingRaw) || 0;
      }
    }
    
    if (finalLoadingRaw !== undefined) {
      if (typeof finalLoadingRaw === 'string') {
        finalLoading = parseFloat(finalLoadingRaw.replace('%', '')) || 0;
      } else {
        finalLoading = parseFloat(finalLoadingRaw) || 0;
      }
    }
    
    // Store pole data
    poles.set(normalizedPoleId, {
      poleId,
      normalizedPoleId,
      poleSpec,
      existingLoading,
      finalLoading,
      scid: scid.toString(),
      plNumber: poleIdValue.toString()
    });
    
    // Log the first few poles for debugging
    if (index < 3) {
      console.log(`Katapult Pole ${index}:`, {
        poleId,
        poleSpec,
        existingLoading,
        finalLoading,
        rawExisting: existingLoadingRaw,
        rawFinal: finalLoadingRaw
      });
    }
  });
  
  console.log(`Extracted ${poles.size} valid poles from Katapult data`);
  return poles;
};

/**
 * Extract pole data from SPIDAcalc JSON file
 */
interface SpidaPole {
  poleId: string;
  normalizedPoleId: string;
  poleSpec: string;
  existingLoading: number;
  finalLoading: number;
}

/**
 * Helper function to extract pole specification from SPIDAcalc design
 */
const extractPoleSpecification = (design: any): string => {
  if (!design?.structure?.pole) {
    return "Unknown";
  }

  const pole = design.structure.pole;
  
  // First try the clientItemAlias which often contains the formatted spec directly (e.g. "55-2")
  if (pole.clientItemAlias) {
    // If we have both clientItemAlias and species, combine them
    if (pole.clientItem && pole.clientItem.species) {
      return `${pole.clientItemAlias} ${pole.clientItem.species}`;
    }
    return pole.clientItemAlias;
  }
  
  // If clientItemAlias isn't available, try to build it from clientItem details
  if (pole.clientItem) {
    const clientItem = pole.clientItem;
    let height = "";
    let poleClass = "";
    let species = "";
    
    // Extract height (convert from meters to feet)
    if (clientItem.height && clientItem.height.value) {
      const heightInMeters = clientItem.height.value;
      const heightInFeet = Math.round(heightInMeters * 3.28084);
      height = heightInFeet.toString();
    }
    
    // Extract class
    if (clientItem.classOfPole) {
      poleClass = clientItem.classOfPole;
    }
    
    // Extract species (optional)
    if (clientItem.species) {
      species = clientItem.species;
    }
    
    // Combine values
    if (height && poleClass) {
      return species ? `${height}-${poleClass} ${species}` : `${height}-${poleClass}`;
    }
  }
  
  return "Unknown";
}

const extractSpidaPoles = (jsonData: any): Map<string, SpidaPole> => {
  const poles = new Map<string, SpidaPole>();
  const duplicates = new Set<string>();
  
  // Process each lead > location > design path
  if (jsonData.leads && Array.isArray(jsonData.leads)) {
    jsonData.leads.forEach((lead: any) => {
      if (lead.locations && Array.isArray(lead.locations)) {
        lead.locations.forEach((loc: any) => {
          if (!loc.label) return; // Skip if no label (pole ID)
          
          const poleId = loc.label;
          const normalizedPoleId = normalizePoleId(poleId);
          
          // Skip if already processed this pole ID
          if (poles.has(normalizedPoleId)) {
            duplicates.add(normalizedPoleId);
            return;
          }
          
          // Initialize pole data
          let poleSpec = "Unknown";
          let existingLoading = 0;
          let finalLoading = 0;
          
          // Process designs if available
          if (loc.designs && Array.isArray(loc.designs)) {
            // Find measured and recommended designs
            const measuredDesign = loc.designs.find((d: any) => d.label === "Measured Design");
            const recommendedDesign = loc.designs.find((d: any) => d.label === "Recommended Design");
            
            // Extract pole spec from recommended design (preferred) or measured design
            if (recommendedDesign) {
              poleSpec = extractPoleSpecification(recommendedDesign);
            } else if (measuredDesign) {
              poleSpec = extractPoleSpecification(measuredDesign);
            }
            
            // Extract existing loading from Measured Design
            if (measuredDesign && measuredDesign.analysis && Array.isArray(measuredDesign.analysis)) {
              const analysis = measuredDesign.analysis.find((a: any) => a.id === "Light - Grade C") || 
                              (measuredDesign.analysis.length > 0 ? measuredDesign.analysis[0] : null);
              
              if (analysis && analysis.results && Array.isArray(analysis.results)) {
                const poleStress = analysis.results.find((r: any) => 
                  r.component === 'Pole' && r.analysisType === 'STRESS'
                );
                
                if (poleStress && typeof poleStress.actual === 'number') {
                  existingLoading = parseFloat(poleStress.actual.toFixed(2));
                }
              }
            }
            
            // Extract final loading from Recommended Design
            if (recommendedDesign && recommendedDesign.analysis && Array.isArray(recommendedDesign.analysis)) {
              const analysis = recommendedDesign.analysis.find((a: any) => a.id === "Light - Grade C") || 
                              (recommendedDesign.analysis.length > 0 ? recommendedDesign.analysis[0] : null);
              
              if (analysis && analysis.results && Array.isArray(analysis.results)) {
                const poleStress = analysis.results.find((r: any) => 
                  r.component === 'Pole' && r.analysisType === 'STRESS'
                );
                
                if (poleStress && typeof poleStress.actual === 'number') {
                  finalLoading = parseFloat(poleStress.actual.toFixed(2));
                }
              }
            }
          }
          
          // Store pole data
          poles.set(normalizedPoleId, {
            poleId,
            normalizedPoleId,
            poleSpec,
            existingLoading,
            finalLoading
          });
        });
      }
    });
  }
  
  return poles;
};

/**
 * Normalize pole ID for consistent comparison
 */
const normalizePoleId = (poleId: string): string => {
  return poleId
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ''); // Remove all whitespace
};

/**
 * Verify pole numbers between Katapult and SPIDAcalc data
 */
const verifyPoleNumbers = (
  katapultPoles: Map<string, KatapultPole>,
  spidaPoles: Map<string, SpidaPole>
): VerificationResult => {
  const result: VerificationResult = {
    missingInSpida: [],
    missingInKatapult: [],
    duplicatesInSpida: [],
    duplicatesInKatapult: [],
    formattingIssues: []
  };
  
  // Find poles in Katapult but not in SPIDA
  katapultPoles.forEach((pole, normalizedId) => {
    if (!spidaPoles.has(normalizedId)) {
      result.missingInSpida.push(pole.poleId);
    } else {
      // Check for formatting issues
      const spidaPole = spidaPoles.get(normalizedId)!;
      if (pole.poleId !== spidaPole.poleId) {
        result.formattingIssues.push({
          poleId: pole.poleId,
          issue: `Format mismatch: Katapult "${pole.poleId}" vs SPIDA "${spidaPole.poleId}"`
        });
      }
    }
  });
  
  // Find poles in SPIDA but not in Katapult
  spidaPoles.forEach((pole, normalizedId) => {
    if (!katapultPoles.has(normalizedId)) {
      result.missingInKatapult.push(pole.poleId);
    }
  });
  
  // Check for duplicates (already tracked during extraction)
  // Add logic here if needed for additional duplicate checks
  
  return result;
};

/**
 * Generate comparison data between Katapult and SPIDAcalc
 */
const generateComparisonData = (
  katapultPoles: Map<string, KatapultPole>,
  spidaPoles: Map<string, SpidaPole>
): ProcessedRow[] => {
  const results: ProcessedRow[] = [];
  
  // Process all Katapult poles
  katapultPoles.forEach((katapult) => {
    const normalizedId = katapult.normalizedPoleId;
    const spida = spidaPoles.get(normalizedId);
    
    let row: ProcessedRow = {
      poleNumber: katapult.poleId,
      spidaPoleSpec: spida?.poleSpec || "N/A",
      katapultPoleSpec: katapult.poleSpec,
      spidaExistingLoading: spida?.existingLoading || 0,
      katapultExistingLoading: katapult.existingLoading,
      spidaFinalLoading: spida?.finalLoading || 0,
      katapultFinalLoading: katapult.finalLoading
    };
    
    // Debug log for mismatched poles
    if (!spida) {
      console.log(`No SPIDA match for Katapult pole: ${katapult.poleId}`);
    }
    
    results.push(row);
  });
  
  // Add SPIDA poles that are not in Katapult
  spidaPoles.forEach((spida) => {
    const normalizedId = spida.normalizedPoleId;
    if (!katapultPoles.has(normalizedId)) {
      console.log(`No Katapult match for SPIDA pole: ${spida.poleId}`);
      
      const row: ProcessedRow = {
        poleNumber: spida.poleId,
        spidaPoleSpec: spida.poleSpec,
        katapultPoleSpec: "N/A",
        spidaExistingLoading: spida.existingLoading,
        katapultExistingLoading: 0,
        spidaFinalLoading: spida.finalLoading,
        katapultFinalLoading: 0
      };
      
      results.push(row);
    }
  });
  
  // Sort results by pole number for better readability
  return results.sort((a, b) => a.poleNumber.localeCompare(b.poleNumber));
};

/**
 * Generate mock data for demonstration purposes (KEPT FOR FALLBACK)
 * In a real application, this data would come from processing the actual files
 */
const generateMockData = (): ProcessedRow[] => {
  const mockData: ProcessedRow[] = [];
  
  // Generate 20 random pole entries
  for (let i = 1; i <= 20; i++) {
    // Random pole specs
    const baseClass = Math.floor(Math.random() * 5) + 1;
    const baseHeight = (Math.floor(Math.random() * 3) + 4) * 10;
    
    const spidaPoleSpec = `${baseHeight}-${baseClass}`;
    
    // Occasionally create a mismatch in pole specs
    const specMismatch = Math.random() > 0.8;
    const katapultPoleSpec = specMismatch 
      ? `${baseHeight + 5}-${baseClass + 1}`
      : spidaPoleSpec;
    
    // Generate random loading percentages
    const spidaExistingLoading = parseFloat((Math.random() * 80 + 10).toFixed(2));
    
    // Occasionally create significant differences between SPIDA and Katapult values
    const existingDiffFactor = Math.random() > 0.8 ? 10 : 3;
    const finalDiffFactor = Math.random() > 0.8 ? 12 : 2;
    
    const katapultExistingLoading = parseFloat(
      (spidaExistingLoading + (Math.random() * 2 * existingDiffFactor - existingDiffFactor)).toFixed(2)
    );
    
    const spidaFinalLoading = parseFloat((spidaExistingLoading * (1 + Math.random() * 0.5)).toFixed(2));
    
    const katapultFinalLoading = parseFloat(
      (spidaFinalLoading + (Math.random() * 2 * finalDiffFactor - finalDiffFactor)).toFixed(2)
    );
    
    // Create a unique pole number
    const scid = 1000 + i;
    const plNumber = 100 + i;
    const poleNumber = `${scid}-${plNumber}`;
    
    mockData.push({
      poleNumber,
      spidaPoleSpec,
      katapultPoleSpec,
      spidaExistingLoading,
      katapultExistingLoading,
      spidaFinalLoading,
      katapultFinalLoading
    });
  }
  
  return mockData;
};
