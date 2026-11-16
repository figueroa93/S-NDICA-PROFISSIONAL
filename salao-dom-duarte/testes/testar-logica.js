// Testes locais do Codigo.gs, com os serviços do Google simulados.
// Uso: node salao-dom-duarte/testes/testar-logica.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

const eventos = [];
const emails = [];
let proxId = 1;
function novoEvento(titulo, ini, fim, opts) {
  const tags = {};
  const ev = {
    id: 'ev' + proxId++ + '@google.com', titulo, ini, fim, cor: null, desc: (opts || {}).description,
    getId: () => ev.id, getStartTime: () => ev.ini, getEndTime: () => ev.fim,
    setColor: (c) => (ev.cor = c), setTag: (k, v) => (tags[k] = v), getTag: (k) => (k in tags ? tags[k] : null),
    setTitle: (t) => (ev.titulo = t), deleteEvent: () => eventos.splice(eventos.indexOf(ev), 1),
  };
  eventos.push(ev);
  return ev;
}
const agenda = {
  getName: () => 'Agenda teste',
  getEvents: (a, b) => eventos.filter((e) => e.ini < b && e.fim > a),
  createEvent: novoEvento,
  getEventById: (id) => eventos.find((e) => e.id === id) || null,
};
const props = {};
const whats = [];
const whatsUrls = [];
let respostaBCB = { code: 200, body: '[{"data":"01/01/2026","valor":"1621.00"}]' };
let agoraFixo = new Date('2026-10-26T15:00:00-03:00');
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(agoraFixo.getTime()); else super(...a); }
  static now() { return agoraFixo.getTime(); }
}
const ctx = {
  Date: FakeDate, console, JSON, Math, Number, String, Object, Array, encodeURIComponent,
  CalendarApp: { EventColor: { YELLOW: '5', GREEN: '10' }, getDefaultCalendar: () => agenda, getCalendarById: () => agenda },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => (props[k] = v) }) },
  UrlFetchApp: { fetch: (url) => {
    if (url.includes('callmebot')) { whats.push(decodeURIComponent(url.split('&text=')[1].split('&apikey=')[0])); whatsUrls.push(url); return { getResponseCode: () => 200, getContentText: () => 'ok' }; }
    return { getResponseCode: () => respostaBCB.code, getContentText: () => respostaBCB.body };
  } },
  MailApp: { sendEmail: (o) => emails.push(o), getRemainingDailyQuota: () => 100 },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TESTE/exec' }) },
  Utilities: {
    formatDate: (d, tz, f) => {
      const s = new RealDate(d.getTime() - 3 * 3600e3).toISOString();
      if (f !== 'yyyy-MM-dd') throw new Error('formato não simulado');
      return s.slice(0, 10);
    },
    getUuid: () => crypto.randomUUID(),
    computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
    base64EncodeWebSafe: (b) => Buffer.from(b.map((x) => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
  },
  HtmlService: { createHtmlOutputFromFile: (n) => ({ getContent: () => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8') }) },
  Logger: { log: () => {} },
  DriveApp: {},
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Codigo.gs'), 'utf8'), ctx);
const g = (s) => vm.runInContext(s, ctx);
let n = 0;
const teste = (nome, fn) => { fn(); n++; console.log('ok -', nome); };

teste('CRC16 confere com o exemplo oficial do Banco Central', () => {
  const ex = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.strictEqual(g('crc16_')(ex), '1D3D');
});

teste('PIX copia e cola tem estrutura EMV e CRC válido', () => {
  const pix = g('gerarPix_')(162.1, 'DD20261130-AB12');
  assert.ok(pix.startsWith('000201'));
  assert.ok(pix.includes('0014br.gov.bcb.pix011468681279000150'));
  assert.ok(pix.includes('5406162.10'));
  assert.ok(pix.includes('5915Cond Dom Duarte'));
  assert.ok(pix.includes('6014RIO DE JANEIRO'));
  assert.ok(pix.includes('62180514DD20261130AB12'));
  assert.strictEqual(pix.slice(-4), g('crc16_')(pix.slice(0, -4)));
});

teste('Valor = 10% do salário mínimo (BCB) e cai para a referência se falhar', () => {
  assert.strictEqual(g('valorReserva_')(), 162.1);
  respostaBCB = { code: 500, body: '' };
  assert.strictEqual(g('valorReserva_')(), 162.1);
  respostaBCB = { code: 200, body: '[{"data":"01/01/2027","valor":"1700.00"}]' };
  assert.strictEqual(g('valorReserva_')(), 170);
  respostaBCB = { code: 200, body: '[{"data":"01/01/2025","valor":"1518.00"}]' };
  assert.strictEqual(g('valorReserva_')(), 162.1, 'valor atrasado do BCB não pode baixar o preço');
  respostaBCB = { code: 200, body: '[{"data":"01/01/2026","valor":"1621.00"}]' };
});

const base = { nome: 'Maria Teste', apto: '302', bloco: '1', telefone: '(21) 99999-0000', email: 'maria@exemplo.com', aceite: true, aceiteSom: true };
const erroDe = (dados) => { try { g('validarPedido_')(dados); return null; } catch (e) { return e.message; } };

teste('Antecedência mínima de 5 dias e máxima de 180', () => {
  // hoje = 2026-10-26
  assert.match(erroDe({ ...base, data: '2026-10-30' }), /5 dias/);
  assert.strictEqual(erroDe({ ...base, data: '2026-10-31' }), null);
  assert.strictEqual(erroDe({ ...base, data: '2027-04-24' }), null); // +180
  assert.match(erroDe({ ...base, data: '2027-04-25' }), /180 dias/);
  assert.match(erroDe({ ...base, data: '2026-02-30' }), /Data inválida/);
});

teste('Exige aceite do regulamento e dados válidos; campo-isca bloqueia robôs', () => {
  assert.match(erroDe({ ...base, aceite: false, data: '2026-11-10' }), /regulamento/);
  assert.match(erroDe({ ...base, aceiteSom: false, data: '2026-11-10' }), /controle do som/);
  assert.match(erroDe({ ...base, email: 'x', data: '2026-11-10' }), /e-mail/);
  assert.match(erroDe({ ...base, telefone: '1234', data: '2026-11-10' }), /telefone/);
  assert.match(erroDe({ ...base, site: 'spam', data: '2026-11-10' }), /inválido/);
});

teste('Horários: dom-qui até 22h; sex e sáb até 00h', () => {
  assert.match(g('textoHorario_')('2026-11-08'), /08h às 22h .*21h/); // domingo
  assert.match(g('textoHorario_')('2026-11-12'), /08h às 22h/); // quinta
  assert.match(g('textoHorario_')('2026-11-13'), /08h às 00h .*22h/); // sexta
  assert.match(g('textoHorario_')('2026-11-14'), /08h às 00h/); // sábado
});

teste('Apto e Bloco são obrigatórios e aparecem juntos', () => {
  assert.match(erroDe({ ...base, apto: '', data: '2026-11-10' }), /apartamento/);
  assert.match(erroDe({ ...base, bloco: '', data: '2026-11-10' }), /bloco/);
  assert.strictEqual(g('validarPedido_')({ ...base, data: '2026-11-10' }).unidade, 'Apto 302 - Bloco 1');
  assert.strictEqual(g('validarPedido_')({ ...base, apto: 'Apto 302', bloco: 'bloco 2', data: '2026-11-10' }).unidade, 'Apto 302 - Bloco 2');
});

let r1;
teste('Fluxo: pré-reserva amarela + e-mail ao morador e à administração', () => {
  r1 = g('solicitarReserva')({ ...base, data: '2026-11-13' }); // sexta
  const ev = eventos[0];
  assert.strictEqual(ev.cor, '5');
  assert.strictEqual(ev.ini.toISOString(), '2026-11-13T11:00:00.000Z'); // 08h SP
  assert.strictEqual(ev.fim.toISOString(), '2026-11-14T03:00:00.000Z'); // 00h SP
  assert.match(ev.titulo, /PRÉ-RESERVA — Salão — Apto 302 - Bloco 1/);
  assert.ok(emails[0].htmlBody.includes('Apto 302 - Bloco 1'));
  assert.strictEqual(emails.length, 2);
  assert.strictEqual(emails[0].to, 'maria@exemplo.com');
  assert.ok(emails[0].htmlBody.includes(r1.pix));
  assert.ok(emails[0].htmlBody.includes('volume reduzido a partir das 22h'));
  assert.strictEqual(r1.somReduzido, '22h');
  assert.strictEqual(r1.encerramento, '00h');
  assert.ok(emails[0].htmlBody.includes(r1.protocolo));
  assert.strictEqual(emails[1].to, 'domduartecondominio@gmail.com');
  assert.ok(emails[1].htmlBody.includes('acao=confirmar'));
});

teste('Uma reserva por dia; evento de sexta até 00h não bloqueia o sábado', () => {
  assert.throws(() => g('solicitarReserva')({ ...base, data: '2026-11-13' }), /reservada ou está bloqueada/);
  assert.strictEqual(g('dataLivre_')('2026-11-14'), true);
  assert.deepStrictEqual(g('datasOcupadas_')('2026-10-31', '2027-04-24'), ['2026-11-13']);
});

teste('Qualquer evento na agenda (inclusive dia inteiro) bloqueia a data', () => {
  novoEvento('Manutenção', new Date('2026-11-20T00:00:00-03:00'), new Date('2026-11-21T00:00:00-03:00'));
  novoEvento('Reunião', new Date('2026-11-25T19:00:00-03:00'), new Date('2026-11-25T20:00:00-03:00'));
  assert.strictEqual(g('dataLivre_')('2026-11-20'), false);
  assert.strictEqual(g('dataLivre_')('2026-11-21'), true);
  assert.strictEqual(g('dataLivre_')('2026-11-25'), false);
  assert.deepStrictEqual(g('datasOcupadas_')('2026-10-31', '2027-04-24'), ['2026-11-13', '2026-11-20', '2026-11-25']);
});

teste('Links protegidos: assinatura errada é recusada', () => {
  const id = eventos[0].id;
  assert.throws(() => g('executarAcaoAdmin')('confirmar', id, 'falso'), /Link inválido/);
  assert.throws(() => g('executarAcaoAdmin')('cancelar', id, g('assinar_')('confirmar', id)), /Link inválido/);
  assert.throws(() => g('executarAcaoAdmin')('confirmar', 'outro-id', g('assinar_')('confirmar', id)), /Link inválido/);
});

teste('Confirmar: evento fica verde e morador recebe "Reserva confirmada"', () => {
  const id = eventos[0].id;
  emails.length = 0;
  g('executarAcaoAdmin')('confirmar', id, g('assinar_')('confirmar', id));
  assert.strictEqual(eventos[0].cor, '10');
  assert.match(eventos[0].titulo, /RESERVA CONFIRMADA/);
  assert.match(emails[0].subject, /Reserva confirmada/);
  assert.match(g('executarAcaoAdmin')('confirmar', id, g('assinar_')('confirmar', id)), /já estava confirmada/);
});

teste('Cancelar: libera a data e avisa o morador', () => {
  const id = eventos[0].id;
  emails.length = 0;
  g('executarAcaoAdmin')('cancelar', id, g('assinar_')('cancelar', id));
  assert.strictEqual(g('dataLivre_')('2026-11-13'), true);
  assert.match(emails[0].subject, /Reserva cancelada/);
  assert.strictEqual(emails[0].to, 'maria@exemplo.com');
});

teste('Nome com HTML é escapado nos e-mails', () => {
  emails.length = 0;
  g('solicitarReserva')({ ...base, nome: '<b>Ze</b> & Cia', data: '2026-12-01' });
  assert.ok(!emails[0].htmlBody.includes('<b>Ze</b>'));
  assert.ok(emails[0].htmlBody.includes('&lt;b&gt;Ze'));
});

teste('WhatsApp da portaria: sem configuração não envia nada', () => {
  whats.length = 0;
  const r = g('solicitarReserva')({ ...base, data: '2026-12-05' });
  const id = eventos.find((e) => e.getTag('protocolo') === r.protocolo).id;
  g('executarAcaoAdmin')('confirmar', id, g('assinar_')('confirmar', id));
  assert.strictEqual(whats.length, 0);
});

teste('WhatsApp da portaria: avisa na confirmação, sem e-mail/telefone do morador', () => {
  props.PORTARIA_WHATSAPP = '(21) 98888-7777';
  props.CALLMEBOT_APIKEY = '123456';
  whats.length = 0; whatsUrls.length = 0;
  const r = g('solicitarReserva')({ ...base, data: '2026-12-12' }); // sábado
  assert.strictEqual(whats.length, 0, 'pré-reserva não avisa a portaria');
  const id = eventos.find((e) => e.getTag('protocolo') === r.protocolo).id;
  g('executarAcaoAdmin')('confirmar', id, g('assinar_')('confirmar', id));
  assert.strictEqual(whats.length, 1);
  assert.match(whats[0], /Salão de festas reservado/);
  assert.match(whats[0], /sábado, 12\/12\/2026/);
  assert.match(whats[0], /Apto 302 - Bloco 1 \(Maria Teste\)/);
  assert.match(whats[0], /Som reduzido às 22h e desligado às 00h/);
  assert.ok(!whats[0].includes('maria@exemplo.com') && !whats[0].includes('99999'));
  assert.ok(whatsUrls[0].includes('phone=%2B5521988887777'));
});

teste('WhatsApp da portaria: avisa cancelamento só de reserva confirmada', () => {
  whats.length = 0;
  const conf = eventos.find((e) => e.getTag('data') === '2026-12-12');
  g('executarAcaoAdmin')('cancelar', conf.id, g('assinar_')('cancelar', conf.id));
  assert.strictEqual(whats.length, 1);
  assert.match(whats[0], /CANCELADA/);
  whats.length = 0;
  const r = g('solicitarReserva')({ ...base, data: '2026-12-19' });
  const pre = eventos.find((e) => e.getTag('protocolo') === r.protocolo);
  g('executarAcaoAdmin')('cancelar', pre.id, g('assinar_')('cancelar', pre.id));
  assert.strictEqual(whats.length, 0);
});

teste('WhatsApp da portaria: lembrete diário só no dia de evento confirmado', () => {
  whats.length = 0;
  agoraFixo = new Date('2026-12-05T08:00:00-03:00'); // dia da reserva confirmada no 1º teste
  g('lembreteDiarioPortaria')();
  assert.strictEqual(whats.length, 1);
  assert.match(whats[0], /Hoje tem evento no salão/);
  whats.length = 0;
  agoraFixo = new Date('2026-12-06T08:00:00-03:00');
  g('lembreteDiarioPortaria')();
  assert.strictEqual(whats.length, 0);
  agoraFixo = new Date('2026-10-26T15:00:00-03:00');
});

console.log(`\n${n} testes passaram.`);
