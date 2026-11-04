const fs = require('node:fs');
const path = require('node:path');
const raiz = __dirname;
const regras = fs.readFileSync(path.join(raiz,'public/regras.js'),'utf8');
const servidor = fs.readFileSync(path.join(raiz,'google-apps-script/Servidor.gs'),'utf8');
fs.writeFileSync(path.join(raiz,'google-apps-script/Code.gs'), regras + '\n' + servidor);
fs.mkdirSync(path.join(raiz,'docs'),{recursive:true});
for(const nome of fs.readdirSync(path.join(raiz,'public'))) fs.copyFileSync(path.join(raiz,'public',nome),path.join(raiz,'docs',nome));
console.log('Site em docs/ e conector em google-apps-script/Code.gs preparados.');
