const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const raiz = path.resolve(__dirname,'..');
const properties = {};
const linhas = [];
let criacoes = 0;
let agora = '2026-11-04';
let flushes = 0;
function range(linha, coluna, qtd = 1, colunas = 1) {
  return {
    setValues(valores) { valores.forEach((v,i)=>{ linhas[linha-1+i] ||= []; v.forEach((item,j)=>{linhas[linha-1+i][coluna-1+j]=item;}); }); return this; },
    getValues() {return Array.from({length:qtd},(_,i)=>Array.from({length:colunas},(_,j)=>linhas[linha-1+i]?.[coluna-1+j]??''));},
    getValue() {return linhas[linha-1]?.[coluna-1];},
    setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;},setNumberFormat(){return this;},
    createTextFinder(valor) {return {matchEntireCell(){return this;},useRegularExpression(){return this;},findNext(){const idx=linhas.findIndex((r,i)=>i>=linha-1&&i<linha-1+qtd&&r[coluna-1]===valor);return idx<0?null:{getRow:()=>idx+1};}};}
  };
}
const aba={getLastRow:()=>linhas.length,getRange:range,setFrozenRows(){},autoResizeColumns(){}};
const planilha={getId:()=> 'ID-SOMENTE-TESTE',getUrl:()=> 'https://example.test/planilha',setSpreadsheetTimeZone(){},getSheetByName:()=>aba,insertSheet:()=>aba};
const props={getProperty:k=>properties[k]??null,setProperty:(k,v)=>properties[k]=v};
const contexto=vm.createContext({console:{log(){}},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},PropertiesService:{getScriptProperties:()=>props},SpreadsheetApp:{create(){criacoes++;return planilha;},openById:()=>planilha,flush(){flushes++;}},Utilities:{formatDate:()=>agora,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_alg,s)=>Array.from(crypto.createHash('sha256').update(s).digest())},HtmlService:{createHtmlOutput:html=>({html,setTitle(){return this;},addMetaTag(){return this;}})}});
vm.runInContext(fs.readFileSync(path.join(raiz,'google-apps-script/Code.gs'),'utf8'),contexto);
const R=contexto.RegrasCarga;
let total=0;
function teste(nome,fn){fn();total++;console.log('OK — '+nome);}
const base=()=>({nome:'POLICIAL FICTÍCIO DE TESTE',matricula:'00001',pistola:'Não',colete:'Não',acaf:'2027-01-05',protocolo:crypto.randomUUID()});
teste('Dois meses inclusivos, vencida, hoje e dia posterior ao limite',()=>{
  for(const [data,science,status] of [['2026-11-03',true,'Vencida'],['2026-11-04',true,'Vence em até 2 meses'],['2027-01-04',true,'Vence em até 2 meses'],['2027-01-05',false,'Válida por mais de 2 meses']]){const r=R.situacaoAcaf(data,'2026-11-04');assert.equal(r.exigeCiencia,science);assert.equal(r.situacao,status);}
});
teste('Fim do mês, ano bissexto, fuso de São Paulo e datas inexistentes',()=>{
  assert.equal(R.somarMeses('2026-12-31',2),'2027-02-28');assert.equal(R.somarMeses('2023-12-31',2),'2024-02-29');assert.equal(R.somarMeses('2026-07-31',2),'2026-09-30');
  assert.equal(R.hojeSaoPaulo(new Date('2026-11-05T01:00:00Z')),'2026-11-04');
  for(const data of ['2026-02-29','2026-13-01','2026-04-31','04/11/2026']) assert.throws(()=>R.dataCivil(data));
});
teste('Instalação idempotente sem apagar registros',()=>{contexto.instalar();contexto.instalar();assert.equal(criacoes,1);assert.equal(linhas.length,1);assert.equal(linhas[0].length,19);});
teste('Quatro combinações de pistola/colete, ignorando dados de seções puladas',()=>{
  for(const pistola of ['Sim','Não'])for(const colete of ['Sim','Não']){
    const d={...base(),pistola,colete,modelo:'PT840',seriePistola:'TESTE-ARMA',municoes:'0',substituicao:'Sim',serieColete:'TESTE-PLACA',validadeColete:'2028-02-29'};
    contexto.registrar_(d);const row=linhas.at(-1);assert.equal(row[5],pistola==='Sim'?'PT840':'');assert.equal(row[7],pistola==='Sim'?0:'');assert.equal(row[10],colete==='Sim'?'TESTE-PLACA':'');assert.equal(row[3],'00001');
  }
});
teste('Sem ciência, servidor rejeita status adulterado e nenhuma linha é gravada',()=>{
  const d={...base(),acaf:'2026-11-03',situacao:'Válida por mais de 2 meses',ciencia:false}; const before=linhas.length;
  assert.throws(()=>contexto.registrar_(d),/Confirme a ciência/);assert.throws(()=>contexto.registrar_({...d,ciencia:'true'}),/Confirme a ciência/);assert.equal(linhas.length,before);
  contexto.registrar_({...d,ciencia:true});assert.equal(linhas.at(-1)[13],'Vencida');assert.equal(linhas.at(-1)[14],'Estou ciente');assert.equal(linhas.at(-1)[15],R.TERMO);
});
teste('Mesma tentativa não duplica e protocolo reutilizado com outros dados é rejeitado',()=>{
  const d=base();contexto.registrar_(d);const before=linhas.length;const r=contexto.registrar_(d);assert.equal(r.repetido,true);assert.equal(linhas.length,before);assert.throws(()=>contexto.registrar_({...d,nome:'OUTRO TESTE'}),/outros dados/);assert.equal(linhas.length,before);
});
teste('Resposta HTML confirma gravação e não expõe identificação nem planilha',()=>{
  const d=base();const res=contexto.doPost({parameter:d,postData:{length:100}});assert.ok(res.html.includes('Conferência recebida'));assert.ok(res.html.includes(d.protocolo));assert.ok(!res.html.includes(d.nome));assert.ok(!res.html.includes('ID-SOMENTE-TESTE'));assert.ok(flushes>0);
  const before=linhas.length;const erro=contexto.doPost({parameter:{...base(),acaf:'2026-11-03'},postData:{length:100}});assert.ok(erro.html.includes('Envio não confirmado'));assert.equal(linhas.length,before);
});
teste('Neutralização de fórmulas e bloqueio de alteração do cabeçalho',()=>{
  contexto.registrar_({...base(),nome:'=IMPORTXML("https://example.test")'});assert.equal(linhas.at(-1)[2][0],"'");
  const original=linhas[0][0];linhas[0][0]='Coluna alterada';const before=linhas.length;assert.throws(()=>contexto.registrar_(base()),/Cabeçalho/);assert.equal(linhas.length,before);linhas[0][0]=original;
});
teste('Valores inválidos, datas impossíveis e excesso de tamanho são rejeitados',()=>{
  const p={...base(),pistola:'Sim',modelo:'GLOCK',seriePistola:'TESTE',substituicao:'Não'};
  for(const qtd of ['-1','1.5','1000001','abc'])assert.throws(()=>contexto.registrar_({...p,municoes:qtd}));
  assert.throws(()=>contexto.registrar_({...base(),colete:'Sim',serieColete:'TESTE',validadeColete:'2026-02-30'}));
  assert.throws(()=>contexto.registrar_({...base(),nome:'A'.repeat(151)}));
  const before=linhas.length;contexto.doPost({parameter:base(),postData:{length:20001}});assert.equal(linhas.length,before);
});
for(const file of ['app.js','regras.js','config.js'])new vm.Script(fs.readFileSync(path.join(raiz,'docs',file),'utf8'));
console.log(total+' grupos passaram. Serviços Google simulados; integração real depende de autorização e implantação.');
