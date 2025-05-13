# Troubleshooting Guide

This guide provides solutions for common issues you might encounter when using the Pole Sync & Compare Tool.

## Pole Comparison Tool Issues

### File Upload Problems

#### Invalid File Format Error

**Issue**: "Invalid file format" error when uploading files.

**Solution**:
- Ensure you're uploading a `.xlsx` file for Katapult data
- Ensure you're uploading a `.json` file for SPIDAcalc data
- Check that the files aren't corrupted by opening them in their respective applications

#### Processing Error

**Issue**: "Processing Error" or "Failed to process the uploaded files" message.

**Solution**:
1. Check that your Katapult Excel file contains the expected columns:
   - `scid` or similar identifier
   - `pole_tag`, `DLOC_number`, or `PL_number`
   - `existing_capacity_%`
   - `final_passing_capacity_%`
   - `pole_spec` or `proposed_pole_spec`

2. Check that your SPIDAcalc JSON file has the standard structure:
   - Contains `leads` array
   - Each lead contains `locations` array
   - Each location contains `designs` array with "Measured Design" and "Recommended Design"

3. Try exporting your files again from the source applications

### Data Matching Issues

#### Many Missing Poles

**Issue**: Many poles are reported as missing in one system or the other.

**Solution**:
1. Check how poles are identified in each system
2. Ensure pole IDs follow a consistent format (e.g., "SCID-PoleNumber")
3. Look for formatting differences like spaces, hyphens, or capitalization
4. Check if one system uses "PL" prefix while the other doesn't

#### Formatting Issues

**Issue**: Many formatting issues reported between systems.

**Solution**:
1. Review the formatting issues section in the results
2. Look for patterns in the differences (e.g., extra spaces, different hyphenation)
3. Consider standardizing pole ID formats in the source systems

### Loading Percentage Issues

#### Incorrect Loading Percentages

**Issue**: Loading percentages seem incorrect or very different between systems.

**Solution**:
1. Verify that the correct columns are being used from the Katapult file
2. For SPIDAcalc, check that the analysis results contain the expected values
3. Adjust the threshold setting if small differences are expected
4. Check if percentages are stored as decimals (0-1) in one system and as whole numbers (0-100) in the other

#### High Loading Values Highlighted

**Issue**: Many loading values are highlighted in red.

**Solution**:
1. This is expected behavior for values over 100%
2. Review these poles for potential structural concerns
3. Verify the values in the source systems

## Cover Sheet Tool Issues

### File Upload Problems

#### Invalid File Format Error

**Issue**: "Invalid file format" error when uploading files.

**Solution**:
- Ensure you're uploading a `.json` file for SPIDAcalc data
- Check that the file isn't corrupted by opening it in SPIDAcalc

#### Processing Error

**Issue**: "Processing Error" or "Failed to process the SPIDAcalc file" message.

**Solution**:
1. Check that your SPIDAcalc JSON file contains the required fields:
   - `label` (for job number)
   - `date`
2. Ensure the file has the standard structure with leads, locations, and designs

### Missing Data Issues

#### Missing Project Information

**Issue**: Fields like job number, date, location, or city are missing.

**Solution**:
1. Check that your SPIDAcalc file contains this information in the expected fields
2. Manually enter the missing information in the form fields
3. For location/city, ensure at least one pole has valid coordinates for geocoding

#### Missing Pole Data

**Issue**: Pole data is missing or incomplete.

**Solution**:
1. Ensure your SPIDAcalc file contains the expected structure with leads, locations, and designs
2. Check that each location has a valid label
3. For missing loading values, check that designs contain valid analysis results
4. Manually enter missing values in the table

### Geocoding Issues

#### Incorrect Location or City

**Issue**: Geocoding returns incorrect location or city information.

**Solution**:
1. Check that your SPIDAcalc file contains valid coordinates
2. Manually enter the correct location and city information
3. Ensure your internet connection is working for the geocoding API call

### Export Issues

#### Copy to Clipboard Fails

**Issue**: "Copy failed" message when trying to copy data.

**Solution**:
1. Some browsers restrict clipboard access; try a different browser
2. Ensure you've granted clipboard permissions to the site
3. Try selecting and copying the text manually

#### Formatting Issues in Word

**Issue**: Data doesn't paste correctly into Word.

**Solution**:
1. Use the "Copy Whole Pole Table" button for proper table formatting
2. In Word, use "Paste Special" and select "Text" or "Unformatted Text"
3. After pasting, use Word's "Convert Text to Table" feature with tab delimiters

## General Issues

### Performance Problems

**Issue**: Application is slow or unresponsive.

**Solution**:
1. Try processing smaller files or fewer poles at once
2. Close other browser tabs and applications
3. Clear your browser cache and reload the page
4. Use a more powerful device if processing very large files

### Browser Compatibility

**Issue**: Features don't work correctly in your browser.

**Solution**:
1. Try using a modern browser like Chrome, Firefox, or Edge
2. Update your browser to the latest version
3. Disable browser extensions that might interfere with the application

### Network Issues

**Issue**: Application fails to load or geocoding doesn't work.

**Solution**:
1. Check your internet connection
2. If behind a firewall or proxy, ensure it allows access to required services
3. Try using a different network connection

## Still Having Issues?

If you're still experiencing problems after trying these solutions:

1. Check the browser console for error messages (F12 > Console)
2. Take screenshots of the issue and error messages
3. Note the steps to reproduce the problem
4. Contact support with this information
