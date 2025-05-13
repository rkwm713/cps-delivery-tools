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
    console.log("Starting file processing...");
    
    // Read the files
    const katapultData = await readExcelFile(katapultFile);
    const spidaData = await readJsonFile(spidaFile);
    
    // Log sample data to debug field names and formats
    if (katapultData.length > 0) {
      console.log("Katapult first row:", katapultData[0]);
      console.log("Available Katapult headers:", Object.keys(katapultData[0]).join(", "));
    }
    
    // Extract pole information from both sources
    const katapultPoles = extractKatapultPoles(katapultData);
    const spidaPoles = extractSpidaPoles(spidaData);
    
    console.log("Katapult poles extracted:", katapultPoles.size);
    console.log("SPIDA poles extracted:", spidaPoles.size);
    
    // Sample first few poles from each source
    if (katapultPoles.size > 0) {
      const sampleKatapult = Array.from(katapultPoles.values()).slice(0, 3);
      console.log("Sample Katapult poles:", sampleKatapult);
    }
    
    if (spidaPoles.size > 0) {
      const sampleSpida = Array.from(spidaPoles.values()).slice(0, 3);
      console.log("Sample SPIDA poles:", sampleSpida);
    }
    
    // Verify pole numbers between the two sources
    const verification = verifyPoleNumbers(katapultPoles, spidaPoles);
    
    // Generate comparison data
    const comparisonData = generateComparisonData(katapultPoles, spidaPoles);
    
    // Log a few sample results for debugging
    if (comparisonData.length > 0) {
      console.log("Sample comparison results:", comparisonData.slice(0, 3));
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
        
        // Get all headers from the first row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];
        
        // Extract all column headers for logging
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 1, c: C })]; // Row 2 (index 1)
          if (cell && cell.v) headers.push(String(cell.v));
        }
        
        console.log("All Excel headers found:", headers);
        
        // Parse sheet to JSON (header is on row 2)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
        console.log(`Excel data rows found: ${jsonData.length}`);
        
        if (jsonData.length > 0) {
          console.log("First row raw data:", JSON.stringify(jsonData[0]));
          console.log("Excel headers:", Object.keys(jsonData[0] || {}));
        }
        
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
        console.log("JSON file successfully parsed");
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
 * Enhanced with better logging and more robust property matching
 */
const getFieldValue = (obj: any, fieldOptions: string[], debugLabel?: string): any => {
  if (!obj) return undefined;
  
  // Try each field option in order
  for (const field of fieldOptions) {
    // Try exact match
    if (obj[field] !== undefined) {
      if (debugLabel) {
        console.log(`Found ${debugLabel} using exact match for field '${field}': ${obj[field]}`);
      }
      return obj[field];
    }
    
    // Try case-insensitive match
    const lowerField = field.toLowerCase();
    const match = Object.keys(obj).find(key => key.toLowerCase() === lowerField);
    if (match && obj[match] !== undefined) {
      if (debugLabel) {
        console.log(`Found ${debugLabel} using case-insensitive match for field '${field}' -> '${match}': ${obj[match]}`);
      }
      return obj[match];
    }
    
    // Try fuzzy matches - looking for fields that contain the key term
    const fuzzyMatches = Object.keys(obj).filter(key => 
      key.toLowerCase().includes(lowerField) || 
      lowerField.includes(key.toLowerCase())
    );
    
    if (fuzzyMatches.length > 0) {
      const fuzzyMatch = fuzzyMatches[0]; // Take the first fuzzy match
      if (debugLabel) {
        console.log(`Found ${debugLabel} using fuzzy match for '${field}' -> '${fuzzyMatch}': ${obj[fuzzyMatch]}`);
      }
      return obj[fuzzyMatch];
    }
  }
  
  if (debugLabel) {
    console.log(`Could not find ${debugLabel} using any of these fields: ${fieldOptions.join(', ')}`);
  }
  
  return undefined;
};

