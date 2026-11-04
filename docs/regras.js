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
