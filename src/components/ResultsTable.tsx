
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProcessedRow } from "@/pages/Index";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResultsTableProps {
  rows: ProcessedRow[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ rows }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ProcessedRow;
    direction: "ascending" | "descending";
  } | null>(null);

  // Filter rows based on search query
  const filteredRows = searchQuery
    ? rows.filter(
        (row) =>
          row.scidNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.poleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.spidaPoleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.katapultPoleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.spidaPoleSpec.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.katapultPoleSpec.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rows;

  // Sort rows based on sort configuration
  const sortedRows = [...filteredRows];
  if (sortConfig !== null) {
    sortedRows.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }

  const requestSort = (key: keyof ProcessedRow) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: keyof ProcessedRow) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return (
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortConfig.direction === "ascending" ? (
      <svg
        className="h-4 w-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="h-4 w-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  // Format loading percent values - reduced to 1 decimal place for compactness
  const formatPercent = (value: number) => {
    return value !== undefined ? `${value.toFixed(1)}%` : "N/A";
  };

  // Determine if a cell should be highlighted for issues
  const getCellClass = (row: ProcessedRow, field: 'spec' | 'existing' | 'final') => {
    if (!row.hasIssue) return "";
    
    if (field === 'spec' && row.spidaPoleSpec !== row.katapultPoleSpec) {
      return "bg-red-100 text-red-800";
    }
    
    if (field === 'existing' && row.existingDelta && row.existingDelta > 5) {
      return "bg-orange-100 text-orange-800";
    }
    
    if (field === 'final' && row.finalDelta && row.finalDelta > 5) {
      return "bg-orange-100 text-orange-800";
    }
    
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Input
            placeholder="Search poles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <div className="text-sm text-gray-500">
          Showing {sortedRows.length} of {rows.length} poles
        </div>
      </div>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table className="whitespace-nowrap text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("scidNumber")}
                >
                  SCID #
                  <span className="ml-2">{getSortIcon("scidNumber")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("spidaPoleNumber")}
                >
                  SPIDA Pole #
                  <span className="ml-2">{getSortIcon("spidaPoleNumber")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("katapultPoleNumber")}
                >
                  Katapult Pole #
                  <span className="ml-2">{getSortIcon("katapultPoleNumber")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[130px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("spidaPoleSpec")}
                >
                  SPIDA Pole Spec
                  <span className="ml-2">{getSortIcon("spidaPoleSpec")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[130px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("katapultPoleSpec")}
                >
                  Katapult Pole Spec
                  <span className="ml-2">{getSortIcon("katapultPoleSpec")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("spidaExistingLoading")}
                >
                  SPIDA Existing %
                  <span className="ml-2">{getSortIcon("spidaExistingLoading")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("katapultExistingLoading")}
                >
                  Katapult Existing %
                  <span className="ml-2">{getSortIcon("katapultExistingLoading")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("spidaFinalLoading")}
                >
                  SPIDA Final %
                  <span className="ml-2">{getSortIcon("spidaFinalLoading")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  className="flex items-center p-0 h-auto font-semibold text-left"
                  onClick={() => requestSort("katapultFinalLoading")}
                >
                  Katapult Final %
                  <span className="ml-2">{getSortIcon("katapultFinalLoading")}</span>
                </Button>
              </TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row, index) => (
                <TableRow key={index} className={row.hasIssue ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">{row.scidNumber}</TableCell>
                  <TableCell>{row.spidaPoleNumber}</TableCell>
                  <TableCell>{row.katapultPoleNumber}</TableCell>
                  <TableCell className={getCellClass(row, 'spec')}>{row.spidaPoleSpec}</TableCell>
                  <TableCell className={getCellClass(row, 'spec')}>{row.katapultPoleSpec}</TableCell>
                  <TableCell className={getCellClass(row, 'existing')}>
                    {formatPercent(row.spidaExistingLoading)}
                  </TableCell>
                  <TableCell className={getCellClass(row, 'existing')}>
                    {formatPercent(row.katapultExistingLoading)}
                  </TableCell>
                  <TableCell className={getCellClass(row, 'final')}>
                    {formatPercent(row.spidaFinalLoading)}
                  </TableCell>
                  <TableCell className={getCellClass(row, 'final')}>
                    {formatPercent(row.katapultFinalLoading)}
                  </TableCell>
                  <TableCell>
                    {row.hasIssue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Issue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        OK
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
