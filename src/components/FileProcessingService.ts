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
        
        console.log("Reading Excel file:", file.name);
        console.log("Sheet name:", sheetName);
        
        // Get all headers from the first row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];
        
        // Determine if headers are in row 0 or row 1
        // First check row 0 (first row)
        let headerRow = 0;
        for (let C = range.s.c; C <= Math.min(range.e.c, 10); ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
          if (cell && cell.v) headers.push(String(cell.v));
        }
        
        // If we didn't find many headers in row 0, try row 1
        if (headers.length < 5) {
          headers.length = 0; // Clear the array
          headerRow = 1;
          for (let C = range.s.c; C <= Math.min(range.e.c, 10); ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 1, c: C })];
            if (cell && cell.v) headers.push(String(cell.v));
          }
        }
        
        console.log(`Headers appear to be in row ${headerRow + 1} (index ${headerRow})`);
        console.log("Sample headers found:", headers);
        
        // Parse sheet to JSON with the correct header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow });
        console.log(`Excel data rows found: ${jsonData.length}`);
        
        if (jsonData.length > 0) {
          // Log the first row's keys to see what columns we have
          console.log("First row columns:", Object.keys(jsonData[0] || {}).join(", "));
          
          // Check for our critical columns
          const criticalColumns = ['scid', 'pole_tag', 'DLOC_number', 'PL_number', 
                                  'existing_capacity_%', 'final_passing_capacity_%', 
                                  'pole_spec', 'proposed_pole_spec'];
          
          console.log("Checking for critical columns:");
          for (const column of criticalColumns) {
            const found = Object.keys(jsonData[0]).some(key => 
              key === column || key.toLowerCase() === column.toLowerCase());
            console.log(`  ${column}: ${found ? 'FOUND' : 'NOT FOUND'}`);
          }
          
          // Log the first 3 rows for debugging
          console.log("First 3 rows of data:");
          for (let i = 0; i < Math.min(3, jsonData.length); i++) {
            const row = jsonData[i] as Record<string, any>;
            console.log(`Row ${i}:`, {
              scid: row.scid || row.SCID || 'N/A',
              pole_tag: row.pole_tag || 'N/A',
              DLOC_number: row.DLOC_number || 'N/A',
              PL_number: row.PL_number || 'N/A',
              'existing_capacity_%': row['existing_capacity_%'] || 'N/A',
              'final_passing_capacity_%': row['final_passing_capacity_%'] || 'N/A',
              pole_spec: row.pole_spec || 'N/A',
              proposed_pole_spec: row.proposed_pole_spec || 'N/A'
            });
          }
        }
        
        resolve(jsonData);
      } catch (err) {
        console.error("Error parsing Excel file:", err);
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
  numericId: string;  // Added for numeric-only matching
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
  
  // Enhanced logging of Excel structure
  if (excelData.length > 0) {
    // Log all column headers with their data types from the first row
    const firstRow = excelData[0];
    console.log("Excel file structure:");
    for (const key in firstRow) {
      const value = firstRow[key];
      const valueType = typeof value;
      console.log(`  Column: "${key}" (${valueType}) = ${value}`);
    }
    
    // Log a few sample rows to understand the data
    console.log("First 3 rows of Excel data:");
    for (let i = 0; i < Math.min(3, excelData.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(excelData[i]));
    }
  }
  
  // Process each row in the Excel data
  excelData.forEach((row, index) => {
    // Log the entire row for debugging
    if (index < 3) {
      console.log(`Row ${index} raw data:`, row);
    }
    
    // Check if node_type is "pole" - only process rows with pole node type
    const nodeType = row.node_type || row.NODE_TYPE || row['Node Type'] || row['node type'];
    if (nodeType !== 'pole' && nodeType !== 'POLE' && nodeType !== 'Pole') {
      if (index < 10) {
        console.log(`Row ${index} skipped: node_type is not 'pole' (actual value: ${nodeType})`);
      }
      return;
    }
    
    // Expanded list of possible column names for SCID
    const scidOptions = [
      'scid', 'SCID', 'sc_id', 'SC_ID', 'ScId', 'sc id', 'SC ID', 'id', 'ID',
      'structure_id', 'structure id', 'structureid', 'StructureID', 'structure_code',
      'structure', 'pole_id', 'pole id', 'poleid'
    ];
    
    // Expanded list of possible column names for pole tag/number
    const poleTagOptions = [
      'pole_tag', 'POLE_TAG', 'Pole Tag', 'pole tag', 'poletag', 'PoleTag',
      'pole_name', 'pole name', 'polename', 'PoleName', 'pole_number', 'pole number',
      'tag', 'Tag', 'name', 'Name', 'number', 'Number'
    ];
    
    const dlocNumberOptions = [
      'DLOC_number', 'dloc_number', 'DLOC Number', 'dloc number', 'dloc', 'DLOC',
      'location_number', 'location number', 'loc_number', 'loc number'
    ];
    
    const plNumberOptions = [
      'PL_number', 'pl_number', 'PL Number', 'pl number', 'pl', 'PL', 'plnumber', 'PLNumber',
      'pole_number', 'pole number', 'polenumber', 'PoleNumber'
    ];
    
    // Try to find SCID
    const scid = getFieldValue(row, scidOptions, 'SCID');
    
    // Try each option in order for pole number
    let poleNumber = getFieldValue(row, poleTagOptions, 'pole tag');
    if (!poleNumber) {
      poleNumber = getFieldValue(row, dlocNumberOptions, 'DLOC number');
    }
    if (!poleNumber) {
      poleNumber = getFieldValue(row, plNumberOptions, 'PL number');
    }
    
    // If we still don't have a pole number, try to find any field that might contain "PL" followed by numbers
    if (!poleNumber) {
      for (const key in row) {
        const value = row[key];
        if (value && typeof value === 'string') {
          // Look for patterns like "PL12345" or similar
          if (/PL\d+/i.test(value)) {
            poleNumber = value;
            console.log(`Found potential pole number in field '${key}': ${value}`);
            break;
          }
        }
      }
    }
    
    // Debug which identifiers were found
    console.log(`Row ${index} identifiers - SCID: ${scid}, Pole Number: ${poleNumber}`);
    
    // Skip if we couldn't find both SCID and pole number
    if (!scid || !poleNumber) {
      console.log(`Row ${index} skipped: missing SCID or pole number`);
      return;
    }
    
    // Create pole ID with scid and poleNumber as specified in reference doc
    const poleId = `${scid}-${poleNumber}`;
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
    
    // Direct access to the critical columns with special handling for % in column names
    // As per reference doc: For Katapult Existing Loading %, use existing_capacity_%
    let existingLoadingRaw;
    
    // Try direct access first with exact column name
    if (row['existing_capacity_%'] !== undefined) {
      existingLoadingRaw = row['existing_capacity_%'];
      console.log(`Row ${index}: Found existing_capacity_% directly: ${existingLoadingRaw}`);
    } else {
      // Fall back to options if direct access fails
      const existingLoadingOptions = [
        'existing_capacity_%', 
        'Existing Capacity %',
        'existing_capacity',
        'Existing Capacity',
        'existing capacity %',
        'existing_capacity_percent',
        'existing capacity percent'
      ];
      
      existingLoadingRaw = getFieldValue(row, existingLoadingOptions, 'existing loading');
    }
    
    // As per reference doc: For Katapult Final Loading %, use final_passing_capacity_%
    let finalLoadingRaw;
    
    // Try direct access first with exact column name
    if (row['final_passing_capacity_%'] !== undefined) {
      finalLoadingRaw = row['final_passing_capacity_%'];
      console.log(`Row ${index}: Found final_passing_capacity_% directly: ${finalLoadingRaw}`);
    } else {
      // Fall back to options if direct access fails
      const finalLoadingOptions = [
        'final_passing_capacity_%',
        'Final Passing Capacity %',
        'final_passing_capacity',
        'Final Passing Capacity',
        'final passing capacity %',
        'final_passing_capacity_percent',
        'final passing capacity percent'
      ];
      
      finalLoadingRaw = getFieldValue(row, finalLoadingOptions, 'final loading');
    }
    
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
    
    // Extract numeric ID from pole number for matching
    let numericId = '';
    if (poleNumber) {
      // Extract digits from the pole number
      const digits = poleNumber.toString().replace(/\D/g, '');
      
      // Also check for PL pattern
      const plMatch = poleNumber.toString().match(/PL(\d+)/i);
      if (plMatch && plMatch[1]) {
        numericId = plMatch[1]; // Use the digits after PL
        console.log(`Row ${index}: Extracted numeric ID from PL pattern: ${numericId}`);
      } else if (digits) {
        numericId = digits; // Use all digits
        console.log(`Row ${index}: Extracted numeric ID from digits: ${numericId}`);
      }
    }
    
    // Store pole data
    poles.set(normalizedPoleId, {
      poleId,
      normalizedPoleId,
      numericId,
      poleSpec,
      existingLoading,
      finalLoading,
      scid: scid ? scid.toString() : undefined,
      plNumber: poleNumber ? poleNumber.toString() : undefined
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
  numericId: string;  // Added for numeric-only matching
  poleSpec: string;
  existingLoading: number;
  finalLoading: number;
}

/**
 * Extract SPIDAcalc pole specification from design
 * Updated to format as "[height]-[size] [species]" (e.g., "45-3 Southern Pine")
 */
const extractPoleSpecification = (design: any): string => {
  if (!design?.structure?.pole) {
    return "Unknown";
  }

  const pole = design.structure.pole;
  
  // Get the class of pole from clientItem.classOfPole
  let classOfPole = "Unknown";
  if (pole.clientItem && pole.clientItem.classOfPole) {
    classOfPole = pole.clientItem.classOfPole;
  }
  
  // Get the height
  let heightInFeet = 0;
  if (pole.clientItem?.height?.value) {
    const heightInMeters = pole.clientItem.height.value;
    heightInFeet = Math.round(heightInMeters * 3.28084);
  }
  
  // Get the species
  let species = "";
  
  // First try to get species directly from pole.clientItem
  if (pole.clientItem?.species) {
    species = pole.clientItem.species;
  }
  // If not found, try to find it in clientData.poles
  else if (design.clientData?.poles && Array.isArray(design.clientData.poles)) {
    // Find the pole definition that matches this pole's class
    const poleDefinition = design.clientData.poles.find(
      (p: any) => p.classOfPole === classOfPole
    );
    
    if (poleDefinition?.species) {
      species = poleDefinition.species;
    }
  }
  
  // Format as "[height]-[size] [species]"
  if (heightInFeet > 0 && classOfPole !== "Unknown") {
    return species 
      ? `${heightInFeet}-${classOfPole} ${species}` 
      : `${heightInFeet}-${classOfPole}`;
  }
  
  // Fallbacks for partial information
  if (heightInFeet > 0) {
    return `${heightInFeet}${species ? ` ${species}` : ''}`;
  }
  
  if (classOfPole !== "Unknown") {
    return `${classOfPole}${species ? ` ${species}` : ''}`;
  }
  
  if (species) {
    return species;
  }
  
  // Final fallback to clientItemAlias if available
  if (pole.clientItemAlias) {
    return pole.clientItemAlias;
  }

  return "Unknown";
}

/**
 * Find the 'actual %' value for the 'Pole' component in a design
 * Following the exact path: design > analysis > results > component="Pole" > actual
 */
const findPoleActualPercentage = (design: any, designType: string, poleId: string): number => {
  if (!design || !design.analysis || !Array.isArray(design.analysis)) {
    console.log(`Pole ${poleId}: No analysis array found in ${designType} design`);
    return 0;
  }
  
  console.log(`Pole ${poleId}: Found ${design.analysis.length} analysis cases in ${designType} design`);
  
  // Iterate through each analysis case
  for (const analysisCase of design.analysis) {
    if (!analysisCase.results || !Array.isArray(analysisCase.results)) {
      continue;
    }
    
    console.log(`Pole ${poleId}: Checking analysis case with ${analysisCase.results.length} results`);
    
    // Iterate through results to find the Pole component
    for (const result of analysisCase.results) {
      if (result.component === "Pole") {
        console.log(`Pole ${poleId}: Found Pole component in ${designType} design:`, JSON.stringify(result));
        
        // Extract the actual value
        if (result.actual !== undefined) {
          console.log(`Pole ${poleId}: Found ${designType} loading from actual: ${result.actual}`);
          return result.actual;
        }
      }
    }
  }
  
  console.log(`Pole ${poleId}: No Pole component with actual value found in ${designType} design`);
  return 0;
};

const extractSpidaPoles = (jsonData: any): Map<string, SpidaPole> => {
  const poles = new Map<string, SpidaPole>();
  const duplicates = new Set<string>();
  
  console.log("Starting SPIDAcalc pole extraction...");
  
  // Process each lead > location > design path
  if (jsonData.leads && Array.isArray(jsonData.leads)) {
    console.log(`Found ${jsonData.leads.length} leads in SPIDAcalc data`);
    
    jsonData.leads.forEach((lead: any, leadIndex: number) => {
      if (lead.locations && Array.isArray(lead.locations)) {
        console.log(`Lead ${leadIndex}: Found ${lead.locations.length} locations`);
        
        lead.locations.forEach((loc: any, locIndex: number) => {
          // As per reference doc: Use location.label for pole ID
          if (!loc.label) {
            console.log(`Location ${locIndex} in Lead ${leadIndex} skipped: No label found`);
            return;
          }
          
          const poleId = loc.label;
          const normalizedPoleId = normalizePoleId(poleId);
          
          console.log(`Processing pole: ${poleId}, normalized: ${normalizedPoleId}`);
          
          // Skip if already processed this pole ID
          if (poles.has(normalizedPoleId)) {
            duplicates.add(normalizedPoleId);
            console.log(`Duplicate pole ID found: ${poleId}`);
            return;
          }
          
          // Initialize pole data
          let poleSpec = "Unknown";
          let existingLoading = 0;
          let finalLoading = 0;
          
          // Process designs if available
          if (loc.designs && Array.isArray(loc.designs)) {
            console.log(`Pole ${poleId}: Found ${loc.designs.length} designs`);
            
            // Find measured and recommended designs as per reference doc
            const measuredDesign = loc.designs.find((d: any) => d.layerType === "Measured");
            const recommendedDesign = loc.designs.find((d: any) => d.layerType === "Recommended");
            
            console.log(`Pole ${poleId}: Measured design found: ${!!measuredDesign}, Recommended design found: ${!!recommendedDesign}`);
            
            // Extract pole spec using the updated extractPoleSpecification function
            if (measuredDesign) {
              poleSpec = extractPoleSpecification(measuredDesign);
              console.log(`Pole ${poleId}: Using pole spec: ${poleSpec}`);
            } else {
              console.log(`Pole ${poleId}: No measured design found, using Unknown for pole spec`);
            }
            
            // Try to extract existing loading from Measured Design using the new path
            if (measuredDesign) {
              // First try the new path: design > analysis > results > component="Pole" > actual
              existingLoading = findPoleActualPercentage(measuredDesign, "Measured", poleId);
              
              // If we couldn't find it with the new path, fall back to the old methods
              if (existingLoading === 0) {
                console.log(`Pole ${poleId}: Falling back to legacy methods for Measured design`);
                
                // Try the stressRatio method from the reference doc
                if (measuredDesign.structure?.pole?.stressRatio !== undefined) {
                  existingLoading = measuredDesign.structure.pole.stressRatio * 100;
                  console.log(`Pole ${poleId}: Found existing loading from stressRatio: ${existingLoading.toFixed(2)}%`);
                } 
                // Then try the analysisResults method as per user feedback
                else if (measuredDesign.analysisResults && Array.isArray(measuredDesign.analysisResults)) {
                  // Log the entire analysisResults array for debugging
                  console.log(`Pole ${poleId}: analysisResults structure:`, JSON.stringify(measuredDesign.analysisResults.slice(0, 2)));
                  
                  // Look for the pole component in the analysis results
                  const poleAnalysis = measuredDesign.analysisResults.find(
                    (result: any) => result.component === "Pole" || 
                                     (result.component && result.component.includes && result.component.includes("Pole"))
                  );
                  
                  if (poleAnalysis) {
                    console.log(`Pole ${poleId}: Found pole analysis:`, JSON.stringify(poleAnalysis));
                    
                    if (poleAnalysis.actual !== undefined) {
                      existingLoading = poleAnalysis.actual;
                      console.log(`Pole ${poleId}: Found existing loading from analysisResults.actual: ${existingLoading.toFixed(2)}%`);
                    } else if (poleAnalysis.value !== undefined) {
                      existingLoading = poleAnalysis.value;
                      console.log(`Pole ${poleId}: Found existing loading from analysisResults.value: ${existingLoading.toFixed(2)}%`);
                    } else if (poleAnalysis.ratio !== undefined) {
                      existingLoading = poleAnalysis.ratio * 100;
                      console.log(`Pole ${poleId}: Found existing loading from analysisResults.ratio: ${existingLoading.toFixed(2)}%`);
                    } else {
                      console.log(`Pole ${poleId}: Pole analysis found but no loading value:`, poleAnalysis);
                    }
                  } else {
                    // If we can't find a specific pole component, try to find any stress analysis
                    const stressAnalysis = measuredDesign.analysisResults.find(
                      (result: any) => result.analysisType === "STRESS" || 
                                       (result.type && result.type.includes && result.type.includes("STRESS"))
                    );
                    
                    if (stressAnalysis) {
                      console.log(`Pole ${poleId}: Found stress analysis:`, JSON.stringify(stressAnalysis));
                      
                      if (stressAnalysis.actual !== undefined) {
                        existingLoading = stressAnalysis.actual;
                        console.log(`Pole ${poleId}: Found existing loading from stress analysisResults.actual: ${existingLoading.toFixed(2)}%`);
                      } else if (stressAnalysis.value !== undefined) {
                        existingLoading = stressAnalysis.value;
                        console.log(`Pole ${poleId}: Found existing loading from stress analysisResults.value: ${existingLoading.toFixed(2)}%`);
                      } else if (stressAnalysis.ratio !== undefined) {
                        existingLoading = stressAnalysis.ratio * 100;
                        console.log(`Pole ${poleId}: Found existing loading from stress analysisResults.ratio: ${existingLoading.toFixed(2)}%`);
                      } else {
                        console.log(`Pole ${poleId}: Stress analysis found but no loading value:`, stressAnalysis);
                      }
                    } else {
                      console.log(`Pole ${poleId}: No pole or stress analysis found in analysisResults`);
                      
                      // Log the first analysis result to see its structure
                      if (measuredDesign.analysisResults.length > 0) {
                        console.log(`Pole ${poleId}: First analysis result:`, JSON.stringify(measuredDesign.analysisResults[0]));
                      }
                    }
                  }
                } else {
                  console.log(`Pole ${poleId}: No stressRatio or analysisResults found in measured design`);
                }
              }
            }
            
            // Try to extract final loading from Recommended Design using the new path
            if (recommendedDesign) {
              // First try the new path: design > analysis > results > component="Pole" > actual
              finalLoading = findPoleActualPercentage(recommendedDesign, "Recommended", poleId);
              
              // If we couldn't find it with the new path, fall back to the old methods
              if (finalLoading === 0) {
                console.log(`Pole ${poleId}: Falling back to legacy methods for Recommended design`);
                
                // Try the stressRatio method from the reference doc
                if (recommendedDesign.structure?.pole?.stressRatio !== undefined) {
                  finalLoading = recommendedDesign.structure.pole.stressRatio * 100;
                  console.log(`Pole ${poleId}: Found final loading from stressRatio: ${finalLoading.toFixed(2)}%`);
                } 
                // Then try the analysisResults method as per user feedback
                else if (recommendedDesign.analysisResults && Array.isArray(recommendedDesign.analysisResults)) {
                  // Log the entire analysisResults array for debugging
                  console.log(`Pole ${poleId}: final analysisResults structure:`, JSON.stringify(recommendedDesign.analysisResults.slice(0, 2)));
                  
                  // Look for the pole component in the analysis results
                  const poleAnalysis = recommendedDesign.analysisResults.find(
                    (result: any) => result.component === "Pole" || 
                                     (result.component && result.component.includes && result.component.includes("Pole"))
                  );
                  
                  if (poleAnalysis) {
                    console.log(`Pole ${poleId}: Found final pole analysis:`, JSON.stringify(poleAnalysis));
                    
                    if (poleAnalysis.actual !== undefined) {
                      finalLoading = poleAnalysis.actual;
                      console.log(`Pole ${poleId}: Found final loading from analysisResults.actual: ${finalLoading.toFixed(2)}%`);
                    } else if (poleAnalysis.value !== undefined) {
                      finalLoading = poleAnalysis.value;
                      console.log(`Pole ${poleId}: Found final loading from analysisResults.value: ${finalLoading.toFixed(2)}%`);
                    } else if (poleAnalysis.ratio !== undefined) {
                      finalLoading = poleAnalysis.ratio * 100;
                      console.log(`Pole ${poleId}: Found final loading from analysisResults.ratio: ${finalLoading.toFixed(2)}%`);
                    } else {
                      console.log(`Pole ${poleId}: Final pole analysis found but no loading value:`, poleAnalysis);
                    }
                  } else {
                    // If we can't find a specific pole component, try to find any stress analysis
                    const stressAnalysis = recommendedDesign.analysisResults.find(
                      (result: any) => result.analysisType === "STRESS" || 
                                       (result.type && result.type.includes && result.type.includes("STRESS"))
                    );
                    
                    if (stressAnalysis) {
                      console.log(`Pole ${poleId}: Found final stress analysis:`, JSON.stringify(stressAnalysis));
                      
                      if (stressAnalysis.actual !== undefined) {
                        finalLoading = stressAnalysis.actual;
                        console.log(`Pole ${poleId}: Found final loading from stress analysisResults.actual: ${finalLoading.toFixed(2)}%`);
                      } else if (stressAnalysis.value !== undefined) {
                        finalLoading = stressAnalysis.value;
                        console.log(`Pole ${poleId}: Found final loading from stress analysisResults.value: ${finalLoading.toFixed(2)}%`);
                      } else if (stressAnalysis.ratio !== undefined) {
                        finalLoading = stressAnalysis.ratio * 100;
                        console.log(`Pole ${poleId}: Found final loading from stress analysisResults.ratio: ${finalLoading.toFixed(2)}%`);
                      } else {
                        console.log(`Pole ${poleId}: Final stress analysis found but no loading value:`, stressAnalysis);
                      }
                    } else {
                      console.log(`Pole ${poleId}: No pole or stress analysis found in final analysisResults`);
                      
                      // Log the first analysis result to see its structure
                      if (recommendedDesign.analysisResults.length > 0) {
                        console.log(`Pole ${poleId}: First final analysis result:`, JSON.stringify(recommendedDesign.analysisResults[0]));
                      }
                    }
                  }
                } else {
                  console.log(`Pole ${poleId}: No stressRatio or analysisResults found in recommended design`);
                }
              }
            }
          } else {
            console.log(`Pole ${poleId}: No designs found`);
          }
          
          // Extract numeric ID from pole ID for matching
          let numericId = '';
          const plMatch = poleId.match(/PL(\d+)/i);
          if (plMatch && plMatch[1]) {
            numericId = plMatch[1]; // Extract digits after PL
            console.log(`Pole ${poleId}: Extracted numeric ID: ${numericId}`);
          } else {
            // Fallback to all digits
            numericId = poleId.replace(/\D/g, '');
            console.log(`Pole ${poleId}: Extracted numeric ID from all digits: ${numericId}`);
          }
          
          // Store pole data
          poles.set(normalizedPoleId, {
            poleId,
            normalizedPoleId,
            numericId,
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
 * Uses numeric IDs for matching instead of normalized IDs
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
  
  // Create maps for numeric ID lookup
  const spidaNumericMap = new Map<string, SpidaPole>();
  const katapultNumericMap = new Map<string, KatapultPole>();
  
  // Build numeric ID maps
  spidaPoles.forEach(pole => {
    if (pole.numericId) {
      spidaNumericMap.set(pole.numericId, pole);
    }
  });
  
  katapultPoles.forEach(pole => {
    if (pole.numericId) {
      katapultNumericMap.set(pole.numericId, pole);
    }
  });
  
  console.log(`Built numeric ID maps - SPIDA: ${spidaNumericMap.size}, Katapult: ${katapultNumericMap.size}`);
  
  // Find poles in Katapult but not in SPIDA using numeric IDs
  katapultPoles.forEach(pole => {
    if (pole.numericId && !spidaNumericMap.has(pole.numericId)) {
      result.missingInSpida.push(pole.poleId);
      console.log(`Pole ${pole.poleId} (numeric ID: ${pole.numericId}) not found in SPIDA data`);
    } else if (pole.numericId) {
      // Check for formatting issues
      const spidaPole = spidaNumericMap.get(pole.numericId)!;
      if (pole.poleId !== spidaPole.poleId) {
        result.formattingIssues.push({
          poleId: pole.poleId,
          issue: `Format mismatch: Katapult "${pole.poleId}" vs SPIDA "${spidaPole.poleId}" (matched by numeric ID: ${pole.numericId})`
        });
      }
    }
  });
  
  // Find poles in SPIDA but not in Katapult using numeric IDs
  spidaPoles.forEach(pole => {
    if (pole.numericId && !katapultNumericMap.has(pole.numericId)) {
      result.missingInKatapult.push(pole.poleId);
      console.log(`Pole ${pole.poleId} (numeric ID: ${pole.numericId}) not found in Katapult data`);
    }
  });
  
  return result;
};

/**
 * Generate comparison data between Katapult and SPIDAcalc
 * Uses numeric IDs for matching instead of normalized IDs
 */
const generateComparisonData = (
  katapultPoles: Map<string, KatapultPole>,
  spidaPoles: Map<string, SpidaPole>
): ProcessedRow[] => {
  const results: ProcessedRow[] = [];
  
  // Create maps for numeric ID lookup
  const spidaNumericMap = new Map<string, SpidaPole>();
  const katapultNumericMap = new Map<string, KatapultPole>();
  
  // Build numeric ID maps
  spidaPoles.forEach(pole => {
    if (pole.numericId) {
      spidaNumericMap.set(pole.numericId, pole);
    }
  });
  
  katapultPoles.forEach(pole => {
    if (pole.numericId) {
      katapultNumericMap.set(pole.numericId, pole);
    }
  });
  
  console.log(`Built numeric ID maps for comparison - SPIDA: ${spidaNumericMap.size}, Katapult: ${katapultNumericMap.size}`);
  
  // Process all Katapult poles
  katapultPoles.forEach((katapult) => {
    // Try to find matching SPIDA pole by numeric ID
    const spida = katapult.numericId ? spidaNumericMap.get(katapult.numericId) : undefined;
    
    // Extract SCID number from the pole ID
    const scidNumber = katapult.scid || katapult.poleId.split('-')[0] || "";
    
    let row: ProcessedRow = {
      poleNumber: katapult.poleId,
      scidNumber: scidNumber,
      spidaPoleNumber: spida?.poleId || "N/A",
      katapultPoleNumber: katapult.poleId,
      spidaPoleSpec: spida?.poleSpec || "N/A",
      katapultPoleSpec: katapult.poleSpec,
      spidaExistingLoading: spida?.existingLoading || 0,
      katapultExistingLoading: katapult.existingLoading,
      spidaFinalLoading: spida?.finalLoading || 0,
      katapultFinalLoading: katapult.finalLoading
    };
    
    // Debug log for matched poles
    if (spida) {
      console.log(`Matched Katapult pole ${katapult.poleId} with SPIDA pole ${spida.poleId} using numeric ID ${katapult.numericId}`);
    } else {
      console.log(`No SPIDA match for Katapult pole: ${katapult.poleId} (numeric ID: ${katapult.numericId})`);
    }
    
    results.push(row);
  });
  
  // Add SPIDA poles that are not in Katapult
  spidaPoles.forEach((spida) => {
    // Check if this SPIDA pole has already been matched with a Katapult pole
    if (spida.numericId && !katapultNumericMap.has(spida.numericId)) {
      console.log(`No Katapult match for SPIDA pole: ${spida.poleId} (numeric ID: ${spida.numericId})`);
      
      // Extract SCID number from the SPIDA pole ID
      const scidNumber = spida.poleId.split('-')[0] || "";
      
      const row: ProcessedRow = {
        poleNumber: spida.poleId,
        scidNumber: scidNumber,
        spidaPoleNumber: spida.poleId,
        katapultPoleNumber: "N/A",
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
    
    // Extract SCID number from the pole number
    const scidNumber = scid.toString();
    
    mockData.push({
      poleNumber,
      scidNumber,
      spidaPoleNumber: poleNumber,
      katapultPoleNumber: poleNumber,
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