const extractKatapultPoles = (excelData: any[]): Map<string, KatapultPole> => {
  const poles = new Map<string, KatapultPole>();
  const duplicates = new Set<string>();
  
  console.log(`Starting Katapult pole extraction. Total rows: ${excelData.length}`);
  
  if (excelData.length === 0) {
    console.error("No data found in Katapult Excel file");
    return poles;
  }
  
  // Log all available column headers for debugging
  if (excelData.length > 0) {
    console.log("Available columns in Katapult data:", Object.keys(excelData[0]).join(", "));
  }
  
  // CHANGED: Instead of filtering by node_type column, we'll check each row for any field containing "pole"
  const poleData = excelData.filter(row => {
    // Check if any field in this row contains the string "pole" (case-insensitive)
    for (const key in row) {
      const value = row[key];
      if (value && 
         (typeof value === 'string' && value.toLowerCase().includes('pole'))) {
        console.log(`Found row with pole reference in field '${key}': ${value}`);
        return true;
      }
    }
    return false;
  });
  
  console.log(`Found ${poleData.length} potential poles in Katapult data after searching for "pole" in any field`);
  
  // Sample the first row to understand the data structure
  if (poleData.length > 0) {
    console.log("Sample Katapult pole row:", poleData[0]);
  }
  
  // Process each potential pole
  poleData.forEach((row, index) => {
    // Get SCID (try multiple possible column names)
    const scidOptions = ['scid', 'SCID', 'sc_id', 'SC_ID', 'ScId', 'sc id', 'SC ID', 'id', 'ID'];
    const scid = getFieldValue(row, scidOptions, 'SCID');
    
    // As per reference doc: For Pole Number, use SCID + "-" + PL_number
    const plNumberOptions = [
      'PL_number', 'pl_number', 'Pl Number', 'pl', 'PL', 'plnumber', 'PLNumber', 'pl number', 'PL number'
    ];
    const plNumber = getFieldValue(row, plNumberOptions, 'PL number');
    
    // Debug which identifiers were found
    console.log(`Row ${index} identifiers - SCID: ${scid}, PL: ${plNumber}`);
    
    // Skip if we couldn't find both SCID and PL number
    if (!scid || !plNumber) {
      console.log(`Row ${index} skipped: missing SCID or PL number`);
      return;
    }
    
    // Create pole ID with scid and plNumber as specified in reference doc
    const poleId = `${scid}-${plNumber}`;
    const normalizedPoleId = normalizePoleId(poleId);
    
    console.log(`Row ${index}: Created pole ID: ${poleId}, normalized: ${normalizedPoleId}`);
    
    // Check for duplicates
    if (poles.has(normalizedPoleId)) {
      duplicates.add(normalizedPoleId);
      console.log(`Duplicate found: ${poleId}`);
    }
    
    // As per reference doc: For Katapult Pole Spec, use proposed_pole_spec or pole_spec
    const poleSpecOptions = [
      'proposed_pole_spec', 'Proposed Pole Spec', 'pole_spec', 'Pole Spec'
    ];
    
    const poleSpec = getFieldValue(row, poleSpecOptions, 'pole spec') || "";
    
    // As per reference doc: For Katapult Existing Loading %, use existing_capacity_%
    const existingLoadingOptions = [
      'existing_capacity_%', 
      'Existing Capacity %',
      'existing_capacity',
      'Existing Capacity'
    ];
    
    // As per reference doc: For Katapult Final Loading %, use final_passing_capacity_%
    const finalLoadingOptions = [
      'final_passing_capacity_%',
      'Final Passing Capacity %',
      'final_passing_capacity',
      'Final Passing Capacity'
    ];
    
    // Try to get loading values using the fields specified in reference
    const existingLoadingRaw = getFieldValue(row, existingLoadingOptions, 'existing loading');
    const finalLoadingRaw = getFieldValue(row, finalLoadingOptions, 'final loading');
    
    console.log(`Row ${index} raw loading values - Existing: ${existingLoadingRaw}, Final: ${finalLoadingRaw}`);
    
    // Parse values, handling potential string formatting with % symbol
    let existingLoading = 0;
    let finalLoading = 0;
    
    if (existingLoadingRaw !== undefined) {
      if (typeof existingLoadingRaw === 'string') {
        // Handle strings with % and other potential formatting
        existingLoading = parseFloat(existingLoadingRaw.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof existingLoadingRaw === 'number') {
        // If it's already a number, use it directly
        existingLoading = existingLoadingRaw;
      }
    }
    
    if (finalLoadingRaw !== undefined) {
      if (typeof finalLoadingRaw === 'string') {
        // Handle strings with % and other potential formatting
        finalLoading = parseFloat(finalLoadingRaw.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof finalLoadingRaw === 'number') {
        // If it's already a number, use it directly
        finalLoading = finalLoadingRaw;
      }
    }
    
    // Check for values that might be percentages expressed as 0-1 values instead of 0-100
    if (existingLoading > 0 && existingLoading < 1) {
      existingLoading *= 100;
      console.log(`Row ${index}: Converted existingLoading from decimal to percentage: ${existingLoading}`);
    }
    
    if (finalLoading > 0 && finalLoading < 1) {
      finalLoading *= 100;
      console.log(`Row ${index}: Converted finalLoading from decimal to percentage: ${finalLoading}`);
    }
    
    console.log(`Row ${index} parsed loading values - Existing: ${existingLoading}, Final: ${finalLoading}`);
    
    // Store pole data
    poles.set(normalizedPoleId, {
      poleId,
      normalizedPoleId,
      poleSpec,
      existingLoading,
      finalLoading,
      scid: scid ? scid.toString() : undefined,
      plNumber: plNumber ? plNumber.toString() : undefined
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
  
  if (duplicates.size > 0) {
    console.log(`Found ${duplicates.size} duplicate pole IDs in Katapult data`);
  }
  
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
 * Extract SPIDAcalc pole specification from design
 * Updated to follow the reference document: Use Measured → clientItem.classOfPole
 */
const extractPoleSpecification = (design: any): string => {
  if (!design?.structure?.pole) {
    return "Unknown";
  }

  const pole = design.structure.pole;
  
  // According to reference doc: Use clientItem.classOfPole
  if (pole.clientItem && pole.clientItem.classOfPole) {
    const classOfPole = pole.clientItem.classOfPole;
    
    // Also try to get the height, which is often needed with class
    let height = "";
    if (pole.clientItem.height && pole.clientItem.height.value) {
      const heightInMeters = pole.clientItem.height.value;
      const heightInFeet = Math.round(heightInMeters * 3.28084);
      height = heightInFeet.toString();
    }
    
    // If we have both height and class, combine them
    if (height) {
      return `${height}-${classOfPole}`;
    }
    
    // Otherwise just return the class
    return classOfPole;
  }
  
  // Fallback to clientItemAlias if available
  if (pole.clientItemAlias) {
    return pole.clientItemAlias;
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
          
          // As per reference doc: Use location.label for pole ID
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
            const measuredDesign = loc.designs.find((d: any) => d.label === "Measured Design" || d.layerType === "Measured");
            const recommendedDesign = loc.designs.find((d: any) => d.label === "Recommended Design" || d.layerType === "Recommended");
            
            // Extract pole spec from measured design as per reference
            if (measuredDesign) {
              poleSpec = extractPoleSpecification(measuredDesign);
              
              // Try to add species if available
              if (measuredDesign.structure?.pole?.clientItem?.species) {
                poleSpec += ` ${measuredDesign.structure.pole.clientItem.species}`;
              }
            }
            
            // Extract existing loading from Measured Design using stressRatio
            if (measuredDesign && measuredDesign.structure && measuredDesign.structure.pole) {
              // As per reference doc: Use structure.pole.stressRatio and multiply by 100
              if (measuredDesign.structure.pole.stressRatio !== undefined) {
                existingLoading = measuredDesign.structure.pole.stressRatio * 100;
              } else {
                // Fallback to analysis results if stressRatio not available
                if (measuredDesign.analysis && Array.isArray(measuredDesign.analysis)) {
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
              }
            }
            
            // Extract final loading from Recommended Design using stressRatio
            if (recommendedDesign && recommendedDesign.structure && recommendedDesign.structure.pole) {
              // As per reference doc: Use structure.pole.stressRatio and multiply by 100
              if (recommendedDesign.structure.pole.stressRatio !== undefined) {
                finalLoading = recommendedDesign.structure.pole.stressRatio * 100;
              } else {
                // Fallback to analysis results if stressRatio not available
                if (recommendedDesign.analysis && Array.isArray(recommendedDesign.analysis)) {
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
  if (!poleId) return '';
  
  const normalized = poleId
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[^a-z0-9-]/g, ''); // Remove special characters except hyphen
  
  return normalized;
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
