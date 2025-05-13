
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useCoverSheet } from "@/context/CoverSheetContext";
import { copyText } from "./CoverSheetService";
import { Clipboard } from "lucide-react";

export const CoverSheetHeaderPanel = () => {
  const { toast } = useToast();
  const { data, updateData } = useCoverSheet();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyField = async (field: keyof typeof data, value: string, label?: string) => {
    // If a label is provided, format with that label in bold
    const textToCopy = label ? `**${label}:** ${value}` : value;
    const success = await copyText(textToCopy);
    if (success) {
      setCopiedField(field);
      toast({
        title: "Copied to clipboard",
        description: `${field} has been copied to clipboard`
      });
      
      // Reset the copied field indication after 2 seconds
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleCopyAllHeaderFields = async () => {
    // Format the job number to always start with "2-2025-TS"
    const formattedJobNumber = `2-2025-TS${data.jobNumber}`;
    
    const headerText = [
      `**Client:** ${data.client}`,
      `**Job:** ${formattedJobNumber}`,
      `**Date:** ${data.date}`,
      `**Location of Poles:** ${data.location}`,
      `**City:** ${data.city}`,
      `**Project Engineer:** ${data.engineer}`,
      `**Comments:** ${data.comments}`
    ].join('\n');
    
    const success = await copyText(headerText);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "All header fields copied to clipboard"
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="bg-[#0A3251] text-white">
        <CardTitle>Cover Sheet Header Fields</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Number */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">Job Number</label>
                <Input 
                  value={data.jobNumber} 
                  onChange={(e) => updateData({ jobNumber: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'jobNumber' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('jobNumber', `2-2025-TS${data.jobNumber}`, 'Job')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Client */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">Client</label>
                <Input 
                  value={data.client} 
                  onChange={(e) => updateData({ client: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'client' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('client', data.client, 'Client')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Date */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">Date (MM/DD/YYYY)</label>
                <Input 
                  value={data.date} 
                  onChange={(e) => updateData({ date: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'date' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('date', data.date, 'Date')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Location of Poles */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">Location of Poles</label>
                <Input 
                  value={data.location} 
                  onChange={(e) => updateData({ location: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'location' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('location', data.location, 'Location of Poles')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            {/* City */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">City</label>
                <Input 
                  value={data.city} 
                  onChange={(e) => updateData({ city: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'city' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('city', data.city, 'City')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Project Engineer */}
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-1 block">Project Engineer</label>
                <Input 
                  value={data.engineer} 
                  onChange={(e) => updateData({ engineer: e.target.value })}
                  className="mb-0"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className={`mt-6 ${copiedField === 'engineer' ? 'bg-green-100 text-green-600' : ''}`}
                onClick={() => handleCopyField('engineer', data.engineer, 'Project Engineer')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Comments */}
          <div className="flex items-start space-x-2">
            <div className="flex-grow">
              <label className="text-sm font-medium mb-1 block">Comments</label>
              <Textarea 
                value={data.comments} 
                onChange={(e) => updateData({ comments: e.target.value })}
                rows={2}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              className={`mt-6 ${copiedField === 'comments' ? 'bg-green-100 text-green-600' : ''}`}
              onClick={() => handleCopyField('comments', data.comments, 'Comments')}
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleCopyAllHeaderFields}
              className="bg-[#0A3251] hover:bg-[#0A3251]/90"
            >
              <Clipboard className="mr-2 h-4 w-4" />
              Copy All Header Fields
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
