(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('formulario');
  const panels = Array.from(document.querySelectorAll('[data-step]'));
  const nav = Array.from(document.querySelectorAll('[data-nav]'));
  let etapa = 0;
  let enviou = false;
  const endpoint = String(window.CARGA_CONFIG?.endpoint || '');
  const conectado = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  $('configAviso').hidden = conectado;
  $('enviar').disabled = !conectado;
  if (conectado) form.action = endpoint;
  $('ano').textContent = new Date().getFullYear();
  $('termo').textContent = RegrasCarga.TERMO;
  function novoProtocolo() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, n => n.toString(16).padStart(2, '0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  $('protocolo').value = novoProtocolo();
  function mensagem(texto) { $('mensagem').textContent = texto; }
  function alternar(nome, painel) {
    const sim = form.elements[nome].value === 'Sim';
    $(painel).hidden = !sim; $(painel).disabled = !sim;
  }
  function atualizarAcaf() {
    const valor = $('acaf').value;
    $('cienciaBox').hidden = true; $('cienciaBox').disabled = true; $('ciencia').required = false;
    $('situacaoBox').className = 'notice';
    if (!valor) { $('situacaoTitulo').textContent = 'Confira sua autorização'; $('situacaoTexto').textContent = 'Informe a validade para verificar a necessidade de renovação.'; return; }
    try {
      const regra = RegrasCarga.situacaoAcaf(valor, RegrasCarga.hojeSaoPaulo());
      $('situacaoTitulo').textContent = regra.situacao;
      $('situacaoTexto').textContent = regra.exigeCiencia ? 'Providencie a renovação e confirme sua ciência abaixo para concluir.' : 'Neste momento, não é necessária a ciência de renovação.';
      $('cienciaBox').hidden = !regra.exigeCiencia; $('cienciaBox').disabled = !regra.exigeCiencia; $('ciencia').required = regra.exigeCiencia;
      if (regra.exigeCiencia) $('situacaoBox').classList.add('warn'); else $('ciencia').checked = false;
    } catch (e) { $('situacaoTitulo').textContent = 'Data inválida'; $('situacaoTexto').textContent = e.message; }
  }
  function validarEtapa(indice) {
    const controles = panels[indice].querySelectorAll('input,select');
    for (const campo of controles) {
      if (!campo.matches(':disabled') && !campo.checkValidity()) { mostrar(indice, false); campo.reportValidity(); return false; }
    }
    return true;
  }
  function resumo() {
    const dados = new FormData(form);
    const linhas = [['Policial', dados.get('nome') || '—'], ['Matrícula', dados.get('matricula') || '—'], ['Pistola', dados.get('pistola') === 'Sim' ? dados.get('modelo') || 'Sim' : 'Não possui'], ['Placa de colete', dados.get('colete') === 'Sim' ? dados.get('serieColete') || 'Sim' : 'Não possui']];
    $('resumo').replaceChildren(...linhas.map(([nome, valor]) => {
      const linha = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd');
      dt.textContent = nome; dd.textContent = valor; linha.append(dt, dd); return linha;
    }));
  }
  function mostrar(indice, foco = true) {
    etapa = indice;
    panels.forEach((painel, i) => { painel.hidden = i !== indice; });
    nav.forEach((item, i) => { item.classList.toggle('current', i === indice); item.classList.toggle('done', i < indice); if (i === indice) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
    $('contador').textContent = 'ETAPA 0' + (indice + 1) + ' DE 04'; $('barra').style.width = (indice + 1) * 25 + '%';
    $('voltar').hidden = indice === 0; $('continuar').hidden = indice === 3; $('enviar').hidden = indice !== 3;
    if (indice === 3) { atualizarAcaf(); resumo(); }
    if (foco) $('titulo' + indice).focus({ preventScroll: true });
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'pistola') alternar('pistola', 'dadosPistola');
    if (event.target.name === 'colete') alternar('colete', 'dadosColete');
    if (enviou) { $('protocolo').value = novoProtocolo(); enviou = false; }
    mensagem('');
  });
  $('acaf').addEventListener('input', () => { $('ciencia').checked = false; atualizarAcaf(); });
  $('continuar').addEventListener('click', () => { if (validarEtapa(etapa)) { mensagem(''); mostrar(etapa + 1); } });
  $('voltar').addEventListener('click', () => { mensagem(''); mostrar(etapa - 1); });
  // Valida todas as etapas e abre a confirmação real do servidor, sem CORS ou respostas opacas.
  form.noValidate = true;
  form.addEventListener('submit', event => {
    if (etapa !== 3) { event.preventDefault(); if (validarEtapa(etapa)) mostrar(etapa + 1); return; }
    if (!conectado) { event.preventDefault(); mensagem('O recebimento de respostas ainda não foi ativado pelo responsável.'); return; }
    atualizarAcaf();
    for (let i = 0; i < 4; i++) if (!validarEtapa(i)) { event.preventDefault(); return; }
    try {
      const dados = Object.fromEntries(new FormData(form)); dados.ciencia = $('ciencia').checked && !$('cienciaBox').disabled;
      RegrasCarga.validar(dados, RegrasCarga.hojeSaoPaulo());
    } catch (e) { event.preventDefault(); mensagem(e.message); return; }
    enviou = true;
    mensagem('Confira o resultado na nova aba. Sua conferência só estará concluída quando aparecer a confirmação com o protocolo. Se não abrir, permita a abertura da aba e tente novamente.');
  });
  mostrar(0, false);
})();
