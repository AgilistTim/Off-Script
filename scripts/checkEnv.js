import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config();

// Also try to load .env.local if it exists
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envLocalContent = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const key in envLocalContent) {
    process.env[key] = envLocalContent[key];
  }
}

// Check for YouTube API key
console.log('VITE_YOUTUBE_API_KEY:', process.env.VITE_YOUTUBE_API_KEY ? 'Defined' : 'Not defined');
console.log('YT_TRANSCRIPT_API_TOKEN:', process.env.YT_TRANSCRIPT_API_TOKEN ? 'Defined' : 'Not defined');

// List all environment variables starting with VITE_ or YT_
console.log('\nEnvironment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('VITE_') || key.startsWith('YT_'))
  .forEach(key => {
    console.log(`${key}: ${key.includes('KEY') || key.includes('TOKEN') ? '[HIDDEN]' : process.env[key]}`);
  }); 