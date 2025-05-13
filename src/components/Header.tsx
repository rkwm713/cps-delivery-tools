
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="bg-white shadow-md py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/CPSlogo.png" 
            alt="CPS Logo" 
            className="h-8 mr-2" 
          />
          <h1 className="text-2xl font-bold text-gray-800">
            CPS Delivery Tool
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" className="text-[#0A3251] hover:bg-gray-100">
            <Link to="/" className="flex items-center">Home</Link>
          </Button>
          <Button variant="ghost" className="text-[#0A3251] hover:bg-gray-100">
            <Link to="/cps-tool" className="flex items-center">Cover Sheet Tool</Link>
          </Button>
          <Button variant="ghost" className="text-[#0A3251] hover:bg-gray-100">
            <Link to="/how-to-guide" className="flex items-center">
              <svg 
                viewBox="0 0 24 24" 
                className="h-5 w-5 mr-1" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              How To Guide
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
