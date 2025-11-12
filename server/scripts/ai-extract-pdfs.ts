import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import OpenAI from 'openai';
import pLimit from 'p-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Configuration
const CONCURRENT_PDFS = 3; // Process 3 PDFs at once
const CONCURRENT_CHUNKS = 5; // Process 5 chunks at once per PDF
const CHUNK_DELAY = 200; // Reduced delay between chunks (ms)

interface ShipData {
  shipName: string;
  shipType?: string;
  homePort?: string;
  voyageStartDate?: string;
  voyageEndDate?: string;
  logEntries: LogEntryData[];
}

interface LogEntryData {
  date: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  weather?: string;
  course?: string;
  windDirection?: string;
  temperature?: number;
  notes: string;
  whaleSightings?: WhaleSightingData[];
  catches?: CatchData[];
  crewEvents?: CrewEventData[];
}

interface WhaleSightingData {
  species?: string;
  count: number;
  caught: boolean;
  notes?: string;
}

interface CatchData {
  whaleCount?: number;
  oilBarrels?: number;
  blubberWeight?: number;
  boneWeight?: number;
  notes?: string;
}

interface CrewEventData {
  crewMemberName?: string;
  role?: string;
  eventType: string;
  description?: string;
}

async function extractPDFText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting PDF ${filePath}:`, error);
    throw error;
  }
}

async function analyzeWithAI(text: string, filename: string): Promise<ShipData> {
  console.log('  🤖 Analyzing with AI...');
  
  // Split text into chunks if it's too long (GPT has token limits)
  const maxChunkLength = 12000; // Conservative limit
  const textChunks: string[] = [];
  
  for (let i = 0; i < text.length; i += maxChunkLength) {
    textChunks.push(text.substring(i, i + maxChunkLength));
  }
  
  const allLogEntries: LogEntryData[] = [];
  let shipName = '';
  let shipType: string | undefined;
  let homePort: string | undefined;
  let voyageStartDate: string | undefined;
  let voyageEndDate: string | undefined;
  
  // Process first chunk to get ship metadata
  if (textChunks.length > 0) {
    const metadataPrompt = `You are analyzing a historical whaling ship's log from the 1800s or 1900s.
Extract the following information from this ship log transcript:

1. Ship Name (NOT the document code like MS-220, but the actual ship name mentioned in the log)
2. Ship Type (if mentioned, e.g., "bark", "brig", "ship", "schooner")
3. Home Port (if mentioned)
4. Voyage Start Date (historical date from 1800s-1900s, format as YYYY-MM-DD)
5. Voyage End Date (if mentioned, format as YYYY-MM-DD)

Document: ${filename}
Text excerpt:
${textChunks[0].substring(0, 4000)}

Respond in JSON format:
{
  "shipName": "string",
  "shipType": "string or null",
  "homePort": "string or null",
  "voyageStartDate": "YYYY-MM-DD or null",
  "voyageEndDate": "YYYY-MM-DD or null"
}`;

    try {
      const metadataResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a historical maritime document analyst. Extract structured data from ship logs. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: metadataPrompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      const metadata = JSON.parse(metadataResponse.choices[0].message.content || '{}');
      shipName = metadata.shipName || `Unknown Ship (${filename})`;
      shipType = metadata.shipType;
      homePort = metadata.homePort;
      voyageStartDate = metadata.voyageStartDate;
      voyageEndDate = metadata.voyageEndDate;
      
      console.log(`    ✓ Ship: ${shipName}`);
      if (voyageStartDate) console.log(`    ✓ Voyage Start: ${voyageStartDate}`);
    } catch (error) {
      console.error('    ✗ Error extracting metadata:', error);
      shipName = `Unknown Ship (${filename})`;
    }
  }
  
  // Process each chunk to extract log entries (in parallel with rate limiting)
  console.log(`  📝 Processing ${textChunks.length} text chunks in parallel...`);
  
  const chunkLimit = pLimit(CONCURRENT_CHUNKS);
  const chunkPromises = textChunks.map((chunk, i) => 
    chunkLimit(async () => {
      console.log(`    Processing chunk ${i + 1}/${textChunks.length}...`);
      
      const logPrompt = `Extract all ship log entries from this historical whaling log (1800s-1900s).

For each log entry, extract:
- Date (historical dates from 1800s-1900s, format as YYYY-MM-DD. Be careful: if you see "25" it might mean 1825 or 1825, use context)
- Time (if mentioned)
- Latitude and Longitude (convert to decimal degrees, e.g., "52° 10' N" = 52.167)
- Weather conditions
- Course/heading
- Wind direction
- Temperature (if mentioned)
- Notes/observations
- Whale sightings (species, count, whether caught)
- Catches (whale count, oil barrels, blubber weight, bone weight)
- Crew events (illness, death, injury, accidents)

