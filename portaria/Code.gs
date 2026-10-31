/**
 * Portaria · Prestadores
 * App da web (Google Apps Script) para registrar a entrada e a saída de
 * prestadores de serviço do condomínio na planilha "ENTRADA DE PRESTADORES".
 */

// PIN de acesso. Vazio ('') = app aberto, sem PIN. Ex.: var PIN = '4821';
var PIN = '';

var PLANILHA_ID = '1_QWQO6oltKYhnVEzoSoIPfEPBogOSuQQJEfgRkp8-d8';
var ABA_ENTRADAS = 'Entradas';
var ABA_MINIATURAS = '_miniaturas';
var PASTA_FOTOS = 'Fotos - Entrada de Prestadores';
var FUSO = 'America/Sao_Paulo';
var FORMATO_DATA = 'dd/MM/yyyy HH:mm';
var LIMITE_REGISTROS = 500;

var CABECALHO = ['ID', 'Entrada', 'Nome', 'Tipo doc.', 'Documento', 'Empresa',
  'Unidade de destino', 'Serviço', 'Observações', 'Saída', 'Status', 'Foto'];
// Índices (base 0) das colunas da aba Entradas
var C = { ID: 0, ENTRADA: 1, NOME: 2, TIPO: 3, DOC: 4, EMPRESA: 5, UNIDADE: 6,
  SERVICO: 7, OBS: 8, SAIDA: 9, STATUS: 10, FOTO: 11 };

