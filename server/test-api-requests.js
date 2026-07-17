import http from 'http';
import fs from 'fs';

async function makeRequest(url, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });
    req.end();
  });
}

async function runDiagnostics() {
  let log = '';
  const adminHeaders = {
    'x-admin-email': 'admin@gmail.com',
    'x-admin-password': 'Admin@123'
  };

  log += 'Test 1: GET /api/batches\n';
  const r1 = await makeRequest('http://127.0.0.1:5000/api/batches', adminHeaders);
  log += `Status: ${r1.status}\nResponse: ${r1.data}\n\n`;

  log += 'Test 2: GET /api/batches/16/sections (invalid ObjectId format)\n';
  const r2 = await makeRequest('http://127.0.0.1:5000/api/batches/16/sections', adminHeaders);
  log += `Status: ${r2.status}\nResponse: ${r2.data}\n\n`;

  log += 'Test 3: GET /api/sessions\n';
  const r3 = await makeRequest('http://127.0.0.1:5000/api/sessions', adminHeaders);
  log += `Status: ${r3.status}\nResponse: ${r3.data}\n\n`;

  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/api-result.txt', log, 'utf8');
}

runDiagnostics();
