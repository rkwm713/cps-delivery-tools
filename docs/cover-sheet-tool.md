# Cover Sheet Tool Documentation

## Overview

The Cover Sheet Tool generates formatted cover sheets from SPIDAcalc files, extracting key project information and pole data for documentation purposes. This document explains in detail how data is extracted from source files and how the processing logic works.

## Data Sources

### SPIDAcalc JSON File

The tool expects a SPIDAcalc JSON export file with the standard structure containing:

- **Project Information**: Job number, date, location, engineer, etc.
- **Leads**: Array of lead objects
- **Locations**: Array of location objects within each lead
- **Designs**: Array of design objects within each location, typically including "Measured Design" and "Recommended Design"

## Field Mapping Logic

### Project Information Extraction

1. **Job Number**:
   - Source: `label` field at the root level of the JSON
   - Example: "SC-12345"

2. **Date**:
   - Source: `date` field at the root level of the JSON
   - Processing: Formatted as MM/DD/YYYY
   - Example: "05/12/2025"

3. **Location**:
   - Primary source: `clientData.generalLocation` field
   - Fallback: Determined via geocoding if coordinates are available
   - Format: Typically includes road, suburb, city, county, state, and postal code

4. **City**:
   - Primary source: `address.city` field
   - Fallback: Determined via geocoding if coordinates are available

5. **Engineer**:
   - Source: `engineer` field at the root level of the JSON

6. **Client**:
   - Hardcoded as "Charter/Spectrum" (as per application requirements)

7. **Comments**:
   - Generated automatically based on project data
   - Format: "[PLA count] PLAs on [pole count] poles"
   - Example: "24 PLAs on 12 poles"

### Pole Data Extraction

For each pole (location) in the SPIDAcalc file:

1. **Station ID**:
   - Source: `location.label` field
   - Example: "PL123"

2. **Existing Loading Percentage**:
   - Source: From "Measured Design" analysis results
   - Path: First tries to find "Light - Grade C" analysis, then falls back to the first available analysis
   - Value: From `analysis.results[].actual` where `component="Pole"` and `analysisType="STRESS"`

3. **Final Loading Percentage**:
   - Source: From "Recommended Design" analysis results
   - Uses same extraction logic as Existing Loading but from the Recommended Design

4. **Description of Work (Notes)**:
   - Source: `location.remedies` array
   - Processing: Joins all remedies with commas
   - Example: "Replace pole, Add guy wire, Adjust attachments"

## Geocoding Logic

When location or city information is missing from the SPIDAcalc file, the tool attempts to determine this information using geocoding:

1. **Coordinate Extraction**:
   - Tries multiple paths to find coordinates:
     - `location.latitude` and `location.longitude`
     - `location.coordinate.latitude` and `location.coordinate.longitude`
     - `location.geographicCoordinate.latitude` and `location.geographicCoordinate.longitude`

2. **Geocoding Process**:
   - Uses the Nominatim OpenStreetMap API to convert coordinates to an address
   - API endpoint: `https://nominatim.openstreetmap.org/reverse`
   - Headers include a User-Agent as required by the API

3. **Address Parsing**:
   - City: Extracted from `address.city`, `address.town`, `address.village`, or `address.county`
   - Location: Constructed from multiple address components including road, suburb, city, county, state, and postal code

## Export Format

The tool formats data for easy copying to Word documents:

### Header Fields

When copying all header fields, the format is:
```
Job Number: [value]
Client: [value]
Date: [value]
Location of Poles: [value]
City: [value]
Project Engineer: [value]
Comments: [value]
```

### Pole Table

When copying the pole table, the format is tab-separated values (TSV) for compatibility with Word tables:
```
Station[tab]Existing %[tab]Final %[tab]Description of Work
[pole1.id][tab][pole1.existing][tab][pole1.final][tab][pole1.notes]
[pole2.id][tab][pole2.existing][tab][pole2.final][tab][pole2.notes]
...
```

## Issue Detection

The tool highlights potential issues in the pole data:

1. **Missing Data**:
   - Rows with missing Existing % or Final % values are highlighted in red
   - Displayed as "—" in the table

2. **High Loading**:
   - Loading values exceeding 100% are highlighted in red
   - Indicates potential structural concerns

## Code Reference

The main processing logic is implemented in the following files:

- `src/components/CoverSheetService.ts`: Core data extraction and processing logic
- `src/services/GeocodingService.ts`: Coordinate to address conversion
- `src/context/CoverSheetContext.tsx`: Data structure and state management
- `src/components/CoverSheetFileUpload.tsx`: File upload handling
- `src/components/CoverSheetHeaderPanel.tsx`: Header information display
- `src/components/PoleTable.tsx`: Pole data display and formatting
