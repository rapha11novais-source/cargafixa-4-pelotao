(function (root) {
  'use strict';
  const TERMO = 'Declaro estar ciente de que devo providenciar a renovação da minha ACAF (Autorização para Carga de Arma de Fogo) e das sanções administrativas a que estou sujeito em caso de não renovação, conforme as normas aplicáveis à minha corporação.';
  function dataCivil(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Informe uma data válida.');
    const [ano, mes, dia] = iso.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    if (ano < 1900 || ano > 9998 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) throw new Error('Informe uma data válida.');
    return { ano, mes, dia };
  }
  function somarMeses(iso, meses) {
    const p = dataCivil(iso);
    const data = new Date(Date.UTC(p.ano, p.mes - 1 + meses, 1));
    const ultimo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
    data.setUTCDate(Math.min(p.dia, ultimo));
    return data.toISOString().slice(0, 10);
  }
  function hojeSaoPaulo(agora) {
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora || new Date());
    const campos = Object.fromEntries(partes.map(p => [p.type, p.value]));
    return campos.year + '-' + campos.month + '-' + campos.day;
  }
  function situacaoAcaf(validade, hoje) {
    dataCivil(validade); dataCivil(hoje);
    const limite = somarMeses(hoje, 2);
    return { hoje, limite, exigeCiencia: validade <= limite, situacao: validade < hoje ? 'Vencida' : validade <= limite ? 'Vence em até 2 meses' : 'Válida por mais de 2 meses' };
  }
  function validar(entrada, hoje) {
    if (!entrada || typeof entrada !== 'object') throw new Error('Preenchimento inválido.');
    function texto(chave, nome, max) {
      const valor = entrada[chave];
      if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max || /[\u0000-\u001f\u007f]/.test(valor)) throw new Error('Confira o campo: ' + nome + '.');
      return valor.trim();
    }
    function escolha(chave, nome, valores) {
      if (!valores.includes(entrada[chave])) throw new Error('Confira o campo: ' + nome + '.');
      return entrada[chave];
    }
    const dados = {
      protocolo: texto('protocolo', 'Protocolo', 36),
      nome: texto('nome', 'Nome completo', 150),
      matricula: texto('matricula', 'Matrícula', 50),
      pistola: escolha('pistola', 'Carga fixa de pistola', ['Sim', 'Não']),
      colete: escolha('colete', 'Carga fixa de placa de colete', ['Sim', 'Não']),
      acaf: texto('acaf', 'Validade da ACAF', 10)
    };
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(dados.protocolo)) throw new Error('Reabra o formulário para gerar um novo protocolo.');
    if (dados.pistola === 'Sim') {
      dados.modelo = escolha('modelo', 'Modelo da pistola', ['PT100', 'PT840', 'GLOCK']);
      dados.seriePistola = texto('seriePistola', 'Número de série da pistola', 100);
      const quantidade = texto('municoes', 'Quantidade de munições', 7);
      if (!/^\d+$/.test(quantidade) || Number(quantidade) > 1000000) throw new Error('A quantidade de munições deve ser um número inteiro entre 0 e 1000000.');
      dados.municoes = Number(quantidade);
      dados.substituicao = escolha('substituicao', 'Substituição das munições', ['Sim', 'Não']);
    }
    if (dados.colete === 'Sim') {
      dados.serieColete = texto('serieColete', 'Número de série da placa de colete', 150);
      dados.validadeColete = texto('validadeColete', 'Validade da placa de colete', 10);
      dataCivil(dados.validadeColete);
    }
    const regra = situacaoAcaf(dados.acaf, hoje);
    if (regra.exigeCiencia && entrada.ciencia !== true) throw new Error('Confirme a ciência de renovação da ACAF e das sanções administrativas.');
    dados.ciencia = regra.exigeCiencia;
    dados.situacao = regra.situacao;
    dados.referencia = hoje;
    return dados;
  }
  root.RegrasCarga = { TERMO, dataCivil, somarMeses, hojeSaoPaulo, situacaoAcaf, validar };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/** Conector exclusivo desta plataforma. Não disponibiliza leitura dos registros. */
const CARGA = Object.freeze({
  aba: 'Conferências', fuso: 'America/Sao_Paulo',
  versaoTermo: '2026-11-04-v1',
  site: 'https://rapha11novais-source.github.io/carga-fixa-acaf/'
});
const CABECALHO = ['Protocolo', 'Registrado em', 'Nome completo', 'Matrícula', 'Carga fixa de pistola', 'Modelo', 'Série da pistola', 'Quantidade de munições', 'Necessita substituição', 'Carga fixa de placa de colete', 'Série da placa', 'Validade da placa', 'Validade da ACAF', 'Situação da ACAF no envio', 'Ciência de renovação e sanções', 'Texto da ciência', 'Versão do termo', 'Data de referência', 'Resumo de integridade'];

function instalar() {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    let id = props.getProperty('PLANILHA_ID');
    let planilha;
    if (id) planilha = SpreadsheetApp.openById(id);
    else {
      planilha = SpreadsheetApp.create('Carga Fixa — Conferências e ACAF');
      id = planilha.getId(); props.setProperty('PLANILHA_ID', id);
    }
    planilha.setSpreadsheetTimeZone(CARGA.fuso);
    let aba = planilha.getSheetByName(CARGA.aba);
    if (!aba) aba = planilha.insertSheet(CARGA.aba);
    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setBackground('#293c33').setFontColor('#ffffff').setFontWeight('bold');
      aba.setFrozenRows(1); aba.autoResizeColumns(1, CABECALHO.length);
    }
    conferirCabecalho_(aba);
    props.setProperty('INSTALADO', 'sim');
    console.log('Planilha criada/configurada: ' + planilha.getUrl());
  } finally { lock.releaseLock(); }
}

