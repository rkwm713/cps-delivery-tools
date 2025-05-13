# Data Flow Documentation

This document provides a visual representation of how data flows through the application for both the Pole Comparison Tool and the Cover Sheet Tool.

## Pole Comparison Tool Data Flow

```mermaid
flowchart TD
    A[Katapult Excel File] --> B[File Upload Component]
    C[SPIDAcalc JSON File] --> B
    B --> D[FileProcessingService]
    D --> E[Extract Katapult Poles]
    D --> F[Extract SPIDAcalc Poles]
    E --> G[Normalize Pole IDs]
    F --> H[Normalize Pole IDs]
    G --> I[Match Poles]
    H --> I
    I --> J[Generate Comparison Data]
    I --> K[Verify Pole Numbers]
    J --> L[Apply Threshold]
    K --> M[Results Table]
    L --> M
    M --> N[Export to CSV]
    
    subgraph "Katapult Data Extraction"
        E --> E1[Extract SCID]
        E --> E2[Extract Pole Tag/DLOC/PL]
        E --> E3[Extract Pole Spec]
        E --> E4[Extract Existing Loading]
        E --> E5[Extract Final Loading]
    end
    
    subgraph "SPIDAcalc Data Extraction"
        F --> F1[Extract Location Label]
        F --> F2[Extract Pole Spec]
        F --> F3[Extract Existing Loading]
        F --> F4[Extract Final Loading]
    end
    
    subgraph "Issue Detection"
        L --> L1[Detect Spec Mismatches]
        L --> L2[Detect Loading Discrepancies]
        K --> K1[Detect Missing Poles]
        K --> K2[Detect Formatting Issues]
    end
```

## Cover Sheet Tool Data Flow

```mermaid
flowchart TD
    A[SPIDAcalc JSON File] --> B[CoverSheetFileUpload]
    B --> C[CoverSheetService]
    C --> D[Extract Project Info]
    C --> E[Extract Pole Data]
    D --> F[Missing Location/City?]
    F -->|Yes| G[GeocodingService]
    F -->|No| H[CoverSheetContext]
    G --> H
    E --> H
    H --> I[CoverSheetHeaderPanel]
    H --> J[PoleTable]
    I --> K[Copy Header Fields]
    J --> L[Copy Pole Table]
    
    subgraph "Project Info Extraction"
        D --> D1[Extract Job Number]
        D --> D2[Extract Date]
        D --> D3[Extract Location]
        D --> D4[Extract City]
        D --> D5[Extract Engineer]
        D --> D6[Generate Comments]
    end
    
    subgraph "Pole Data Extraction"
        E --> E1[Extract Station ID]
        E --> E2[Extract Existing Loading]
        E --> E3[Extract Final Loading]
        E --> E4[Extract Remedies]
    end
    
    subgraph "Geocoding Process"
        G --> G1[Extract Coordinates]
        G1 --> G2[Call Nominatim API]
        G2 --> G3[Parse Address]
    end
    
    subgraph "Export Formats"
        K --> K1[Format as Text]
        L --> L2[Format as TSV]
    end
```

## Data Structure

### Pole Comparison Data Structure

```mermaid
classDiagram
    class ProcessedRow {
        +string poleNumber
        +string scidNumber
        +string spidaPoleNumber
        +string katapultPoleNumber
        +string spidaPoleSpec
        +string katapultPoleSpec
        +number spidaExistingLoading
        +number katapultExistingLoading
        +number spidaFinalLoading
        +number katapultFinalLoading
        +number existingDelta
        +number finalDelta
        +boolean hasIssue
    }
    
    class VerificationResult {
        +string[] missingInSpida
        +string[] missingInKatapult
        +string[] duplicatesInSpida
        +string[] duplicatesInKatapult
        +FormattingIssue[] formattingIssues
    }
    
    class FormattingIssue {
        +string poleId
        +string issue
    }
    
    class KatapultPole {
        +string poleId
        +string normalizedPoleId
        +string numericId
        +string poleSpec
        +number existingLoading
        +number finalLoading
        +string scid
        +string plNumber
    }
    
    class SpidaPole {
        +string poleId
        +string normalizedPoleId
        +string numericId
        +string poleSpec
        +number existingLoading
        +number finalLoading
    }
```

### Cover Sheet Data Structure

```mermaid
classDiagram
    class CoverSheetData {
        +string jobNumber
        +string client
        +string date
        +string location
        +string city
        +string engineer
        +string comments
        +PoleRow[] poles
    }
    
    class PoleRow {
        +string id
        +number existing
        +number final
        +string notes
    }
    
    class GeocodingResult {
        +string city
        +string location
        +string fullAddress
    }
```

## File Structure and Dependencies

```mermaid
flowchart TD
    A[index.html] --> B[main.tsx]
    B --> C[App.tsx]
    C --> D[Index.tsx]
    C --> E[CPSTool.tsx]
    C --> F[HowToGuide.tsx]
    
    D --> G[FileUpload.tsx]
    D --> H[ResultsTable.tsx]
    G --> I[FileProcessingService.ts]
    
    E --> J[CoverSheetFileUpload.tsx]
    E --> K[CoverSheetHeaderPanel.tsx]
    E --> L[PoleTable.tsx]
    J --> M[CoverSheetService.ts]
    M --> N[GeocodingService.ts]
    
    subgraph "Pole Comparison Tool"
        D
        G
        H
        I
    end
    
    subgraph "Cover Sheet Tool"
        E
        J
        K
        L
        M
        N
    end
    
    subgraph "Shared Components"
        O[Header.tsx]
        P[UI Components]
    end
    
    D --> O
    E --> O
    F --> O
