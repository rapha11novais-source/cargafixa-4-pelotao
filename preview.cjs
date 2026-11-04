const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const base=path.join(__dirname,'docs');
http.createServer((req,res)=>{
  const nome=req.url.split('?')[0];
  const arquivo=path.resolve(base,'.'+(nome==='/'?'/index.html':nome));
  if(!arquivo.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(arquivo,(erro,data)=>{if(erro){res.writeHead(404);res.end('Não encontrado');return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(arquivo)]+'; charset=utf-8');res.end(data);});
}).listen(8787,'127.0.0.1',()=>console.log('Prévia: http://127.0.0.1:8787'));
