
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { processFiles } from "./FileProcessingService";
import type { ProcessedRow } from "@/pages/Index";

interface FileUploadProps {
  onResultsGenerated: (data: ProcessedRow[]) => void;
  onProcessingStart: () => void;
  threshold: number;
  setThreshold: (value: number) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onResultsGenerated, 
  onProcessingStart,
  threshold,
  setThreshold
}) => {
  const { toast } = useToast();
  const [katapultFile, setKatapultFile] = useState<File | null>(null);
  const [spidaFile, setSpidaFile] = useState<File | null>(null);
  
  const katapultInputRef = useRef<HTMLInputElement>(null);
  const spidaInputRef = useRef<HTMLInputElement>(null);
  
  const handleKatapultFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.xlsx')) {
        toast({
          title: "Invalid file format",
          description: "Please upload an Excel (.xlsx) file for Katapult data",
          variant: "destructive"
        });
        if (katapultInputRef.current) katapultInputRef.current.value = '';
        return;
      }
      setKatapultFile(file);
    }
  };
  
  const handleSpidaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.json')) {
        toast({
          title: "Invalid file format",
          description: "Please upload a JSON file for SPIDA data",
          variant: "destructive"
        });
        if (spidaInputRef.current) spidaInputRef.current.value = '';
        return;
      }
      setSpidaFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!katapultFile || !spidaFile) {
      toast({
        title: "Missing files",
        description: "Please upload both Katapult Excel and SPIDA JSON files",
        variant: "destructive"
      });
      return;
    }

    onProcessingStart();
    
    try {
      // In a real application, we would process these files with a backend service
      // For this demo, we'll simulate the processing with our frontend service
      const results = await processFiles(katapultFile, spidaFile);
      onResultsGenerated(results);
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process the uploaded files. Please check the file formats.",
        variant: "destructive"
      });
    }
  };

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value[0]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Katapult File Upload */}
        <div className="space-y-2">
          <Label htmlFor="katapult-file">Katapult Node Attributes (.xlsx)</Label>
          <Input
            ref={katapultInputRef}
            id="katapult-file"
            type="file"
            accept=".xlsx"
            onChange={handleKatapultFileChange}
          />
          {katapultFile && (
            <p className="text-sm text-green-600">Selected: {katapultFile.name}</p>
          )}
        </div>

        {/* SPIDA File Upload */}
        <div className="space-y-2">
          <Label htmlFor="spida-file">SPIDAcalc Project (.json)</Label>
          <Input
            ref={spidaInputRef}
            id="spida-file"
            type="file"
            accept=".json"
            onChange={handleSpidaFileChange}
          />
          {spidaFile && (
            <p className="text-sm text-green-600">Selected: {spidaFile.name}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Difference Threshold: {threshold}%</Label>
        <div className="px-4">
          <Slider
            defaultValue={[5]}
            max={20}
            min={1}
            step={1}
            value={[threshold]}
            onValueChange={handleThresholdChange}
          />
        </div>
        <p className="text-sm text-gray-500">
          Rows with differences greater than {threshold}% will be flagged as issues
        </p>
      </div>

      <Card className="bg-blue-50 p-4 border border-blue-200">
        <div className="flex items-start">
          <svg 
            viewBox="0 0 24 24" 
            className="h-6 w-6 text-blue-500 mr-2 mt-0.5 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="8"></line>
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-700">How this works</p>
            <ul className="list-disc list-inside text-blue-600 mt-1 space-y-1">
              <li>Upload both the Katapult Excel file and SPIDAcalc JSON file</li>
              <li>Adjust the threshold to control which differences are flagged</li>
              <li>Click 'Process Files' to generate the comparison table</li>
              <li>View all poles or switch to the 'Issues' tab to see only flagged rows</li>
              <li>Export results to CSV for further analysis</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleUpload} 
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!katapultFile || !spidaFile}
        >
          Process Files
        </Button>
      </div>
    </div>
  );
};
