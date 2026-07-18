import fs from 'fs';

async function testUpload() {
  // Create a 1x1 png image buffer
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  const formData = new FormData();
  const fileBlob = new Blob([buffer], { type: 'image/png' });
  formData.append('UploadFiles', fileBlob, 'test.png');
  
  try {
    const res = await fetch('https://student-outcome-analyzer-api.onrender.com/api/upload/image', {
      method: 'POST',
      headers: {
        'x-admin-email': 'admin@gmail.com',
        'x-admin-password': 'Admin@123',
        'x-filename': 'test_upload_probe'
      },
      body: formData
    });
    
    const status = res.status;
    const body = await res.json();
    console.log('Status Code:', status);
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testUpload();
