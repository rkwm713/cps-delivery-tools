
import { createContext, useContext, useState, ReactNode } from "react";

export type PoleRow = {
  id: string;          // Station
  existing: number | null; // %
  final: number | null;    // %
  notes: string;
};

export interface CoverSheetData {
  jobNumber: string;
  client: string;
  date: string;
  location: string;
  city: string;
  engineer: string;
  comments: string;
  poles: PoleRow[];
}

const initialCoverSheetData: CoverSheetData = {
  jobNumber: "",
  client: "Charter/Spectrum", // Always this value
  date: "",
  location: "",
  city: "",
  engineer: "",
  comments: "",
  poles: []
};

type CoverSheetContextType = {
  data: CoverSheetData;
  updateData: (newData: Partial<CoverSheetData>) => void;
  updatePole: (index: number, newData: Partial<PoleRow>) => void;
};

const CoverSheetContext = createContext<CoverSheetContextType | undefined>(undefined);

export const CoverSheetProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<CoverSheetData>(initialCoverSheetData);

  const updateData = (newData: Partial<CoverSheetData>) => {
    setData(prevData => ({ ...prevData, ...newData }));
  };

  const updatePole = (index: number, newData: Partial<PoleRow>) => {
    setData(prevData => {
      const updatedPoles = [...prevData.poles];
      updatedPoles[index] = { ...updatedPoles[index], ...newData };
      return { ...prevData, poles: updatedPoles };
    });
  };

  return (
    <CoverSheetContext.Provider value={{ data, updateData, updatePole }}>
      {children}
    </CoverSheetContext.Provider>
  );
};

export const useCoverSheet = () => {
  const context = useContext(CoverSheetContext);
  if (context === undefined) {
    throw new Error("useCoverSheet must be used within a CoverSheetProvider");
  }
  return context;
};
