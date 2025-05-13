# Project File Structure

This document provides an overview of the project's file structure and the purpose of key files and directories.

## Root Directory

- `index.html` - Main HTML entry point
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint configuration
- `README.md` - Project documentation

## Source Code (`src/`)

The `src/` directory contains all the application source code, organized into several subdirectories:

### Main Files

- `main.tsx` - Application entry point
- `App.tsx` - Main application component
- `index.css` - Global styles
- `vite-env.d.ts` - Vite environment type definitions

### Pages (`src/pages/`)

Contains the main page components for different sections of the application:

- `Index.tsx` - Pole Comparison Tool main page
- `CPSTool.tsx` - Cover Sheet Tool main page
- `HowToGuide.tsx` - Documentation and help page
- `NotFound.tsx` - 404 page

### Components (`src/components/`)

Contains reusable UI components:

#### Pole Comparison Tool Components

- `FileUpload.tsx` - File upload component for Pole Comparison Tool
- `FileProcessingService.ts` - Service for processing Katapult and SPIDAcalc files
- `ResultsTable.tsx` - Table component for displaying comparison results

#### Cover Sheet Tool Components

- `CoverSheetFileUpload.tsx` - File upload component for Cover Sheet Tool
- `CoverSheetService.ts` - Service for processing SPIDAcalc files for cover sheets
- `CoverSheetHeaderPanel.tsx` - Component for displaying and editing cover sheet header information
- `PoleTable.tsx` - Table component for displaying pole data

#### Shared Components

- `Header.tsx` - Application header with navigation

#### UI Components (`src/components/ui/`)

Contains shadcn-ui components:

- `button.tsx`, `card.tsx`, `table.tsx`, etc. - UI component library

### Context (`src/context/`)

Contains React context providers:

- `CoverSheetContext.tsx` - Context for managing cover sheet data

### Services (`src/services/`)

Contains service modules for external API interactions:

- `GeocodingService.ts` - Service for converting coordinates to addresses

### Hooks (`src/hooks/`)

Contains custom React hooks:

- `use-mobile.tsx` - Hook for detecting mobile devices
- `use-toast.ts` - Hook for displaying toast notifications

### Utilities (`src/lib/`)

Contains utility functions:

- `utils.ts` - General utility functions

## Documentation (`docs/`)

Contains detailed documentation:

- `pole-comparison-tool.md` - Documentation for the Pole Comparison Tool
- `cover-sheet-tool.md` - Documentation for the Cover Sheet Tool
- `data-flow.md` - Visual diagrams of data processing flow
- `file-structure.md` - This file

## Public Assets (`public/`)

Contains static assets:

- `CPSlogo.png` - Application logo
- `favicon.ico` - Favicon
- `robots.txt` - Robots configuration file

## Directory Structure Overview

```
pole-sync-compare/
├── docs/
│   ├── pole-comparison-tool.md
│   ├── cover-sheet-tool.md
│   ├── data-flow.md
│   └── file-structure.md
├── public/
│   ├── CPSlogo.png
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── CoverSheetFileUpload.tsx
│   │   ├── CoverSheetHeaderPanel.tsx
│   │   ├── CoverSheetService.ts
│   │   ├── FileProcessingService.ts
│   │   ├── FileUpload.tsx
│   │   ├── Header.tsx
│   │   ├── PoleTable.tsx
│   │   └── ResultsTable.tsx
│   ├── context/
│   │   └── CoverSheetContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── CPSTool.tsx
│   │   ├── HowToGuide.tsx
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── services/
│   │   └── GeocodingService.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
