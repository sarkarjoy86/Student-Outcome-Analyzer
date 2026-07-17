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

  log += 'Test 1: GET /api/batches/6a43f3c3ed35b548e76854fe/sections\n';
  const r1 = await makeRequest('http://127.0.0.1:5000/api/batches/6a43f3c3ed35b548e76854fe/sections', adminHeaders);
  log += `Status: ${r1.status}\nResponse: ${r1.data}\n\n`;

  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/api-test-valid.txt', log, 'utf8');
}

runDiagnostics();
