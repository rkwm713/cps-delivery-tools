# Pole Comparison Tool Documentation

## Overview

The Pole Comparison Tool allows you to compare pole data between Katapult and SPIDAcalc files to identify discrepancies and ensure consistency. This document explains in detail how data is extracted from source files and how the comparison logic works.

## Data Sources

### Katapult Excel File

The tool expects a Katapult Excel file (.xlsx) containing pole data with the following key fields:

- **SCID**: Structure ID or similar identifier
- **Pole Tag/DLOC Number/PL Number**: Pole identification number
- **Pole Spec**: Pole specification information
- **Existing Capacity %**: Current loading percentage
- **Final Passing Capacity %**: Projected loading percentage after changes

### SPIDAcalc JSON File

The tool expects a SPIDAcalc JSON export file with the standard structure containing:

- **Leads**: Array of lead objects
- **Locations**: Array of location objects within each lead
- **Designs**: Array of design objects within each location, typically including "Measured Design" and "Recommended Design"

## Field Mapping Logic

### Katapult Data Extraction

1. **Pole ID**:
   - Primary source: Combination of `scid` and `pole_tag` fields (e.g., "1234-PL567")
   - Fallback options:
     - If `pole_tag` is missing, tries `DLOC_number`
     - If still missing, tries `PL_number`
     - If still missing, searches for any field containing "PL" followed by numbers

2. **Pole Specification**:
   - Primary source: `proposed_pole_spec` field
   - Fallback: `pole_spec` field

3. **Existing Loading Percentage**:
   - Primary source: `existing_capacity_%` field
   - Handles various formats:
     - Numeric values (e.g., 75.5)
     - String values with % symbol (e.g., "75.5%")
     - Decimal values (e.g., 0.755 is converted to 75.5%)

4. **Final Loading Percentage**:
   - Primary source: `final_passing_capacity_%` field
   - Handles various formats (same as Existing Loading)

### SPIDAcalc Data Extraction

1. **Pole ID**:
   - Source: `location.label` field

2. **Pole Specification**:
   - Source: Extracted from `design.structure.pole` information
   - Format: "[height]-[class] [species]" (e.g., "45-3 Southern Pine")
   - Components:
     - Height: Converted from meters to feet
     - Class: From `pole.clientItem.classOfPole`
     - Species: From `pole.clientItem.species` or `design.clientData.poles[].species`

3. **Existing Loading Percentage**:
   - Primary source: From "Measured Design" analysis results
   - Path: `design.analysis[].results[]` where `component="Pole"` and `analysisType="STRESS"`
   - Value: `actual` field (represents percentage)
   - Fallbacks:
     - `design.structure.pole.stressRatio` (multiplied by 100)
     - `design.analysisResults[].actual` where `component="Pole"`

4. **Final Loading Percentage**:
   - Primary source: From "Recommended Design" analysis results
   - Uses same extraction logic as Existing Loading but from the Recommended Design

## Matching Algorithm

The tool uses a sophisticated matching algorithm to pair poles between the two systems:

1. **Normalization**:
   - Pole IDs are normalized by:
     - Converting to lowercase
     - Removing all whitespace
     - Removing special characters (except hyphens)
     - Example: "SC-123 PL456" becomes "sc-123pl456"

2. **Numeric ID Extraction**:
   - For additional matching capability, numeric portions are extracted:
     - First tries to extract digits after "PL" pattern (e.g., "PL456" → "456")
     - If no "PL" pattern, extracts all digits (e.g., "SC-123" → "123")

3. **Matching Process**:
   - First attempts to match using normalized IDs
   - If no match found, tries matching using numeric-only portions
   - This allows matching poles even when formatting differs between systems

## Issue Detection

The tool identifies several types of issues:

1. **Missing Poles**:
   - Poles found in Katapult but not in SPIDAcalc
   - Poles found in SPIDAcalc but not in Katapult

2. **Formatting Issues**:
   - Inconsistencies in how pole IDs are formatted between systems
   - Example: "SC-123 PL456" in Katapult vs "SC123-PL456" in SPIDAcalc

3. **Pole Specification Mismatches**:
   - When the same pole has different specifications in each system
   - Highlighted in red in the comparison table

4. **Loading Discrepancies**:
   - When loading percentages differ by more than the specified threshold
   - Default threshold is 5%, but can be adjusted by the user
   - Highlighted in orange in the comparison table

## Threshold Configuration

Users can configure the threshold for flagging loading discrepancies:

- Default: 5%
- Range: 1% to 20%
- Any difference greater than the threshold will be flagged as an issue

## Export Functionality

The tool allows exporting comparison results to CSV format with the following columns:

- SCID #
- SPIDAcalc Pole Number
- Katapult Pole Number
- SPIDAcalc Pole Spec
- Katapult Pole Spec
- SPIDAcalc Existing Loading %
- Katapult Existing Loading %
- SPIDAcalc Final Loading %
- Katapult Final Loading %
- Existing Δ (difference)
- Final Δ (difference)

## Code Reference

The main processing logic is implemented in the following files:

- `src/components/FileProcessingService.ts`: Core data extraction and comparison logic
- `src/pages/Index.tsx`: Main page component and issue detection
- `src/components/FileUpload.tsx`: File upload handling
- `src/components/ResultsTable.tsx`: Results display and formatting
