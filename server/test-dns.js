import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';

dotenv.config({ path: 'd:/Codes With Joy/Capstone Project Main Folder/Capstone Project Updated x6/.env' });

async function testDNS() {
  let log = 'Starting DNS checks...\n';
  
  // 1. Test with default system DNS
  log += '\n--- Testing with default system DNS ---\n';
  try {
    const servers = dns.getServers();
    log += `Active DNS Servers: ${JSON.stringify(servers)}\n`;
  } catch (err) {
    log += `Failed to get active DNS servers: ${err.message}\n`;
  }
  
  try {
    const addresses = await dns.promises.resolve('obi.wo5zdy3.mongodb.net', 'TXT');
    log += `Default DNS (TXT resolve) SUCCESS: ${JSON.stringify(addresses)}\n`;
  } catch (err) {
    log += `Default DNS (TXT resolve) FAILED: ${err.message}\n`;
  }

  try {
    const srv = await dns.promises.resolveSrv('_mongodb._tcp.obi.wo5zdy3.mongodb.net');
    log += `Default DNS (SRV resolve) SUCCESS: ${JSON.stringify(srv)}\n`;
  } catch (err) {
    log += `Default DNS (SRV resolve) FAILED: ${err.message}\n`;
  }

  // 2. Test with Google DNS (which is forced in server/lib/db.js)
  log += '\n--- Testing with Google DNS (8.8.8.8, 8.8.4.4) ---\n';
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    log += `Active DNS Servers after override: ${JSON.stringify(dns.getServers())}\n`;
    
    const addresses = await dns.promises.resolve('obi.wo5zdy3.mongodb.net', 'TXT');
    log += `Google DNS (TXT resolve) SUCCESS: ${JSON.stringify(addresses)}\n`;
  } catch (err) {
    log += `Google DNS (TXT resolve) FAILED: ${err.message}\n`;
  }

  try {
    const srv = await dns.promises.resolveSrv('_mongodb._tcp.obi.wo5zdy3.mongodb.net');
    log += `Google DNS (SRV resolve) SUCCESS: ${JSON.stringify(srv)}\n`;
  } catch (err) {
    log += `Google DNS (SRV resolve) FAILED: ${err.message}\n`;
  }

  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/dns-result-utf8.txt', log, 'utf8');
}

testDNS();