var STATUS_NO_LOCAL = 'No local';
var STATUS_SAIU = 'Saiu';
var TIPOS_DOC = ['CPF', 'RG', 'CNH', 'Outro'];

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function doGet() {
  var t = HtmlService.createTemplateFromFile('Index');
  t.planilhaUrl = 'https://docs.google.com/spreadsheets/d/' + PLANILHA_ID + '/edit';
  return t.evaluate()
    .setTitle('Portaria · Prestadores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ------------------------------------------------------------------ */
/* Funções chamadas pelo app                                           */
/* ------------------------------------------------------------------ */

/** Informa se o app exige PIN e se o PIN enviado é válido. */
function verificarPin(pin) {
  var exige = String(PIN || '') !== '';
  return { exigePin: exige, ok: !exige || String(pin || '') === String(PIN) };
}

/** Registra uma nova entrada. Retorna { id, entradaTxt }. */
function registrarEntrada(pin, dados) {
  exigirPin_(pin);
  dados = dados || {};

  var nome = limpar_(dados.nome, 120);
  var tipo = TIPOS_DOC.indexOf(dados.tipoDoc) >= 0 ? dados.tipoDoc : 'Outro';
  var documento = limpar_(dados.documento, 40);
  var empresa = limpar_(dados.empresa, 120);
  var unidade = limpar_(dados.unidade, 60);
  var servico = limpar_(dados.servico, 200);
  var obs = limpar_(dados.observacoes, 500);

  if (!nome) throw new Error('Informe o nome completo.');
  if (!documento) throw new Error('Informe o documento.');
  if (!empresa) throw new Error('Informe a empresa.');
  if (!unidade) throw new Error('Informe a unidade de destino.');
  if (tipo === 'CPF') {
    var digitos = documento.replace(/\D/g, '');
    if (digitos.length !== 11) throw new Error('O CPF precisa ter 11 dígitos.');
    documento = digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  var agora = new Date();
  var id = 'E' + Utilities.formatDate(agora, FUSO, 'yyMMddHHmmss') + '-' +
    ('00' + Math.floor(Math.random() * 1000)).slice(-3);

  // A foto vai para o Drive antes de pegar a trava (é a parte mais lenta).
  var fotoUrl = '';
  if (dados.foto) {
    var blob = dataUrlParaBlob_(dados.foto, id + ' - ' + nome.slice(0, 60) + '.jpg');
    fotoUrl = pastaFotos_().createFile(blob).getUrl();
  }
  var miniatura = '';
  if (dados.miniatura && /^data:image\/(jpeg|png|webp);base64,/.test(dados.miniatura) &&
      dados.miniatura.length < 45000) {
    miniatura = dados.miniatura;
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('A planilha está ocupada com outro registro. Tente de novo em alguns segundos.');
  }
  try {
    var ss = planilha_();
    var aba = abaEntradas_(ss);
    var linha = aba.getLastRow() + 1;
    var valores = [id, agora, protegerFormula_(nome), tipo, protegerFormula_(documento),
      protegerFormula_(empresa), protegerFormula_(unidade), protegerFormula_(servico),
      protegerFormula_(obs), '', STATUS_NO_LOCAL, fotoUrl];
    aba.getRange(linha, C.DOC + 1).setNumberFormat('@');
    aba.getRange(linha, 1, 1, valores.length).setValues([valores]);
    aba.getRange(linha, C.ENTRADA + 1).setNumberFormat(FORMATO_DATA);
    aba.getRange(linha, C.SAIDA + 1).setNumberFormat(FORMATO_DATA);
    if (miniatura) {
      abaMiniaturas_(ss).appendRow([id, miniatura]);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return { id: id, entradaTxt: Utilities.formatDate(agora, FUSO, FORMATO_DATA) };
}

/** Registra a saída do prestador com o ID informado. */
function registrarSaida(pin, id) {
  exigirPin_(pin);
  id = String(id || '').trim();
  if (!id) throw new Error('Registro não informado.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('A planilha está ocupada com outro registro. Tente de novo em alguns segundos.');
  }
  try {
    var aba = abaEntradas_(planilha_());
    var linha = linhaDoId_(aba, id);
    if (!linha) throw new Error('Registro ' + id + ' não encontrado na planilha.');
    var status = String(aba.getRange(linha, C.STATUS + 1).getValue());
    if (status === STATUS_SAIU) throw new Error('A saída deste prestador já foi registrada.');
    var agora = new Date();
    aba.getRange(linha, C.SAIDA + 1).setValue(agora).setNumberFormat(FORMATO_DATA);
    aba.getRange(linha, C.STATUS + 1).setValue(STATUS_SAIU);
    SpreadsheetApp.flush();
    return { id: id, saidaTxt: Utilities.formatDate(agora, FUSO, FORMATO_DATA) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lista os registros (mais recentes primeiro, até 500), contadores e sugestões.
 * filtro.data (opcional): 'yyyy-MM-dd' para trazer só as entradas daquele dia.
 * Datas saem como número (ms) e texto — nunca objetos Date.
 */
function listarEntradas(pin, filtro) {
  exigirPin_(pin);
  filtro = filtro || {};
  var ss = planilha_();
  var aba = abaEntradas_(ss);
  var ultima = aba.getLastRow();
  var resposta = { registros: [], noLocal: 0, entradasHoje: 0, total: 0,
    empresas: [], unidades: [], atualizadoTxt: Utilities.formatDate(new Date(), FUSO, 'HH:mm:ss') };
  if (ultima < 2) return resposta;

  var dados = aba.getRange(2, 1, ultima - 1, CABECALHO.length).getValues();
  var hoje = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
  var dataFiltro = /^\d{4}-\d{2}-\d{2}$/.test(filtro.data || '') ? filtro.data : '';
  var empresas = {}, unidades = {};
  var selecionadas = [];

  for (var i = dados.length - 1; i >= 0; i--) {
    var r = dados[i];
    if (!r[C.ID]) continue;
    resposta.total++;
    var entrada = paraData_(r[C.ENTRADA]);
    var diaEntrada = entrada ? Utilities.formatDate(entrada, FUSO, 'yyyy-MM-dd') : '';
    if (String(r[C.STATUS]) === STATUS_NO_LOCAL) resposta.noLocal++;
    if (diaEntrada === hoje) resposta.entradasHoje++;
    if (r[C.EMPRESA]) empresas[String(r[C.EMPRESA])] = true;
    if (r[C.UNIDADE]) unidades[String(r[C.UNIDADE])] = true;
    if (selecionadas.length < LIMITE_REGISTROS && (!dataFiltro || diaEntrada === dataFiltro)) {
      selecionadas.push(r);
    }
  }

  var minis = miniaturasRecentes_(ss);
  resposta.registros = selecionadas.map(function (r) {
    var entrada = paraData_(r[C.ENTRADA]);
    var saida = paraData_(r[C.SAIDA]);
    return {
      id: String(r[C.ID]),
      entradaMs: entrada ? entrada.getTime() : null,
      entradaTxt: entrada ? Utilities.formatDate(entrada, FUSO, FORMATO_DATA) : String(r[C.ENTRADA] || ''),
      nome: String(r[C.NOME] || ''),
      tipoDoc: String(r[C.TIPO] || ''),
      documento: String(r[C.DOC] || ''),
      empresa: String(r[C.EMPRESA] || ''),
      unidade: String(r[C.UNIDADE] || ''),
      servico: String(r[C.SERVICO] || ''),
      observacoes: String(r[C.OBS] || ''),
      saidaMs: saida ? saida.getTime() : null,
      saidaTxt: saida ? Utilities.formatDate(saida, FUSO, FORMATO_DATA) : String(r[C.SAIDA] || ''),
      status: String(r[C.STATUS] || ''),
      fotoUrl: String(r[C.FOTO] || ''),
      miniatura: minis[String(r[C.ID])] || ''
    };
  });
  resposta.empresas = Object.keys(empresas).sort(compararPt_);
  resposta.unidades = Object.keys(unidades).sort(compararPt_);
  return resposta;
}

/** Devolve a foto grande (data URL) do registro, lida do Drive pelo servidor. */
function obterFoto(pin, id) {
  exigirPin_(pin);
  var aba = abaEntradas_(planilha_());
  var linha = linhaDoId_(aba, String(id || '').trim());
  if (!linha) return '';
  var url = String(aba.getRange(linha, C.FOTO + 1).getValue() || '');
  var m = /\/d\/([\w-]+)/.exec(url) || /[?&]id=([\w-]+)/.exec(url);
  if (!m) return '';
  var blob = DriveApp.getFileById(m[1]).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

/**
 * Prepara a planilha (abas, cabeçalho, formatos). É chamada automaticamente,
 * mas pode ser executada pelo editor para checar tudo de uma vez — isso
 * também dispara a tela de autorização na primeira vez.
 */
function configurarPlanilha() {
  var ss = planilha_();
  abaEntradas_(ss);
  abaMiniaturas_(ss);
  pastaFotos_();
  return 'Planilha e pasta de fotos prontas.';
}

/* ------------------------------------------------------------------ */
/* Auxiliares                                                          */
/* ------------------------------------------------------------------ */

function exigirPin_(pin) {
  if (!verificarPin(pin).ok) throw new Error('PIN_INVALIDO: PIN incorreto ou não informado.');
}

function planilha_() {
  var ss = SpreadsheetApp.openById(PLANILHA_ID);
  if (ss.getSpreadsheetTimeZone() !== FUSO) ss.setSpreadsheetTimeZone(FUSO);
  return ss;
}

function abaEntradas_(ss) {
  var aba = ss.getSheetByName(ABA_ENTRADAS);
  if (!aba) aba = ss.insertSheet(ABA_ENTRADAS, 0);
  var atual = aba.getRange(1, 1, 1, CABECALHO.length).getValues()[0];
  if (atual.join('|') !== CABECALHO.join('|')) {
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]);
  }
  var cab = aba.getRange(1, 1, 1, CABECALHO.length);
  if (cab.getBackground().toLowerCase() !== '#0b3352' || aba.getFrozenRows() !== 1) {
    cab.setBackground('#0B3352').setFontColor('#D4AE5C').setFontWeight('bold');
    aba.setFrozenRows(1);
    var max = aba.getMaxRows();
    aba.getRange(2, C.DOC + 1, max - 1, 1).setNumberFormat('@');
    aba.getRange(2, C.ENTRADA + 1, max - 1, 1).setNumberFormat(FORMATO_DATA);
    aba.getRange(2, C.SAIDA + 1, max - 1, 1).setNumberFormat(FORMATO_DATA);
    aba.setColumnWidth(C.ID + 1, 150);
    aba.setColumnWidth(C.ENTRADA + 1, 130);
    aba.setColumnWidth(C.NOME + 1, 220);
    aba.setColumnWidth(C.DOC + 1, 130);
    aba.setColumnWidth(C.EMPRESA + 1, 170);
    aba.setColumnWidth(C.UNIDADE + 1, 140);
    aba.setColumnWidth(C.SERVICO + 1, 200);
    aba.setColumnWidth(C.OBS + 1, 220);
    aba.setColumnWidth(C.SAIDA + 1, 130);
  }
  return aba;
}

function abaMiniaturas_(ss) {
  var aba = ss.getSheetByName(ABA_MINIATURAS);
  if (!aba) {
    aba = ss.insertSheet(ABA_MINIATURAS);
    aba.getRange(1, 1, 1, 2).setValues([['ID', 'Miniatura']]).setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.hideSheet();
  }
  return aba;
}

/** Lê só as últimas miniaturas (as entradas são gravadas em ordem). */
function miniaturasRecentes_(ss) {
  var aba = ss.getSheetByName(ABA_MINIATURAS);
  var mapa = {};
  if (!aba) return mapa;
  var ultima = aba.getLastRow();
  if (ultima < 2) return mapa;
  var qtd = Math.min(ultima - 1, LIMITE_REGISTROS + 200);
  aba.getRange(ultima - qtd + 1, 1, qtd, 2).getValues().forEach(function (r) {
    if (r[0]) mapa[String(r[0])] = String(r[1] || '');
  });
  return mapa;
}

function pastaFotos_() {
  var it = DriveApp.getFoldersByName(PASTA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_FOTOS);
}

function linhaDoId_(aba, id) {
  var ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  var achado = aba.getRange(2, 1, ultima - 1, 1).createTextFinder(id)
    .matchEntireCell(true).findNext();
  return achado ? achado.getRow() : 0;
}

function dataUrlParaBlob_(dataUrl, nome) {
  var m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl));
  if (!m) throw new Error('Formato de foto inválido. Tire ou anexe a foto novamente.');
  if (m[2].length > 8 * 1024 * 1024) throw new Error('A foto ficou grande demais. Tente outra.');
  return Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nome);
}

/** Remove espaços extras e limita o tamanho do texto. */
function limpar_(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Impede que texto digitado vire fórmula na planilha (= + - @). */
function protegerFormula_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function paraData_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  return null;
}

function compararPt_(a, b) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}
