const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const raiz = __dirname;
const regras = fs.readFileSync(path.join(raiz,'public/regras.js'),'utf8');
const servidor = fs.readFileSync(path.join(raiz,'google-apps-script/Servidor.gs'),'utf8');
fs.writeFileSync(path.join(raiz,'google-apps-script/Code.gs'), regras + '\n' + servidor);
fs.mkdirSync(path.join(raiz,'docs'),{recursive:true});
const versaoConfig = crypto.createHash('sha256').update(fs.readFileSync(path.join(raiz,'public/config.js'))).digest('hex').slice(0,12);
for(const nome of fs.readdirSync(path.join(raiz,'public'))) {
  if(nome==='index.html') fs.writeFileSync(path.join(raiz,'docs',nome),fs.readFileSync(path.join(raiz,'public',nome),'utf8').replace('src="config.js"','src="config.js?v='+versaoConfig+'"'));
  else fs.copyFileSync(path.join(raiz,'public',nome),path.join(raiz,'docs',nome));
}
console.log('Site em docs/ e conector em google-apps-script/Code.gs preparados.');
