// Testa Codigo.gs com uma planilha simulada (node teste/teste-servidor.js).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function criarAmbiente(pin) {
  const dados = []; // linhas (arrays), linha 1 = cabeçalho
  const formatos = {};
  const intervalo = (r, c, nr = 1, nc = 1) => ({
    setValues(v) { v.forEach((l, i) => l.forEach((x, j) => { (dados[r - 1 + i] = dados[r - 1 + i] || [])[c - 1 + j] = x; })); return this; },
    setValue(x) { return this.setValues([[x]]); },
    getValue() { return (dados[r - 1] || [])[c - 1] ?? ''; },
    getValues() {
      const out = [];
      for (let i = 0; i < nr; i++) { const l = []; for (let j = 0; j < nc; j++) l.push((dados[r - 1 + i] || [])[c - 1 + j] ?? ''); out.push(l); }
      return out;
    },
    setNumberFormat(f) { formatos[r + ':' + c] = f; return this; },
    setFormulas(v) { return this.setValues(v); },
    setBackground() { return this; }, setFontColor() { return this; }, setFontWeight() { return this; }
  });
  let existe = false;
  const sheet = {
    getRange: intervalo,
    getLastRow: () => dados.length,
    getMaxRows: () => 1000, getMaxColumns: () => 26,
    setFrozenRows() {}, insertColumnsAfter() {}
  };
  const ss = { setRecalculationInterval() {}, getSheetByName: n => (existe && n === 'Movimentos' ? sheet : null), insertSheet: () => { existe = true; return sheet; } };
  let travado = false;
  const ctx = {
    SpreadsheetApp: { openById: () => ss, flush() {}, RecalculationInterval: { ON_CHANGE_AND_MINUTE: 'x' } },
    LockService: { getScriptLock: () => ({ tryLock() { assert(!travado); travado = true; return true; }, releaseLock() { travado = false; } }) },
    Utilities: { formatDate: (d, tz, f) => d.toLocaleString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(f.includes('yyyy') ? { day: '2-digit', month: '2-digit', year: 'numeric' } : {}) }).replace(',', '') },
    HtmlService: {}, console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'PIN' ? pin : null) }) }
  };
  vm.createContext(ctx);
  let src = fs.readFileSync(path.join(__dirname, '..', 'Codigo.gs'), 'utf8');
  vm.runInContext(src + '\n;this.api={carregar,registrarEntrada,registrarSaida,preparar};', ctx);
  return { api: ctx.api, dados, formatos, ctx };
}

const ehData = x => Object.prototype.toString.call(x) === '[object Date]';
const igual = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
const semDatas = obj => JSON.stringify(obj, (k, v) => { assert(!ehData(v) && !(typeof v === 'string' && /T\d\d:\d\d.*Z$/.test(v)), 'Date no estado: ' + k); return v; });

// 1) PIN errado
{
  const { api } = criarAmbiente('4321');
  assert.throws(() => api.carregar('0000'), /PIN incorreto\./);
  assert.throws(() => api.carregar(''), /PIN incorreto\./);
  assert.throws(() => api.registrarEntrada('9', { placa: 'ABC1234', porteiro: 'João' }), /PIN incorreto\./);
  assert.throws(() => api.registrarSaida(undefined, { placa: 'ABC1234', porteiro: 'João' }), /PIN incorreto\./);
  const e = api.carregar('4321');
  igual(e.patio, []);
  console.log('ok  PIN errado recusado; PIN certo aceito');
}

const { api, dados, formatos, ctx } = criarAmbiente('4321');
api.carregar('4321');
assert.strictEqual(dados[0][0], 'ID');
assert.strictEqual(dados[0].length, 17);
assert.strictEqual(dados[0][16], 'Tempo de permanência');

// Validações
assert.throws(() => api.registrarEntrada('4321', { placa: 'AB1234', porteiro: 'João' }), /Placa inválida/);
assert.throws(() => api.registrarEntrada('4321', { placa: 'ABC1234', porteiro: '  ' }), /porteiro/);
console.log('ok  placa inválida e porteiro vazio recusados');

// 2) Entrada pelo João (placa com hífen e minúsculas)
let r = api.registrarEntrada('4321', { placa: 'rio-2a18', porteiro: 'João', posto: 'Portão principal', modelo: 'Onix prata', tipo: 'Visitante' });
assert(r.ok, r.mensagem);
assert.strictEqual(dados[1][1], 'RIO2A18');
assert.strictEqual(dados[1][13], 'No pátio');
assert(ehData(dados[1][6]));
assert.strictEqual(formatos['2:7'], 'dd/MM/yyyy HH:mm');
assert.strictEqual(r.estado.patio.length, 1);
assert.strictEqual(typeof r.estado.patio[0].entrada, 'number');
semDatas(r.estado);
console.log('ok  entrada João:', r.mensagem);

// Entrada duplicada exige confirmação
r = api.registrarEntrada('4321', { placa: 'RIO2A18', porteiro: 'João' });
assert(!r.ok && r.precisaConfirmar === 'duplicada');
assert.strictEqual(dados.length, 2);
console.log('ok  entrada duplicada pede confirmação:', r.mensagem);

// Simula 95 minutos no pátio
dados[1][6] = vm.runInContext('new Date(Date.now() - 95 * 60000)', ctx);

