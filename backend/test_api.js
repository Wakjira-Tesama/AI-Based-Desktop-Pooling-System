const http = require('http');
const data = JSON.stringify({
  student_id: 'ugr/66666/15',
  name: 'Test Student Two',
  email: 'wakjiratesama@gmail.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/students/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log("Status: " + res.statusCode);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
