import http from 'http';
import fs from 'fs';

let log = '';

const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
  log += `Status Code: ${res.statusCode}\n`;
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    log += `Response: ${data}\n`;
    fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/health-check.txt', log, 'utf8');
    process.exit(0);
  });
});

req.on('error', (err) => {
  log += `Error: ${err.message}\n`;
  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/health-check.txt', log, 'utf8');
  process.exit(1);
});