// 3) Saída pela Maria, por placa
r = api.registrarSaida('4321', { placa: 'RIO2A18', porteiro: 'Maria', posto: 'Garagem' });
assert(r.ok);
assert.strictEqual(dados[1][13], 'Concluído');
assert.strictEqual(dados[1][10], 'Maria');
assert.strictEqual(dados[1][11], 'Garagem');
assert.strictEqual(dados[1][12], 95);
assert(ehData(dados[1][9]));
assert(/Entrada feita por João\./.test(r.mensagem), r.mensagem);
assert.strictEqual(r.estado.patio.length, 0);
semDatas(r.estado);
console.log('ok  saída Maria:', r.mensagem);

// Mesmo porteiro não recebe o aviso
api.registrarEntrada('4321', { placa: 'QWE9876', porteiro: 'Maria' });
r = api.registrarSaida('4321', { placa: 'QWE9876', porteiro: 'maria' });
assert(r.ok && !/Entrada feita por/.test(r.mensagem));
console.log('ok  mesma pessoa sem aviso:', r.mensagem);

// Saída por ID (botão da lista)
r = api.registrarEntrada('4321', { placa: 'XYZ1A23', porteiro: 'João' });
const id = r.estado.patio[0].id;
r = api.registrarSaida('4321', { id, porteiro: 'Maria' });
assert(r.ok && /Entrada feita por João/.test(r.mensagem));
assert.throws(() => api.registrarSaida('4321', { id, porteiro: 'Maria' }), /já teve saída/);
console.log('ok  saída por ID:', r.mensagem);

// 4) Saída sem entrada
const antes = dados.length;
r = api.registrarSaida('4321', { placa: 'KKK0000', porteiro: 'Maria' });
assert(!r.ok && r.precisaConfirmar === 'semEntrada');
assert.strictEqual(dados.length, antes);
console.log('ok  saída sem entrada recusada sem confirmação:', r.mensagem);
r = api.registrarSaida('4321', { placa: 'KKK0000', porteiro: 'Maria', semEntrada: true });
assert(r.ok);
const ult = dados[dados.length - 1];
assert.strictEqual(ult[13], 'Saída sem entrada');
assert.strictEqual(ult[6], '');
assert(ehData(ult[9]));
console.log('ok  saída sem entrada gravada com confirmação:', r.mensagem);

// IDs únicos e sequenciais; estado com histórico
const ids = dados.slice(1).map(l => l[0]);
igual(ids, [1, 2, 3, 4]);
const e = api.carregar('4321');
assert.strictEqual(e.historico.length, 4);
igual(e.porteiros, ['João', 'Maria']);
assert.strictEqual(e.veiculos.RIO2A18.modelo, 'Onix prata');
semDatas(e);

// Coluna Q: fórmula do tempo de permanência em cada linha
assert.strictEqual(dados[1][16], '=IF(G2="","",IF(J2="",NOW(),J2)-G2)');
assert.strictEqual(formatos['2:17'], '[h]:mm');
console.log('ok  coluna Q com fórmula de permanência:', dados[1][16]);

// Unidade já ocupada é sinalizada (sem bloquear)
r = api.registrarEntrada('4321', { placa: 'UUU1A11', porteiro: 'João', destino: 'Bloco B 302' });
assert(r.ok && !r.aviso);
r = api.registrarEntrada('4321', { placa: 'VVV2B22', porteiro: 'João', destino: 'bloco b-302' });
assert(r.ok && r.aviso && /UUU1A11/.test(r.mensagem), r.mensagem);
igual(r.estado.unidades, ['Bloco B 302']);
console.log('ok  unidade ocupada sinalizada:', r.mensagem);
api.registrarSaida('4321', { placa: 'UUU1A11', porteiro: 'João' });
api.registrarSaida('4321', { placa: 'VVV2B22', porteiro: 'João' });

// Planilha antiga (16 colunas) é atualizada sozinha: cabeçalho e fórmulas
{
  const amb = criarAmbiente('4321');
  amb.api.preparar();
  amb.dados[0].length = 16;
  amb.dados.push([1, 'OLD1234', 'Visitante', '', '', '', vm.runInContext('new Date()', amb.ctx), 'João', '', '', '', '', '', 'No pátio', '', '']);
  amb.api.carregar('4321');
  assert.strictEqual(amb.dados[0][16], 'Tempo de permanência');
  assert.strictEqual(amb.dados[1][16], '=IF(G2="","",IF(J2="",NOW(),J2)-G2)');
  console.log('ok  planilha antiga recebe a coluna Q automaticamente');
}

// Proteção contra fórmula
api.registrarEntrada('4321', { placa: 'FFF1F11', porteiro: '=HYPERLINK("x")' });
assert.strictEqual(dados[dados.length - 1][7][0], "'");

// Sem PIN
const semPin = criarAmbiente('');
assert.doesNotThrow(() => semPin.api.carregar());
console.log('ok  PIN vazio aceita qualquer chamada');
const naoConfig = criarAmbiente(null);
assert.throws(() => naoConfig.api.carregar('4321'), /PIN não configurado/);
console.log('ok  PIN ausente bloqueia o app');
console.log('\nTodos os testes passaram.');
