import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgPath = path.join(__dirname, '../public/baiust.gif');
const outPath = path.join(__dirname, '../src/components/marks/baiustLogo.js');

const bytes = fs.readFileSync(imgPath);
const base64 = bytes.toString('base64');
const content = `export const BAIUST_LOGO = "data:image/gif;base64,${base64}";\n`;

fs.writeFileSync(outPath, content);
console.log("baiustLogo.js created successfully!");
