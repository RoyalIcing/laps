const http = require('http')
const { PORT = 3000 } = process.env
const psi = require('psi');

http.createServer(async (req, res) => {
  const searchParams = new URL(req.url, 'https://example.org').searchParams;
  const targetURL = searchParams.get('url') || 'https://icing.space/';
  
  const { data } = await psi(targetURL);
  const jsonEncoded = JSON.stringify(data);
  res.writeHead(200, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(jsonEncoded)
  });
  res.end(jsonEncoded);
}).listen(PORT)
