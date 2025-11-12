import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

interface PDFExtractResult {
  filename: string;
  text: string;
  numPages: number;
  info: any;
}

async function extractPDF(filePath: string): Promise<PDFExtractResult> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      filename: path.basename(filePath),
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error(`Error extracting PDF ${filePath}:`, error);
    throw error;
  }
}

async function extractAllPDFs(sourceDir: string, outputDir: string): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all PDF files from source directory
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.pdf'));
  
  console.log(`Found ${files.length} PDF files to process`);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    console.log(`\nProcessing: ${file}`);
    
    try {
      const result = await extractPDF(filePath);
      
      // Save extracted text to JSON
      const outputPath = path.join(outputDir, `${path.parse(file).name}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      
      console.log(`✓ Extracted ${result.numPages} pages from ${file}`);
      console.log(`  Saved to: ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to process ${file}`);
    }
  }
  
  console.log(`\n✓ Extraction complete! Output saved to ${outputDir}`);
}

// Main execution
const shipLogsDir = path.join(__dirname, '../../ship-logs');
const outputDir = path.join(__dirname, '../../extracted-data');

extractAllPDFs(shipLogsDir, outputDir)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

