
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ResultsTable } from "@/components/ResultsTable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

export interface ProcessedRow {
  poleNumber: string;
  spidaPoleSpec: string;
  katapultPoleSpec: string;
  spidaExistingLoading: number;
  katapultExistingLoading: number;
  spidaFinalLoading: number;
  katapultFinalLoading: number;
  existingDelta?: number;
  finalDelta?: number;
  hasIssue?: boolean;
}

const Index = () => {
  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [issues, setIssues] = useState<ProcessedRow[]>([]);
  const [threshold, setThreshold] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleResultsGenerated = (data: ProcessedRow[]) => {
    setIsProcessing(false);
    
    // Apply threshold to find issues
    const issueRows = data.filter(row => {
      const existingDelta = Math.abs(row.spidaExistingLoading - row.katapultExistingLoading);
      const finalDelta = Math.abs(row.spidaFinalLoading - row.katapultFinalLoading);
      const specMismatch = row.spidaPoleSpec !== row.katapultPoleSpec;
      
      row.existingDelta = existingDelta;
      row.finalDelta = finalDelta;
      row.hasIssue = existingDelta > threshold || finalDelta > threshold || specMismatch;
      
      return row.hasIssue;
    });
    
    setResults(data);
    setIssues(issueRows);
    
    toast({
      title: "Data processed successfully",
      description: `Found ${data.length} poles with ${issueRows.length} potential issues.`,
    });
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleExportCSV = () => {
    const currentData = results;
    if (currentData.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Process some data first before exporting.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      "Pole Number", "SPIDA Pole Spec", "Katapult Pole Spec", 
      "SPIDAcalc Existing Loading %", "Katapult Existing loading %", 
      "SPIDAcalc Final loading %", "Katapult Final Loading %",
      "Existing Δ", "Final Δ"
    ];
    
    const csvRows = [
      headers.join(','),
      ...currentData.map(row => [
        row.poleNumber,
        row.spidaPoleSpec,
        row.katapultPoleSpec,
        row.spidaExistingLoading,
        row.katapultExistingLoading,
        row.spidaFinalLoading,
        row.katapultFinalLoading,
        row.existingDelta,
        row.finalDelta
      ].join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pole_comparison_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export complete",
      description: "CSV file has been downloaded.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8 shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Upload Files</h2>
            <FileUpload 
              onResultsGenerated={handleResultsGenerated} 
              onProcessingStart={handleProcessingStart}
              threshold={threshold}
              setThreshold={setThreshold}
            />
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Results</h2>
              <Button onClick={handleExportCSV}>Export to CSV</Button>
            </div>
            
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Poles ({results.length})</TabsTrigger>
                <TabsTrigger value="issues">Issues Found ({issues.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <ResultsTable rows={results} />
              </TabsContent>
              
              <TabsContent value="issues">
                <ResultsTable rows={issues} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg">Processing data...</p>
            </div>
          </div>
        )}
        
        {!isProcessing && results.length === 0 && (
          <Card className="bg-white shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center">
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Results Yet</h3>
                <p className="text-gray-500 mb-6">Upload and process files to see comparison results</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      <footer className="py-6 bg-gray-100 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          Pole Specification Comparison Tool &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Index;
