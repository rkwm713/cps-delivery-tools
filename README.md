# Pole Sync & Compare Tool

## Project Overview

This application provides utilities for pole data management and comparison, specifically designed for utility pole structural analysis workflows. It consists of two main tools:

1. **Pole Comparison Tool**: Compare pole data between Katapult and SPIDAcalc files to identify discrepancies and ensure consistency.
2. **Cover Sheet Tool**: Generate formatted cover sheets from SPIDAcalc files, extracting key project information and pole data for documentation purposes.

## Installation and Setup

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Setup Instructions

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd pole-sync-compare

# Install dependencies
npm i

# Start the development server
npm run dev
```

## Documentation

For detailed information about how data is processed and mapped in each tool, refer to the [Documentation Index](./docs/README.md) or the specific guides below:

- [Pole Comparison Tool Documentation](./docs/pole-comparison-tool.md)
- [Cover Sheet Tool Documentation](./docs/cover-sheet-tool.md)
- [Data Flow Documentation](./docs/data-flow.md) - Visual diagrams of data processing flow
- [File Structure Documentation](./docs/file-structure.md) - Overview of project organization
- [Troubleshooting Guide](./docs/troubleshooting.md) - Solutions for common issues

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

You can deploy this project using Lovable:

1. Open [Lovable](https://lovable.dev/projects/29d5addc-9aa5-437a-84c5-e621a3f8032f)
2. Click on Share -> Publish

## Custom Domain Setup

To connect a custom domain:

1. Navigate to Project > Settings > Domains
2. Click Connect Domain
3. Follow the instructions in the [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide) guide
