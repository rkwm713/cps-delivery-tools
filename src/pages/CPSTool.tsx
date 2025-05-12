
import { useState } from "react";
import { Header } from "@/components/Header";
import { CoverSheetFileUpload } from "@/components/CoverSheetFileUpload";
import { CoverSheetHeaderPanel } from "@/components/CoverSheetHeaderPanel";
import { PoleTable } from "@/components/PoleTable";
import { CoverSheetProvider } from "@/context/CoverSheetContext";

const CPSTool = () => {
  const [fileUploaded, setFileUploaded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-[#0A3251]">Cover Sheet Tool</h1>
        
        <CoverSheetProvider>
          <div className="space-y-6">
            <CoverSheetFileUpload />
            
            <div className="space-y-6 mt-6">
              <CoverSheetHeaderPanel />
              <PoleTable />
            </div>
          </div>
        </CoverSheetProvider>
      </main>
      
      <footer className="py-6 bg-gray-100 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          Pole Specification Comparison Tool &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default CPSTool;
