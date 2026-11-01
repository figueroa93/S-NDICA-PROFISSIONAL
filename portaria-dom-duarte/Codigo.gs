/**
 * Portaria Dom Duarte — controle de entrada e saída de veículos.
 * Servidor do aplicativo web (Google Apps Script vinculado à planilha).
 */

// PIN exigido pelo aplicativo. Fica na propriedade do script "PIN" (Configurações do projeto →
// Propriedades do script), fora do código, porque o repositório é público.
// Valor "" (vazio) = sem PIN. Propriedade ausente = app bloqueado até ser configurada.
const PIN = PropertiesService.getScriptProperties().getProperty('PIN');

const PLANILHA_ID = '1o1gCe6_qwFHPogIimGcwJHhzkP_Zhy4FgBOCYitv7_g';
const ABA = 'Movimentos';
const FORMATO_DATA = 'dd/MM/yyyy HH:mm';
const DIAS_HISTORICO = 31;

const CABECALHO = [
  'ID', 'Placa', 'Tipo', 'Modelo / cor', 'Motorista', 'Destino',
  'Entrada', 'Porteiro entrada', 'Posto entrada',
  'Saída', 'Porteiro saída', 'Posto saída',
  'Permanência (min)', 'Situação', 'Obs. entrada', 'Obs. saída', 'Tempo de permanência'
];

// Índices das colunas (base 0) na ordem do cabeçalho.
const C = {
  ID: 0, PLACA: 1, TIPO: 2, MODELO: 3, MOTORISTA: 4, DESTINO: 5,
  ENTRADA: 6, PORTEIRO_ENTRADA: 7, POSTO_ENTRADA: 8,
  SAIDA: 9, PORTEIRO_SAIDA: 10, POSTO_SAIDA: 11,
  PERMANENCIA: 12, SITUACAO: 13, OBS_ENTRADA: 14, OBS_SAIDA: 15, TEMPO: 16
};

const FORMATO_TEMPO = '[h]:mm';

const NO_PATIO = 'No pátio';
const CONCLUIDO = 'Concluído';
const SEM_ENTRADA = 'Saída sem entrada';

const TIPOS = ['Visitante', 'Morador', 'Funcionário', 'Prestador de serviço', 'Entrega'];

// ---------------------------------------------------------------- Web

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Portaria Dom Duarte')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// ---------------------------------------------------------------- API (google.script.run)

function carregar(pin) {
  validarPin_(pin);
  return estado_(aba_());
}

function registrarEntrada(pin, dados) {
  validarPin_(pin);
  dados = dados || {};
  const placa = normalizarPlaca_(dados.placa);
  const porteiro = exigirPorteiro_(dados.porteiro);

  return comLock_(function (sh) {
    const linhas = lerLinhas_(sh);
    const aberta = entradaAberta_(linhas, placa);
    if (aberta && !dados.confirmarDuplicada) {
      return {
        ok: false,
        precisaConfirmar: 'duplicada',
        mensagem: placa + ' já está no pátio desde ' + formatar_(aberta.linha[C.ENTRADA]) +
          ' (entrada por ' + aberta.linha[C.PORTEIRO_ENTRADA] + '). Toque de novo para registrar outra entrada.',
        estado: estado_(sh, linhas)
      };
    }

    const agora = new Date();
    const destino = texto_(dados.destino, 60);
    const naUnidade = veiculosNaUnidade_(linhas, destino);
    const linha = novaLinha_(linhas);
    linha[C.PLACA] = placa;
    linha[C.TIPO] = tipo_(dados.tipo);
    linha[C.MODELO] = texto_(dados.modelo, 60);
    linha[C.MOTORISTA] = texto_(dados.motorista, 60);
    linha[C.DESTINO] = destino;
    linha[C.ENTRADA] = agora;
    linha[C.PORTEIRO_ENTRADA] = porteiro;
    linha[C.POSTO_ENTRADA] = texto_(dados.posto, 40);
    linha[C.SITUACAO] = NO_PATIO;
    linha[C.OBS_ENTRADA] = texto_(dados.obs, 200);
    acrescentar_(sh, linha);
    linhas.push(linha);

    let mensagem = 'Entrada registrada: ' + placa + ' às ' + hora_(agora) +
      (destino ? ' para ' + destino : '') + '.';
    if (naUnidade.length) {
      mensagem += ' Atenção: a unidade já tinha ' +
        (naUnidade.length === 1 ? 'outro veículo' : naUnidade.length + ' veículos') + ' no pátio (' +
        naUnidade.map(function (l) { return l[C.PLACA]; }).join(', ') + ').';
    }
    return { ok: true, aviso: naUnidade.length > 0, mensagem: mensagem, estado: estado_(sh, linhas) };
  });
}

