const http = require('http')
const { PORT = 3000 } = process.env
const psi = require('psi');

http.createServer(async (req, res) => {
  const { data } = await psi('https://icing.space/');
  res.setHeader('content-type', 'application/json');
  const jsonEncoded = JSON.stringify(data);
  res.end(jsonEncoded);
}).listen(PORT)
