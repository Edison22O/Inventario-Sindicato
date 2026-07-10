const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/products/',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const images = json.map(p => p.image).filter(i => i);
      console.log('Sample images:', images.slice(0, 5));
    } catch(e) {
      console.log('Error parsing JSON:', data.substring(0, 200));
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