Text:
${chunk}

Respond with a JSON array of log entries. Each entry should have this structure:
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM or null",
      "latitude": number or null,
      "longitude": number or null,
      "weather": "string or null",
      "course": "string or null",
      "windDirection": "string or null",
      "temperature": number or null,
      "notes": "string",
      "whaleSightings": [
        {
          "species": "string or null",
          "count": number,
          "caught": boolean,
          "notes": "string or null"
        }
      ],
      "catches": [
        {
          "whaleCount": number or null,
          "oilBarrels": number or null,
          "blubberWeight": number or null,
          "boneWeight": number or null,
          "notes": "string or null"
        }
      ],
      "crewEvents": [
        {
          "crewMemberName": "string or null",
          "role": "string or null",
          "eventType": "illness|death|injury|other",
          "description": "string or null"
        }
      ]
    }
  ]
}`;

      try {
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
        
        const logResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a historical maritime document analyst. Extract structured log entries from ship logs. Always respond with valid JSON. Ensure dates are from the 1800s-1900s.'
            },
            {
              role: 'user',
              content: logPrompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });
        
        const result = JSON.parse(logResponse.choices[0].message.content || '{"entries":[]}');
        if (result.entries && Array.isArray(result.entries)) {
          console.log(`      ✓ Extracted ${result.entries.length} entries from chunk ${i + 1}`);
          return result.entries;
        }
        return [];
      } catch (error) {
        console.error(`      ✗ Error processing chunk ${i + 1}:`, error);
        return [];
      }
    })
  );
  
  // Wait for all chunks to complete
  const chunkResults = await Promise.all(chunkPromises);
  chunkResults.forEach(entries => allLogEntries.push(...entries));
  
  console.log(`  ✓ Total log entries extracted: ${allLogEntries.length}`);
  
  return {
    shipName,
    shipType,
    homePort,
    voyageStartDate,
    voyageEndDate,
    logEntries: allLogEntries
  };
}

async function processSinglePDF(
  file: string, 
  sourceDir: string, 
  outputDir: string, 
  index: number, 
  total: number
): Promise<void> {
  const filePath = path.join(sourceDir, file);
  const outputPath = path.join(outputDir, `${path.parse(file).name}.json`);
  
  // Skip if already processed
  if (fs.existsSync(outputPath)) {
    console.log(`[${index + 1}/${total}] ⏭️  Skipping (already processed): ${file}`);
    return;
  }
  
  console.log(`[${index + 1}/${total}] 🔄 Processing: ${file}`);
  
  try {
    // Extract text from PDF
    console.log('  📄 Extracting text from PDF...');
    const text = await extractPDFText(filePath);
    console.log(`  ✓ Extracted ${text.length} characters`);
    
    // Analyze with AI
    const shipData = await analyzeWithAI(text, file);
    
    // Save structured data
    fs.writeFileSync(outputPath, JSON.stringify(shipData, null, 2));
    
    console.log(`  ✓ Saved structured data to: ${outputPath}`);
    console.log('');
    
  } catch (error) {
    console.error(`  ✗ Failed to process ${file}:`, error);
    throw error;
  }
}

async function processAllPDFs(sourceDir: string, outputDir: string): Promise<void> {
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.log('Please set it in your .env file or environment:');
    console.log('export OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all PDF files from source directory
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.pdf'));
  
  console.log(`\n🚢 Found ${files.length} PDF files to process`);
  console.log(`⚡ Processing ${CONCURRENT_PDFS} PDFs in parallel\n`);
  
  // Process PDFs in parallel with rate limiting
  const pdfLimit = pLimit(CONCURRENT_PDFS);
  const pdfPromises = files.map((file, i) => 
    pdfLimit(() => processSinglePDF(file, sourceDir, outputDir, i, files.length))
  );
  
  // Wait for all PDFs to complete
  const results = await Promise.allSettled(pdfPromises);
  
  // Count successes and failures
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log('✅ AI extraction complete!');
  console.log(`   📊 Succeeded: ${succeeded}/${files.length}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}/${files.length}`);
  }
  console.log('');
}

// Main execution
const shipLogsDir = path.join(__dirname, '../../ship-logs');
const outputDir = path.join(__dirname, '../../extracted-data');

processAllPDFs(shipLogsDir, outputDir)
  .then(() => {
    console.log('🎉 All PDFs processed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