/**
 * dados.id: dá saída a um registro específico (botão da lista "No pátio").
 * dados.placa: dá saída à entrada aberta mais recente da placa.
 * dados.semEntrada: confirma o registro de "Saída sem entrada".
 */
function registrarSaida(pin, dados) {
  validarPin_(pin);
  dados = dados || {};
  const porteiro = exigirPorteiro_(dados.porteiro);
  const id = dados.id ? String(dados.id) : '';
  const placa = id ? '' : normalizarPlaca_(dados.placa);

  return comLock_(function (sh) {
    const linhas = lerLinhas_(sh);
    const agora = new Date();
    let alvo;

    if (id) {
      alvo = buscarPorId_(linhas, id);
      if (!alvo) throw new Error('Registro não encontrado. Atualize a tela.');
      if (alvo.linha[C.SITUACAO] !== NO_PATIO) {
        throw new Error('Este veículo já teve saída registrada.');
      }
    } else {
      alvo = entradaAberta_(linhas, placa);
    }

    if (!alvo) {
      if (!dados.semEntrada) {
        return {
          ok: false,
          precisaConfirmar: 'semEntrada',
          mensagem: 'Não há entrada aberta para ' + placa +
            '. Toque de novo para registrar "Saída sem entrada".',
          estado: estado_(sh, linhas)
        };
      }
      const linha = novaLinha_(linhas);
      linha[C.PLACA] = placa;
      linha[C.TIPO] = tipo_(dados.tipo);
      linha[C.MODELO] = texto_(dados.modelo, 60);
      linha[C.MOTORISTA] = texto_(dados.motorista, 60);
      linha[C.DESTINO] = texto_(dados.destino, 60);
      linha[C.SAIDA] = agora;
      linha[C.PORTEIRO_SAIDA] = porteiro;
      linha[C.POSTO_SAIDA] = texto_(dados.posto, 40);
      linha[C.SITUACAO] = SEM_ENTRADA;
      linha[C.OBS_SAIDA] = texto_(dados.obs, 200);
      acrescentar_(sh, linha);
      linhas.push(linha);
      return {
        ok: true,
        mensagem: 'Saída sem entrada registrada: ' + placa + ' às ' + hora_(agora) + '.',
        estado: estado_(sh, linhas)
      };
    }

    const linha = alvo.linha;
    const entrada = linha[C.ENTRADA] instanceof Date ? linha[C.ENTRADA] : null;
    const minutos = entrada ? Math.max(0, Math.round((agora - entrada) / 60000)) : '';
    linha[C.SAIDA] = agora;
    linha[C.PORTEIRO_SAIDA] = porteiro;
    linha[C.POSTO_SAIDA] = texto_(dados.posto, 40);
    linha[C.PERMANENCIA] = minutos;
    linha[C.SITUACAO] = CONCLUIDO;
    linha[C.OBS_SAIDA] = texto_(dados.obs, 200);

    const r = alvo.indice + 2;
    sh.getRange(r, C.SAIDA + 1, 1, 5).setValues([[
      linha[C.SAIDA], linha[C.PORTEIRO_SAIDA], linha[C.POSTO_SAIDA], linha[C.PERMANENCIA], linha[C.SITUACAO]
    ]]);
    sh.getRange(r, C.SAIDA + 1).setNumberFormat(FORMATO_DATA);
    sh.getRange(r, C.OBS_SAIDA + 1).setValue(linha[C.OBS_SAIDA]);

    let mensagem = 'Saída registrada: ' + linha[C.PLACA] + ' às ' + hora_(agora);
    if (minutos !== '') mensagem += ' (permanência ' + duracao_(minutos) + ')';
    mensagem += '.';
    const quemEntrou = String(linha[C.PORTEIRO_ENTRADA] || '');
    if (quemEntrou && quemEntrou.toLowerCase() !== porteiro.toLowerCase()) {
      mensagem += ' Entrada feita por ' + quemEntrou + '.';
    }
    return { ok: true, mensagem: mensagem, estado: estado_(sh, linhas) };
  });
}