function doGet() {
  return pagina_('Conferência de carga fixa', 'Acesse o formulário para preencher sua conferência. Esta página recebe os envios e não permite consultar os registros.', false, '');
}

function doPost(e) {
  try {
    if (!e || !e.parameter || (e.postData && e.postData.length > 20000)) throw new Error('Solicitação inválida. Volte ao formulário e tente novamente.');
    if (e.parameter.website) throw new Error('Solicitação inválida.');
    const entrada = Object.assign({}, e.parameter, { ciencia: e.parameter.ciencia === 'true' });
    const resultado = registrar_(entrada);
    return pagina_(resultado.repetido ? 'Conferência já recebida' : 'Conferência recebida', 'O registro foi confirmado na planilha. Guarde o protocolo abaixo.', true, resultado.protocolo);
  } catch (erro) {
    // Erros de infraestrutura não revelam identificadores ou informações da planilha.
    const mensagem = erro.name === 'ValidacaoCarga' ? erro.message : 'Não foi possível confirmar o registro. Volte à aba do formulário e tente novamente. Se o problema persistir, comunique ao responsável.';
    return pagina_('Envio não confirmado', mensagem, false, '');
  }
}

function registrar_(entrada) {
  const hoje = Utilities.formatDate(new Date(), CARGA.fuso, 'yyyy-MM-dd');
  let dados;
  try { dados = RegrasCarga.validar(entrada, hoje); }
  catch (erro) { erro.name = 'ValidacaoCarga'; throw erro; }
  // A referência diária é metadado: não altera a identificação de uma tentativa repetida.
  const canonico = Object.assign({}, dados); delete canonico.referencia; delete canonico.situacao;
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(canonico), Utilities.Charset.UTF_8).map(b => (b & 255).toString(16).padStart(2, '0')).join('');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('INSTALADO') !== 'sim') throw new Error('Instalação pendente.');
    const planilha = SpreadsheetApp.openById(props.getProperty('PLANILHA_ID'));
    const aba = planilha.getSheetByName(CARGA.aba);
    conferirCabecalho_(aba);
    const ultima = aba.getLastRow();
    if (ultima > 1) {
      const anterior = aba.getRange(2, 1, ultima - 1, 1).createTextFinder(dados.protocolo).matchEntireCell(true).useRegularExpression(false).findNext();
      if (anterior) {
        if (aba.getRange(anterior.getRow(), CABECALHO.length).getValue() !== hash) {
          const erro = new Error('Este protocolo já foi usado com outros dados. Reabra o formulário para registrar uma nova conferência.'); erro.name = 'ValidacaoCarga'; throw erro;
        }
        return { protocolo: dados.protocolo, repetido: true };
      }
    }
    const seguro = valor => typeof valor === 'string' && /^[=+\-@\t\r]/.test(valor) ? "'" + valor : valor;
    const valores = [dados.protocolo, new Date(), dados.nome, dados.matricula, dados.pistola, dados.modelo || '', dados.seriePistola || '', dados.municoes ?? '', dados.substituicao || '', dados.colete, dados.serieColete || '', dados.validadeColete || '', dados.acaf, dados.situacao, dados.ciencia ? 'Estou ciente' : 'Não exigida no envio', dados.ciencia ? RegrasCarga.TERMO : '', CARGA.versaoTermo, hoje, hash].map(seguro);
    const destino = aba.getRange(ultima + 1, 1, 1, CABECALHO.length);
    destino.setNumberFormat('@');
    destino.setValues([valores]);
    aba.getRange(ultima + 1, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();
    return { protocolo: dados.protocolo, repetido: false };
  } finally { lock.releaseLock(); }
}

function conferirCabecalho_(aba) {
  if (!aba) throw new Error('Aba de registros indisponível.');
  const atual = aba.getRange(1, 1, 1, CABECALHO.length).getValues()[0];
  if (JSON.stringify(atual) !== JSON.stringify(CABECALHO)) throw new Error('Cabeçalho da planilha alterado.');
}

function pagina_(titulo, mensagem, sucesso, protocolo) {
  const escapar = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base target="_top"><style>body{margin:0;padding:60px 22px;background:#f7f7f2;color:#25352e;font:16px/1.7 system-ui,sans-serif}main{max-width:520px;margin:auto;background:white;padding:34px;border:1px solid #dedfd6;border-radius:16px;border-top:6px solid '+(sucesso?'#76945d':'#b08a48')+'}small{letter-spacing:2px;color:#6d7b5c}h1{font-size:28px;line-height:1.25}p{color:#6b7467}.protocolo{background:#eff4e7;padding:16px;font:14px/1.8 monospace;overflow-wrap:anywhere}a{color:#293c33}footer{font-size:12px;color:#7b8475}</style></head><body><main><small>CARGA FIXA · CONFERÊNCIA INDIVIDUAL</small><h1>'+escapar(titulo)+'</h1><p>'+escapar(mensagem)+'</p>'+(protocolo?'<div class="protocolo"><strong>Protocolo</strong><br>'+escapar(protocolo)+'</div>':'')+'<p>Você pode fechar esta aba e voltar à aba do formulário.</p><footer><a rel="noreferrer" href="'+escapar(CARGA.site)+'">Abrir uma nova conferência</a></footer></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(titulo).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
