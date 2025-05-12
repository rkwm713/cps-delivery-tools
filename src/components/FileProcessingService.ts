
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
    
    // Extract pole information from both sources
    const katapultPoles = extractKatapultPoles(katapultData);
    const spidaPoles = extractSpidaPoles(spidaData);
    
    // Verify pole numbers between the two sources
    const verification = verifyPoleNumbers(katapultPoles, spidaPoles);
    
    // Generate comparison data
    const comparisonData = generateComparisonData(katapultPoles, spidaPoles);
    
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

const extractKatapultPoles = (excelData: any[]): Map<string, KatapultPole> => {
  const poles = new Map<string, KatapultPole>();
  const duplicates = new Set<string>();
  
  excelData.forEach(row => {
    if (!row.scid || !row.PL_number) return;
    
    // Create pole ID from scid and PL_number
    const poleId = `${row.scid}-${row.PL_number}`;
    const normalizedPoleId = normalizePoleId(poleId);
    
    // Check for duplicates
    if (poles.has(normalizedPoleId)) {
      duplicates.add(normalizedPoleId);
    }
    
    // Store pole data
    poles.set(normalizedPoleId, {
      poleId,
      normalizedPoleId,
      poleSpec: row.pole_spec || "",
      existingLoading: parseFloat(row.existing_capacity_) || 0,
      finalLoading: parseFloat(row.final_passing_capacity_) || 0,
      scid: row.scid.toString(),
      plNumber: row.PL_number.toString()
    });
  });
  
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

const extractSpidaPoles = (jsonData: any): Map<string, SpidaPole> => {
  const poles = new Map<string, SpidaPole>();
  const duplicates = new Set<string>();
  
  // Process each lead > location > design path
  if (jsonData.leads && Array.isArray(jsonData.leads)) {
    jsonData.leads.forEach((lead: any) => {
      if (lead.locations && Array.isArray(lead.locations)) {
        lead.locations.forEach((loc: any) => {
          if (loc.designs && Array.isArray(loc.designs)) {
            loc.designs.forEach((design: any) => {
              if (design.structure && design.structure.pole) {
                const pole = design.structure.pole;
                const poleId = pole.clientItemAlias;
                
                if (!poleId) return;
                
                const normalizedPoleId = normalizePoleId(poleId);
                
                // Check for duplicates
                if (poles.has(normalizedPoleId)) {
                  duplicates.add(normalizedPoleId);
                }
                
                // Calculate existing loading
                const existingLoading = pole.stressRatio 
                  ? parseFloat((pole.stressRatio * 100).toFixed(2)) 
                  : 0;
                
                // Calculate final loading
                let finalLoading = existingLoading;
                if (design.results && Array.isArray(design.results)) {
                  const poleResults = design.results.filter((r: any) => 
                    r.component === 'Pole' && r.analysisType === 'STRESS'
                  );
                  
                  if (poleResults.length > 0) {
                    const maxLoading = Math.max(...poleResults.map((r: any) => r.actual || 0));
                    finalLoading = parseFloat(maxLoading.toFixed(2));
                  }
                }
                
                // Store pole data
                poles.set(normalizedPoleId, {
                  poleId,
                  normalizedPoleId,
                  poleSpec: pole.clientItemAlias || "",
                  existingLoading,
                  finalLoading
                });
              }
            });
          }
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
    
    results.push(row);
  });
  
  // Add SPIDA poles that are not in Katapult
  spidaPoles.forEach((spida) => {
    const normalizedId = spida.normalizedPoleId;
    if (!katapultPoles.has(normalizedId)) {
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
