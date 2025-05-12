
import type { ProcessedRow } from "@/pages/Index";

/**
 * Process the uploaded files and return the comparison data
 * For demo purposes, this creates mock data rather than actually parsing files
 */
export const processFiles = async (
  katapultFile: File,
  spidaFile: File
): Promise<ProcessedRow[]> => {
  // In a production environment, we would send these files to a backend for processing
  // For this demo, we'll simulate file processing with a timeout and mock data
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate some mock data for the demo
  const mockResults: ProcessedRow[] = generateMockData();
  
  return mockResults;
};

/**
 * Generate mock data for demonstration purposes
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
