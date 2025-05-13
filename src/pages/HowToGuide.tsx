import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HowToGuide = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-[#0A3251]">How To Guide</h1>
        
        <Tabs defaultValue="pole-comparison" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pole-comparison">Pole Comparison Tool</TabsTrigger>
            <TabsTrigger value="cover-sheet">Cover Sheet Tool</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pole-comparison">
            <div className="space-y-6">
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Pole Comparison Tool Overview</h2>
                  <p className="mb-4">
                    The Pole Comparison Tool allows you to compare pole data between Katapult and SPIDAcalc files to identify discrepancies and ensure consistency.
                  </p>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">How to Use</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Upload a Katapult Excel file and a SPIDAcalc JSON file using the file upload section.</li>
                    <li>Set your desired threshold for identifying issues (default is 5%).</li>
                    <li>Click "Process Files" to analyze the data.</li>
                    <li>View the results in the table below, which will highlight any discrepancies.</li>
                    <li>Use the tabs to switch between viewing all poles or just those with issues.</li>
                    <li>Export the results to CSV if needed for further analysis.</li>
                  </ol>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Logic Behind the Tool</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">File Processing</h3>
                  <p className="mb-4">
                    The tool processes two different file formats:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Katapult Excel File:</strong> Contains pole data exported from Katapult, including pole IDs, specifications, and loading percentages.</li>
                    <li><strong>SPIDAcalc JSON File:</strong> Contains pole data exported from SPIDAcalc, with a different structure but similar information.</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Data Extraction</h3>
                  <p className="mb-4">
                    For each file, the tool extracts the following key information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Pole IDs:</strong> Unique identifiers for each pole, normalized for consistent comparison.</li>
                    <li><strong>Pole Specifications:</strong> The physical characteristics of each pole (height, class, material).</li>
                    <li><strong>Existing Loading:</strong> The current load percentage on each pole.</li>
                    <li><strong>Final Loading:</strong> The projected load percentage after proposed changes.</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Matching Algorithm</h3>
                  <p className="mb-4">
                    The tool uses a sophisticated matching algorithm to pair poles between the two systems:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 mb-4">
                    <li>Normalizes pole IDs by removing special characters and standardizing format.</li>
                    <li>Extracts numeric portions of IDs for additional matching capability.</li>
                    <li>Attempts to match poles using both full normalized IDs and numeric-only portions.</li>
                    <li>Identifies poles that exist in one system but not the other.</li>
                  </ol>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Issue Detection</h3>
                  <p className="mb-4">
                    The tool identifies several types of issues:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Pole Specification Mismatches:</strong> When the same pole has different specifications in each system.</li>
                    <li><strong>Loading Discrepancies:</strong> When the loading percentages differ by more than the specified threshold.</li>
                    <li><strong>Missing Poles:</strong> Poles that exist in one system but not the other.</li>
                    <li><strong>Formatting Issues:</strong> Inconsistencies in how pole IDs are formatted between systems.</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Troubleshooting</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">Common Issues</h3>
                  <ul className="list-disc pl-6 space-y-4">
                    <li>
                      <strong>No data appears after processing:</strong> Ensure your files contain the expected data structure. The Katapult file should be an Excel spreadsheet with columns for pole IDs, specifications, and loading percentages. The SPIDAcalc file should be a JSON export with the standard structure.
                    </li>
                    <li>
                      <strong>Many missing poles reported:</strong> This often indicates a formatting difference in pole IDs between systems. Check how poles are identified in each system and ensure consistency.
                    </li>
                    <li>
                      <strong>Loading percentages seem incorrect:</strong> Verify that the correct columns are being used from the Katapult file. For SPIDAcalc, ensure that the correct analysis results are being referenced.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="cover-sheet">
            <div className="space-y-6">
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Cover Sheet Tool Overview</h2>
                  <p className="mb-4">
                    The Cover Sheet Tool generates formatted cover sheets from SPIDAcalc files, extracting key project information and pole data for documentation purposes.
                  </p>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">How to Use</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Upload a SPIDAcalc JSON file using the file upload section.</li>
                    <li>The tool will automatically extract project information and pole data.</li>
                    <li>Review and edit the extracted information in the form fields if needed.</li>
                    <li>Use the "Copy to Clipboard" button to copy the formatted cover sheet data.</li>
                    <li>Paste the data into your desired document or template.</li>
                  </ol>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Logic Behind the Tool</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">File Processing</h3>
                  <p className="mb-4">
                    The Cover Sheet Tool processes SPIDAcalc JSON files to extract project and pole information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Project Information:</strong> Job number, date, location, city, and engineer.</li>
                    <li><strong>Pole Data:</strong> Station IDs, existing and final loading percentages, and notes.</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Data Extraction</h3>
                  <p className="mb-4">
                    The tool extracts information from specific paths in the SPIDAcalc JSON structure:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Job Number:</strong> Extracted from the <code>label</code> field.</li>
                    <li><strong>Date:</strong> Extracted from the <code>date</code> field and formatted as MM/DD/YYYY.</li>
                    <li><strong>Location:</strong> Extracted from <code>clientData.generalLocation</code> or determined via geocoding.</li>
                    <li><strong>City:</strong> Extracted from <code>address.city</code> or determined via geocoding.</li>
                    <li><strong>Engineer:</strong> Extracted from the <code>engineer</code> field.</li>
                    <li><strong>Pole Data:</strong> Extracted from the <code>leads.locations</code> structure.</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Geocoding</h3>
                  <p className="mb-4">
                    If location or city information is missing, the tool attempts to determine this information using geocoding:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 mb-4">
                    <li>Extracts coordinates from the first pole in the file.</li>
                    <li>Uses a geocoding service to convert these coordinates to an address.</li>
                    <li>Extracts city and location information from the geocoded address.</li>
                  </ol>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Comments Generation</h3>
                  <p className="mb-4">
                    The tool automatically generates a comment summarizing the project scope:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>Counts the total number of PLAs (Power Line Attachments) across all poles.</li>
                    <li>Counts the number of unique poles in the project.</li>
                    <li>Formats this information as "[PLA count] PLAs on [pole count] poles".</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Troubleshooting</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">Common Issues</h3>
                  <ul className="list-disc pl-6 space-y-4">
                    <li>
                      <strong>Missing project information:</strong> If fields like job number or date are missing, check that your SPIDAcalc file contains this information in the expected fields.
                    </li>
                    <li>
                      <strong>Missing pole data:</strong> Ensure your SPIDAcalc file contains the expected structure with leads, locations, and designs.
                    </li>
                    <li>
                      <strong>Incorrect location or city:</strong> If geocoding fails, you may need to manually enter this information. Check that your SPIDAcalc file contains valid coordinates.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="py-6 bg-gray-100 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          CPS Delivery Tool &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default HowToGuide;