// ---------------------------------------------------------------- Planilha

/** Cria ou corrige a aba "Movimentos" e o cabeçalho. Rode uma vez pelo editor. */
function preparar() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName(ABA);
  if (!sh) sh = ss.insertSheet(ABA);

  if (sh.getMaxColumns() < CABECALHO.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), CABECALHO.length - sh.getMaxColumns());
  }
  sh.getRange(1, 1, 1, CABECALHO.length)
    .setValues([CABECALHO])
    .setBackground('#0a3550')
    .setFontColor('#e2c25e')
    .setFontWeight('bold');
  sh.setFrozenRows(1);

  const linhas = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, C.ENTRADA + 1, linhas, 1).setNumberFormat(FORMATO_DATA);
  sh.getRange(2, C.SAIDA + 1, linhas, 1).setNumberFormat(FORMATO_DATA);
  sh.getRange(2, C.PLACA + 1, linhas, 1).setNumberFormat('@');
  sh.getRange(2, C.TEMPO + 1, linhas, 1).setNumberFormat(FORMATO_TEMPO);

  // Coluna "Tempo de permanência": fórmula em cada linha já registrada.
  const ultima = sh.getLastRow();
  if (ultima >= 2) {
    const formulas = [];
    for (let r = 2; r <= ultima; r++) formulas.push([formulaTempo_(r)]);
    sh.getRange(2, C.TEMPO + 1, formulas.length, 1).setFormulas(formulas);
  }
  // Atualiza o tempo dos carros no pátio a cada minuto (NOW()).
  ss.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.ON_CHANGE_AND_MINUTE);
  return 'Aba "' + ABA + '" pronta.';
}

function aba_() {
  const sh = SpreadsheetApp.openById(PLANILHA_ID).getSheetByName(ABA);
  if (sh && sh.getRange(1, CABECALHO.length).getValue() === CABECALHO[CABECALHO.length - 1]) return sh;
  preparar();
  return SpreadsheetApp.openById(PLANILHA_ID).getSheetByName(ABA);
}

function comLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('A planilha está ocupada. O registro NÃO foi salvo. Tente de novo.');
  }
  try {
    const resultado = fn(aba_());
    SpreadsheetApp.flush();
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

function lerLinhas_(sh) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, CABECALHO.length).getValues();
}

function acrescentar_(sh, linha) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, C.PLACA + 1).setNumberFormat('@');
  linha[C.TEMPO] = formulaTempo_(r);
  sh.getRange(r, 1, 1, CABECALHO.length).setValues([linha]);
  sh.getRange(r, C.ENTRADA + 1).setNumberFormat(FORMATO_DATA);
  sh.getRange(r, C.SAIDA + 1).setNumberFormat(FORMATO_DATA);
  sh.getRange(r, C.TEMPO + 1).setNumberFormat(FORMATO_TEMPO);
}

/** Saída − entrada; enquanto o carro está no pátio, agora − entrada. */
function formulaTempo_(r) {
  return '=IF(G' + r + '="","",IF(J' + r + '="",NOW(),J' + r + ')-G' + r + ')';
}

