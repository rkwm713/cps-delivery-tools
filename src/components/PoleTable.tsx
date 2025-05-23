
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useCoverSheet } from "@/context/CoverSheetContext";
import { copyText } from "./CoverSheetService";
import { Clipboard } from "lucide-react";

export const PoleTable = () => {
  const { toast } = useToast();
  const { data, updatePole } = useCoverSheet();
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);

  // Format station ID by removing any "x-" prefix (where x is any digit)
  const formatStationId = (stationId: string): string => {
    return stationId.replace(/^\d+-/, '');
  };

  const handleCopyRow = async (index: number) => {
    const pole = data.poles[index];
    
    // Format the row for copying in a way that works with Word tables
    // Including all 5 columns: #, Station, Existing %, Final %, Description of Work
    const formattedStationId = formatStationId(pole.id);
    const rowText = `${index + 1}\t${formattedStationId}\t${formatLoadingValue(pole.existing)}\t${formatLoadingValue(pole.final)}\t${pole.notes}`;
    
    const success = await copyText(rowText);
    if (success) {
      setCopiedRowIndex(index);
      toast({
        title: "Copied to clipboard",
        description: `Row data for pole ${formattedStationId} has been copied to clipboard with all columns`
      });
      
      // Reset the copied indication after 2 seconds
      setTimeout(() => setCopiedRowIndex(null), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const formatLoadingValue = (value: number | null): string => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  const handleCopyWholeTable = async () => {
    // Create properly formatted table data for Word
    // Add header row with all 5 columns
    const headerRow = ["#", "Station", "Existing %", "Final %", "Description of Work"].join('\t');
    
    // Format each data row with tabs between columns - 5 column format
    // Remove "1-" prefix from station IDs
    const dataRows = data.poles.map((pole, index) => {
      const formattedStationId = formatStationId(pole.id);
      return `${index + 1}\t${formattedStationId}\t${formatLoadingValue(pole.existing)}\t${formatLoadingValue(pole.final)}\t${pole.notes}`;
    });
    
    // Join rows with newlines for proper table row separation in Word
    const tableContent = [headerRow, ...dataRows].join('\n');
    
    const success = await copyText(tableContent);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Complete table copied in 5-column format - paste directly into Word"
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Check if row has missing data or high loading
  const hasIssue = (pole: typeof data.poles[0]): boolean => {
    return pole.existing === null || pole.final === null;
  };

  // Check if loading value exceeds 100%
  const isHighLoading = (value: number | null): boolean => {
    return value !== null && value > 100;
  };

  return (
    <Card>
      <CardHeader className="bg-[#0A3251] text-white">
        <CardTitle>Pole Table</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Existing %</TableHead>
                <TableHead>Final %</TableHead>
                <TableHead>Description of Work</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.poles.map((pole, index) => (
                <TableRow 
                  key={`${pole.id}-${index}`}
                  className={hasIssue(pole) ? "bg-red-50" : ""}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatStationId(pole.id)}</TableCell>
                  <TableCell className={isHighLoading(pole.existing) ? "text-red-600 font-medium" : ""}>
                    {formatLoadingValue(pole.existing)}
                  </TableCell>
                  <TableCell className={isHighLoading(pole.final) ? "text-red-600 font-medium" : ""}>
                    {formatLoadingValue(pole.final)}
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={pole.notes} 
                      onChange={(e) => updatePole(index, { notes: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyRow(index)}
                      className={copiedRowIndex === index ? "bg-green-100 text-green-600" : ""}
                      title="Copy row in Word table format"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {data.poles.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleCopyWholeTable}
              className="bg-[#0A3251] hover:bg-[#0A3251]/90"
              title="Copy entire table in Word table format"
            >
              <Clipboard className="mr-2 h-4 w-4" />
              Copy Whole Pole Table
            </Button>
          </div>
        )}
        
        {data.poles.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No pole data available. Upload a SPIDAcalc file to view poles.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
