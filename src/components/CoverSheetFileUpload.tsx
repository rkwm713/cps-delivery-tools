
import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { processSpidaFile } from "./CoverSheetService";
import { useCoverSheet } from "@/context/CoverSheetContext";

export const CoverSheetFileUpload = () => {
  const { toast } = useToast();
  const { updateData } = useCoverSheet();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a SPIDAcalc JSON file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await processSpidaFile(file);
      
      if (result.success && result.data) {
        updateData(result.data);
        toast({
          title: "File processed successfully",
          description: `Loaded ${result.data.poles.length} poles from SPIDAcalc file`,
        });
      } else {
        toast({
          title: "Processing Error",
          description: result.error || "Failed to process the SPIDAcalc file",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card 
      className={`p-8 border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} transition-colors cursor-pointer`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <svg 
          viewBox="0 0 24 24"
          className="h-12 w-12 text-[#0A3251] mb-4"
          fill="none" 
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        
        <h3 className="text-lg font-medium text-[#4E525B] mb-2">
          {isProcessing ? "Processing..." : "Upload SPIDAcalc JSON file"}
        </h3>
        
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop your SPIDAcalc file here, or click to select
        </p>
        
        <Button 
          variant="outline" 
          className="bg-[#0A3251] text-white hover:bg-[#0A3251]/90"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            openFileDialog();
          }}
        >
          Choose File
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </Card>
  );
};