/** Unidade sem espaços, pontos e hífens, para comparar "B-302" com "b 302". */
function chaveUnidade_(destino) {
  return String(destino || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function veiculosNaUnidade_(linhas, destino) {
  const k = chaveUnidade_(destino);
  if (!k) return [];
  return linhas.filter(function (l) { return l[C.SITUACAO] === NO_PATIO && chaveUnidade_(l[C.DESTINO]) === k; });
}

function novaLinha_(linhas) {
  let max = 0;
  linhas.forEach(function (l) {
    const n = Number(l[C.ID]);
    if (n > max) max = n;
  });
  const linha = new Array(CABECALHO.length).fill('');
  linha[C.ID] = max + 1;
  return linha;
}

function entradaAberta_(linhas, placa) {
  let achado = null;
  linhas.forEach(function (l, i) {
    if (l[C.SITUACAO] !== NO_PATIO || String(l[C.PLACA]).toUpperCase() !== placa) return;
    if (!achado || tempo_(l[C.ENTRADA]) >= tempo_(achado.linha[C.ENTRADA])) {
      achado = { linha: l, indice: i };
    }
  });
  return achado;
}

function buscarPorId_(linhas, id) {
  for (let i = 0; i < linhas.length; i++) {
    if (String(linhas[i][C.ID]) === id) return { linha: linhas[i], indice: i };
  }
  return null;
}

/** Estado enviado ao navegador: datas sempre em milissegundos. */
function estado_(sh, linhas) {
  linhas = linhas || lerLinhas_(sh);
  const limite = Date.now() - DIAS_HISTORICO * 86400000;
  const patio = [];
  const historico = [];
  const veiculos = {};
  const porteiros = {};
  const unidades = {};

  linhas.forEach(function (l) {
    if (!l[C.PLACA]) return;
    const m = {
      id: String(l[C.ID]),
      placa: String(l[C.PLACA]),
      tipo: String(l[C.TIPO]),
      modelo: String(l[C.MODELO]),
      motorista: String(l[C.MOTORISTA]),
      destino: String(l[C.DESTINO]),
      entrada: tempo_(l[C.ENTRADA]),
      porteiroEntrada: String(l[C.PORTEIRO_ENTRADA]),
      postoEntrada: String(l[C.POSTO_ENTRADA]),
      saida: tempo_(l[C.SAIDA]),
      porteiroSaida: String(l[C.PORTEIRO_SAIDA]),
      postoSaida: String(l[C.POSTO_SAIDA]),
      permanencia: l[C.PERMANENCIA] === '' ? null : Number(l[C.PERMANENCIA]),
      situacao: String(l[C.SITUACAO]),
      obsEntrada: String(l[C.OBS_ENTRADA]),
      obsSaida: String(l[C.OBS_SAIDA])
    };
    const quando = Math.max(m.entrada || 0, m.saida || 0);

    if (m.situacao === NO_PATIO) patio.push(m);
    if (m.situacao === NO_PATIO || quando >= limite) historico.push(m);

    const v = veiculos[m.placa];
    if (!v || quando >= v.quando) {
      veiculos[m.placa] = { quando: quando, tipo: m.tipo, modelo: m.modelo, motorista: m.motorista, destino: m.destino };
    }
    if (m.destino && quando >= limite) {
      const ku = chaveUnidade_(m.destino);
      if (ku && !unidades[ku]) unidades[ku] = m.destino;
    }
    if (quando >= limite) {
      [m.porteiroEntrada, m.porteiroSaida].forEach(function (p) {
        const k = p.toLowerCase();
        if (p && !porteiros[k]) porteiros[k] = p;
      });
    }
  });

  patio.sort(function (a, b) { return a.entrada - b.entrada; });
  historico.sort(function (a, b) {
    return Math.max(b.entrada || 0, b.saida || 0) - Math.max(a.entrada || 0, a.saida || 0);
  });

  return {
    agora: Date.now(),
    patio: patio,
    historico: historico,
    veiculos: veiculos,
    porteiros: Object.keys(porteiros).map(function (k) { return porteiros[k]; }).sort(),
    unidades: Object.keys(unidades).map(function (k) { return unidades[k]; }).sort(),
    planilhaUrl: 'https://docs.google.com/spreadsheets/d/' + PLANILHA_ID + '/edit'
  };
}

// ---------------------------------------------------------------- Validação e formato

function validarPin_(pin) {
  if (PIN === null) {
    throw new Error('PIN não configurado. Crie a propriedade do script "PIN" no editor do Apps Script.');
  }
  if (PIN && String(pin == null ? '' : pin).trim() !== String(PIN)) {
    throw new Error('PIN incorreto.');
  }
}

function normalizarPlaca_(placa) {
  const p = String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)) {
    throw new Error('Placa inválida. Use ABC1234 ou ABC1D23.');
  }
  return p;
}

function exigirPorteiro_(nome) {
  const p = texto_(nome, 40);
  if (!p) throw new Error('Informe o porteiro de plantão.');
  return p;
}

function tipo_(t) {
  return TIPOS.indexOf(t) >= 0 ? t : 'Visitante';
}

/** Texto limpo, com tamanho máximo e protegido contra fórmulas. */
function texto_(v, max) {
  let s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function tempo_(d) {
  return d instanceof Date && !isNaN(d) ? d.getTime() : null;
}

function formatar_(d) {
  return d instanceof Date ? Utilities.formatDate(d, 'America/Sao_Paulo', FORMATO_DATA) : '';
}

function hora_(d) {
  return Utilities.formatDate(d, 'America/Sao_Paulo', 'HH:mm');
}

function duracao_(min) {
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m + ' min' : '');
}
