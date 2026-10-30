/**
 * Reserva do Salão de Festas — Condomínio Dom Duarte
 * Backend em Google Apps Script (App da Web).
 *
 * Tudo o que o síndico pode precisar mudar está no objeto CONFIG abaixo.
 * Nenhuma senha fica neste arquivo: a chave secreta dos botões do e-mail
 * é gerada automaticamente e guardada nas "Propriedades do script".
 */

const CONFIG = {
  CONDOMINIO: 'Condomínio Dom Duarte',
  ENDERECO: 'Rua Barão, 663 - Praça Seca, Rio de Janeiro',
  CNPJ: '68.681.279/0001-50',

  // PIX
  PIX_CHAVE: '68681279000150',
  PIX_FAVORECIDO: 'Cond Dom Duarte', // até 25 caracteres, sem acento
  PIX_CIDADE: 'RIO DE JANEIRO', // até 15 caracteres, sem acento
  PIX_BANCO: 'C6 Bank',

  // Contato da administração (recebe os pedidos e os comprovantes)
  EMAIL_ADMIN: 'domduartecondominio@gmail.com',
  TELEFONE_ADMIN: '(21) 2454-7602',

  // Agenda Google usada para as reservas ('primary' = agenda principal da conta)
  CALENDAR_ID: 'primary',

  // Valor: 10% do salário mínimo vigente (série 1619 do Banco Central)
  SALARIO_MINIMO_REFERENCIA: 1621.0, // Decreto 12.797/2025
  PERCENTUAL_RESERVA: 0.1,

  // Prazos
  ANTECEDENCIA_MIN_DIAS: 5,
  ANTECEDENCIA_MAX_DIAS: 180,

  // ID do PDF do regulamento no Google Drive (deixe '' para não anexar)
  REGULAMENTO_PDF_ID: '18D4ItNcweEIICbls556NxuPqk4g3AFeK',

  // Endereço público do app (terminado em /exec). Preenchido após a 1ª publicação.
  URL_APP: 'https://script.google.com/macros/s/AKfycbxa4KGiitIVf-iGLpx0Ix2qKeIcLLsn45UVx-A_lbZ0onYjwlq12_zuhbNb58pPwspe/exec',

  FUSO: 'America/Sao_Paulo',
};

// Horários (incluem montagem e desmontagem). Índice = dia da semana (0 = domingo).
const HORARIOS = [
  { inicio: '08h', somReduzido: '21h', encerramento: '22h' }, // domingo
  { inicio: '08h', somReduzido: '21h', encerramento: '22h' }, // segunda
  { inicio: '08h', somReduzido: '21h', encerramento: '22h' }, // terça
  { inicio: '08h', somReduzido: '21h', encerramento: '22h' }, // quarta
  { inicio: '08h', somReduzido: '21h', encerramento: '22h' }, // quinta
  { inicio: '08h', somReduzido: '22h', encerramento: '00h' }, // sexta
  { inicio: '08h', somReduzido: '22h', encerramento: '00h' }, // sábado
];

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const STATUS = { PRE: 'PRE-RESERVA', CONFIRMADA: 'CONFIRMADA' };

/* =========================================================
   Entrada do App da Web
   ========================================================= */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao) return paginaAdmin_(p);

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Reserva do Salão de Festas — ' + CONFIG.CONDOMINIO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** Usado em Index.html para incluir outros arquivos HTML (ex.: Regulamento). */
function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/* =========================================================
   Funções chamadas pela página (google.script.run)
   ========================================================= */

/** Dados para montar a página: valor, limites de data e dias ocupados. */
function obterDadosIniciais() {
  const hoje = hojeISO_();
  const min = somarDias_(hoje, CONFIG.ANTECEDENCIA_MIN_DIAS);
  const max = somarDias_(hoje, CONFIG.ANTECEDENCIA_MAX_DIAS);
  return {
    condominio: CONFIG.CONDOMINIO,
    endereco: CONFIG.ENDERECO,
    valor: valorReserva_(),
    dataMin: min,
    dataMax: max,
    ocupadas: datasOcupadas_(min, max),
    horarios: HORARIOS,
    emailAdmin: CONFIG.EMAIL_ADMIN,
    telefoneAdmin: CONFIG.TELEFONE_ADMIN,
  };
}

/** Recebe o pedido do formulário e cria a PRÉ-RESERVA. */
function solicitarReserva(form) {
  const dados = validarPedido_(form);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('O sistema está ocupado. Tente novamente em alguns segundos.');
  }
  let evento;
  let reserva;
  try {
    if (!dataLivre_(dados.data)) {
      throw new Error('Esta data acabou de ser reservada ou está bloqueada. Escolha outra data.');
    }
    const valor = valorReserva_();
    const protocolo = gerarProtocolo_(dados.data);
    reserva = Object.assign({}, dados, {
      protocolo: protocolo,
      valor: valor,
      pix: gerarPix_(valor, protocolo.replace(/[^A-Za-z0-9]/g, '')),
    });
    evento = criarEvento_(reserva);
    reserva.eventoId = evento.getId();
  } finally {
    lock.releaseLock();
  }

  enviarEmailMorador_(reserva);
  enviarEmailAdmin_(reserva);

  return {
    protocolo: reserva.protocolo,
    dataExtenso: dataPorExtenso_(reserva.data),
    horario: textoHorario_(reserva.data),
    valor: reserva.valor,
    pix: reserva.pix,
    chave: CONFIG.PIX_CHAVE,
    favorecido: CONFIG.PIX_FAVORECIDO,
    banco: CONFIG.PIX_BANCO,
    emailAdmin: CONFIG.EMAIL_ADMIN,
    telefoneAdmin: CONFIG.TELEFONE_ADMIN,
  };
}

/** Executa "confirmar" ou "cancelar" a partir da página aberta pelo botão do e-mail. */
function executarAcaoAdmin(acao, id, assinatura) {
  if (!assinaturaValida_(acao, id, assinatura)) throw new Error('Link inválido.');
  const evento = buscarEvento_(id);
  if (!evento) return 'Esta reserva não existe mais (talvez já tenha sido cancelada).';

  const reserva = reservaDoEvento_(evento);

  if (acao === 'confirmar') {
    if (reserva.status === STATUS.CONFIRMADA) return 'Esta reserva já estava confirmada.';
    evento.setTag('status', STATUS.CONFIRMADA);
    evento.setColor(CalendarApp.EventColor.GREEN);
    evento.setTitle(tituloEvento_(STATUS.CONFIRMADA, reserva));
    enviarEmailConfirmacao_(reserva);
    return 'Pagamento confirmado. O evento ficou verde na agenda e o morador recebeu o e-mail "Reserva confirmada".';
  }

  if (acao === 'cancelar') {
    evento.deleteEvent();
    enviarEmailCancelamento_(reserva);
    return 'Reserva cancelada. A data foi liberada e o morador foi avisado por e-mail.';
  }

  throw new Error('Ação desconhecida.');
}

/* =========================================================
   Teste de configuração (rodar uma vez pelo editor)
   ========================================================= */

function testarConfiguracao() {
  const log = [];
  const ok = (t) => log.push('OK   ' + t);
  const aviso = (t) => log.push('AVISO ' + t);

  const agenda = agenda_();
  ok('Agenda encontrada: ' + agenda.getName());

  segredo_();
  ok('Chave secreta dos botões do e-mail está guardada nas Propriedades do script.');

  const sm = consultarSalarioMinimo_();
  if (sm) ok('Banco Central respondeu: salário mínimo R$ ' + sm.toFixed(2));
  else aviso('Banco Central não respondeu; será usado o valor de referência R$ ' + CONFIG.SALARIO_MINIMO_REFERENCIA.toFixed(2));
  ok('Valor da reserva hoje: R$ ' + valorReserva_().toFixed(2));

  ok('E-mails que ainda podem ser enviados hoje: ' + MailApp.getRemainingDailyQuota());

  if (CONFIG.REGULAMENTO_PDF_ID) {
    ok('PDF do regulamento encontrado: ' + DriveApp.getFileById(CONFIG.REGULAMENTO_PDF_ID).getName());
  } else {
    aviso('Nenhum PDF do regulamento configurado (CONFIG.REGULAMENTO_PDF_ID). Os e-mails irão sem anexo.');
  }

  if (include('Regulamento').indexOf('REGULAMENTO_PENDENTE') !== -1) {
    aviso('O texto oficial do regulamento ainda não foi colado em Regulamento.html.');
  }

  const pix = gerarPix_(valorReserva_(), 'TESTE');
  ok('PIX copia e cola de teste: ' + pix);

  const texto = log.join('\n');
  Logger.log(texto);
  return texto;
}

/* =========================================================
   Valor da reserva (salário mínimo — Banco Central, série 1619)
   ========================================================= */

function valorReserva_() {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('salario_minimo');
  let salario = guardado ? Number(guardado) : consultarSalarioMinimo_();
  if (salario && !guardado) cache.put('salario_minimo', String(salario), 6 * 60 * 60);
  // O salário mínimo nunca diminui: se o Banco Central ainda não publicou o
  // valor novo (ou falhou), vale o valor de referência do decreto.
  if (!salario || salario < CONFIG.SALARIO_MINIMO_REFERENCIA) salario = CONFIG.SALARIO_MINIMO_REFERENCIA;
  return Math.round(salario * CONFIG.PERCENTUAL_RESERVA * 100) / 100;
}

function consultarSalarioMinimo_() {
  try {
    const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados/ultimos/1?formato=json';
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return null;
    const dados = JSON.parse(resp.getContentText());
    const valor = Number(String(dados[0].valor).replace(',', '.'));
    return valor > 0 ? valor : null;
  } catch (err) {
    return null;
  }
}

/* =========================================================
   PIX copia e cola (padrão EMV do Banco Central)
   ========================================================= */

function gerarPix_(valor, txid) {
  const campo = (id, conteudo) => id + String(conteudo.length).padStart(2, '0') + conteudo;
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  const contaPix = campo('00', 'br.gov.bcb.pix') + campo('01', CONFIG.PIX_CHAVE);
  const txidLimpo = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  let payload =
    campo('00', '01') +
    campo('26', contaPix) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', semAcento(CONFIG.PIX_FAVORECIDO).slice(0, 25)) +
    campo('60', semAcento(CONFIG.PIX_CIDADE).slice(0, 15)) +
    campo('62', campo('05', txidLimpo)) +
    '6304';
  return payload + crc16_(payload);
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo Banco Central. */
function crc16_(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/* =========================================================
   Agenda
   ========================================================= */

function agenda_() {
  const cal = CONFIG.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!cal) throw new Error('Agenda não encontrada: ' + CONFIG.CALENDAR_ID);
  return cal;
}

/** Uma data está livre se não existe NENHUM evento na agenda nesse dia. */
function dataLivre_(dataISO) {
  const inicio = inicioDoDia_(dataISO);
  const fim = inicioDoDia_(somarDias_(dataISO, 1));
  return agenda_()
    .getEvents(inicio, fim)
    .every((ev) => !(ev.getStartTime() < fim && ev.getEndTime() > inicio));
}

/** Lista as datas (AAAA-MM-DD) que têm algum evento entre min e max. */
function datasOcupadas_(minISO, maxISO) {
  const inicio = inicioDoDia_(minISO);
  const fim = inicioDoDia_(somarDias_(maxISO, 1));
  const ocupadas = {};
  agenda_().getEvents(inicio, fim).forEach((ev) => {
    let dia = paraISO_(ev.getStartTime());
    const ultimo = paraISO_(new Date(ev.getEndTime().getTime() - 1));
    if (dia > ultimo) dia = ultimo;
    for (let i = 0; dia <= ultimo && i < 400; i++, dia = somarDias_(dia, 1)) ocupadas[dia] = true;
  });
  return Object.keys(ocupadas).filter((d) => d >= minISO && d <= maxISO).sort();
}

function criarEvento_(r) {
  const inicio = new Date(r.data + 'T08:00:00-03:00');
  const fimSexSab = diaSemana_(r.data) >= 5;
  const fim = fimSexSab
    ? new Date(somarDias_(r.data, 1) + 'T00:00:00-03:00')
    : new Date(r.data + 'T22:00:00-03:00');

  const descricao = [
    'Protocolo: ' + r.protocolo,
    'Status: ' + STATUS.PRE + ' (aguardando pagamento)',
    'Morador: ' + r.nome,
    'Apto / Bloco: ' + r.unidade,
    'Telefone: ' + r.telefone,
    'E-mail: ' + r.email,
    'Valor: ' + moeda_(r.valor),
    'Horário: ' + textoHorario_(r.data),
    r.observacoes ? 'Observações: ' + r.observacoes : '',
  ].filter(Boolean).join('\n');

  const ev = agenda_().createEvent(tituloEvento_(STATUS.PRE, r), inicio, fim, { description: descricao });
  ev.setColor(CalendarApp.EventColor.YELLOW);
  ev.setTag('protocolo', r.protocolo);
  ev.setTag('status', STATUS.PRE);
  ev.setTag('nome', r.nome);
  ev.setTag('unidade', r.unidade);
  ev.setTag('email', r.email);
  ev.setTag('telefone', r.telefone);
  ev.setTag('data', r.data);
  ev.setTag('valor', String(r.valor));
  return ev;
}

function tituloEvento_(status, r) {
  const prefixo = status === STATUS.CONFIRMADA ? 'RESERVA CONFIRMADA' : 'PRÉ-RESERVA';
  return prefixo + ' — Salão — ' + r.unidade + ' (' + r.nome + ')';
}

function buscarEvento_(id) {
  try {
    return agenda_().getEventById(id);
  } catch (err) {
    return null;
  }
}

function reservaDoEvento_(ev) {
  const data = ev.getTag('data') || paraISO_(ev.getStartTime());
  return {
    protocolo: ev.getTag('protocolo') || '',
    status: ev.getTag('status') || '',
    nome: ev.getTag('nome') || '',
    unidade: ev.getTag('unidade') || '',
    email: ev.getTag('email') || '',
    telefone: ev.getTag('telefone') || '',
    data: data,
    valor: Number(ev.getTag('valor')) || valorReserva_(),
    eventoId: ev.getId(),
  };
}

/* =========================================================
   Validação do pedido
   ========================================================= */

function validarPedido_(f) {
  f = f || {};
  if (f.site) throw new Error('Pedido inválido.'); // campo-isca contra robôs

  const limpar = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const d = {
    nome: limpar(f.nome, 80),
    apto: limpar(f.apto, 15).replace(/^(apartamento|apto|ap)\.?\s*/i, ''),
    bloco: limpar(f.bloco, 15).replace(/^(bloco|bl)\.?\s*/i, ''),
    telefone: limpar(f.telefone, 30),
    email: limpar(f.email, 120).toLowerCase(),
    data: limpar(f.data, 10),
    observacoes: limpar(f.observacoes, 500),
  };

  if (d.nome.length < 3) throw new Error('Informe seu nome completo.');
  if (!d.apto) throw new Error('Informe o número do seu apartamento.');
  if (!d.bloco) throw new Error('Informe o seu bloco.');
  d.unidade = 'Apto ' + d.apto + ' - Bloco ' + d.bloco;
  if (d.telefone.replace(/\D/g, '').length < 10) throw new Error('Informe um telefone com DDD.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('Informe um e-mail válido.');
  if (f.aceite !== true && f.aceite !== 'true' && f.aceite !== 'on') {
    throw new Error('É preciso declarar que leu e concorda com o regulamento.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data) || paraISO_(new Date(d.data + 'T12:00:00-03:00')) !== d.data) {
    throw new Error('Data inválida.');
  }

  const hoje = hojeISO_();
  if (d.data < somarDias_(hoje, CONFIG.ANTECEDENCIA_MIN_DIAS)) {
    throw new Error('A reserva precisa ser feita com pelo menos ' + CONFIG.ANTECEDENCIA_MIN_DIAS + ' dias de antecedência.');
  }
  if (d.data > somarDias_(hoje, CONFIG.ANTECEDENCIA_MAX_DIAS)) {
    throw new Error('Só é possível reservar até ' + CONFIG.ANTECEDENCIA_MAX_DIAS + ' dias à frente.');
  }
  return d;
}

/* =========================================================
   Links protegidos (HMAC) para confirmar / cancelar
   ========================================================= */

function segredo_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SEGREDO_HMAC');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SEGREDO_HMAC', s);
  }
  return s;
}

function assinar_(acao, id) {
  const bytes = Utilities.computeHmacSha256Signature(acao + '|' + id, segredo_());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function assinaturaValida_(acao, id, assinatura) {
  if (!acao || !id || !assinatura) return false;
  const esperado = assinar_(acao, id);
  if (esperado.length !== String(assinatura).length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ String(assinatura).charCodeAt(i);
  return dif === 0;
}

function urlApp_() {
  return CONFIG.URL_APP || ScriptApp.getService().getUrl();
}

function linkAdmin_(acao, id) {
  return urlApp_() +
    '?acao=' + encodeURIComponent(acao) +
    '&id=' + encodeURIComponent(id) +
    '&sig=' + encodeURIComponent(assinar_(acao, id));
}

/**
 * Página aberta pelos botões do e-mail. Ela NÃO executa nada sozinha:
 * mostra os dados e pede um clique final. Assim, programas antivírus que
 * "visitam" os links do e-mail não confirmam nem cancelam reservas por engano.
 */
function paginaAdmin_(p) {
  const t = HtmlService.createTemplateFromFile('Admin');
  t.acao = p.acao;
  t.id = p.id || '';
  t.sig = p.sig || '';
  t.valido = assinaturaValida_(p.acao, p.id, p.sig) && (p.acao === 'confirmar' || p.acao === 'cancelar');
  t.reserva = null;
  t.dataExtenso = '';
  if (t.valido) {
    const ev = buscarEvento_(p.id);
    if (ev) {
      t.reserva = reservaDoEvento_(ev);
      t.dataExtenso = dataPorExtenso_(t.reserva.data);
    }
  }
  t.moeda = moeda_;
  return t.evaluate()
    .setTitle('Administração — Salão de Festas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* =========================================================
   E-mails
   ========================================================= */

function enviarEmailMorador_(r) {
  const corpo =
    '<p>Olá, ' + esc_(r.nome) + '!</p>' +
    '<p>Recebemos seu pedido de reserva do Salão de Festas. Ele está registrado como ' +
    '<b>PRÉ-RESERVA</b> e só será confirmado após o pagamento.</p>' +
    quadroReserva_(r) +
    '<h3 style="margin:24px 0 8px">Pagamento por PIX</h3>' +
    '<p style="margin:0">Valor: <b>' + moeda_(r.valor) + '</b><br>' +
    'Chave (CNPJ): <b>' + CONFIG.PIX_CHAVE + '</b><br>' +
    'Favorecido: <b>' + CONFIG.PIX_FAVORECIDO + '</b> — ' + CONFIG.PIX_BANCO + '</p>' +
    '<p style="margin:12px 0 4px">PIX copia e cola:</p>' +
    '<p style="font-family:monospace;font-size:12px;word-break:break-all;background:#f3f4f6;padding:10px;border-radius:6px">' +
    r.pix + '</p>' +
    '<p><b>Depois de pagar, envie o comprovante</b> para ' + CONFIG.EMAIL_ADMIN +
    ' ou para o telefone ' + CONFIG.TELEFONE_ADMIN + ', informando o protocolo <b>' + r.protocolo + '</b>.</p>' +
    lembretes_(r.data) +
    rodape_();

  MailApp.sendEmail({
    to: r.email,
    subject: 'Pré-reserva do Salão de Festas — ' + dataCurta_(r.data) + ' — Protocolo ' + r.protocolo,
    htmlBody: moldura_(corpo),
    name: CONFIG.CONDOMINIO,
    replyTo: CONFIG.EMAIL_ADMIN,
    attachments: anexos_(),
  });
}

function enviarEmailAdmin_(r) {
  const botao = (texto, url, cor) =>
    '<a href="' + url + '" style="display:inline-block;padding:12px 20px;margin:4px 8px 4px 0;background:' + cor +
    ';color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">' + texto + '</a>';

  const corpo =
    '<p>Nova <b>PRÉ-RESERVA</b> do Salão de Festas (amarela na agenda).</p>' +
    quadroReserva_(r) +
    '<p>Quando o comprovante do PIX de <b>' + moeda_(r.valor) + '</b> chegar, clique em "Confirmar pagamento".</p>' +
    '<p>' + botao('Confirmar pagamento', linkAdmin_('confirmar', r.eventoId), '#15803d') +
    botao('Cancelar', linkAdmin_('cancelar', r.eventoId), '#b91c1c') + '</p>' +
    '<p style="color:#6b7280;font-size:13px">Os botões abrem uma página que pede mais um clique para concluir.</p>';

  MailApp.sendEmail({
    to: CONFIG.EMAIL_ADMIN,
    subject: '[PRÉ-RESERVA] Salão ' + dataCurta_(r.data) + ' — ' + r.unidade + ' — ' + r.protocolo,
    htmlBody: moldura_(corpo),
    name: 'Reservas do Salão',
    replyTo: r.email,
  });
}

function enviarEmailConfirmacao_(r) {
  const corpo =
    '<p>Olá, ' + esc_(r.nome) + '!</p>' +
    '<p style="font-size:18px"><b>Sua reserva está confirmada.</b> Recebemos o seu pagamento.</p>' +
    quadroReserva_(r) +
    lembretes_(r.data) +
    rodape_();
  MailApp.sendEmail({
    to: r.email,
    subject: 'Reserva confirmada — Salão de Festas — ' + dataCurta_(r.data),
    htmlBody: moldura_(corpo),
    name: CONFIG.CONDOMINIO,
    replyTo: CONFIG.EMAIL_ADMIN,
    attachments: anexos_(),
  });
}

function enviarEmailCancelamento_(r) {
  if (!r.email) return;
  const corpo =
    '<p>Olá, ' + esc_(r.nome) + '.</p>' +
    '<p>A reserva do Salão de Festas para <b>' + dataPorExtenso_(r.data) + '</b> (protocolo ' + esc_(r.protocolo) +
    ') foi <b>cancelada</b> pela administração, e a data foi liberada.</p>' +
    '<p>Em caso de dúvida, fale com a administração: ' + CONFIG.EMAIL_ADMIN + ' ou ' + CONFIG.TELEFONE_ADMIN + '.</p>' +
    rodape_();
  MailApp.sendEmail({
    to: r.email,
    subject: 'Reserva cancelada — Salão de Festas — ' + dataCurta_(r.data),
    htmlBody: moldura_(corpo),
    name: CONFIG.CONDOMINIO,
    replyTo: CONFIG.EMAIL_ADMIN,
  });
}

function quadroReserva_(r) {
  const linha = (k, v) =>
    '<tr><td style="padding:6px 12px 6px 0;color:#6b7280">' + k + '</td><td style="padding:6px 0"><b>' + v + '</b></td></tr>';
  return '<table style="border-collapse:collapse;margin:12px 0">' +
    linha('Protocolo', esc_(r.protocolo)) +
    linha('Data', esc_(dataPorExtenso_(r.data))) +
    linha('Horário', esc_(textoHorario_(r.data))) +
    linha('Morador', esc_(r.nome)) +
    linha('Apto / Bloco', esc_(r.unidade)) +
    linha('Telefone', esc_(r.telefone)) +
    linha('E-mail', esc_(r.email)) +
    linha('Valor', moeda_(r.valor)) +
    (r.observacoes ? linha('Observações', esc_(r.observacoes)) : '') +
    '</table>';
}

function lembretes_(dataISO) {
  const h = HORARIOS[diaSemana_(dataISO)];
  return '<h3 style="margin:24px 0 8px">Lembretes do regulamento</h3><ul style="padding-left:20px">' +
    '<li>Uso a partir das ' + h.inicio + '; som reduzido às ' + h.somReduzido + '; encerramento às ' + h.encerramento +
    '. Os horários incluem montagem e desmontagem.</li>' +
    '<li>Domingo a quinta: som reduzido às 21h e encerramento às 22h. Sexta e sábado: som reduzido às 22h e encerramento à 00h.</li>' +
    '<li>Apenas uma reserva por dia.</li>' +
    '<li>Proibidos: mesa de som, karaokê, instrumentos musicais/banda, fogos, churrasqueiras portáteis e materiais inflamáveis.</li>' +
    '<li>Mesas e cadeiras somente dentro da área com pintura cinza no chão.</li>' +
    '<li>Convidados não podem usar o estacionamento do condomínio.</li>' +
    '<li>Entregar o salão limpo, com o lixo recolhido, até 1 hora após o encerramento.</li>' +
    '<li>Cancelamento: pedir com no mínimo 48 horas de antecedência; depois disso não há reembolso, salvo força maior comprovada.</li>' +
    '<li>O morador responsável aceitou o regulamento oficial do salão, aprovado em assembleia em 11/12/2025.</li>' +
    '</ul>';
}

function rodape_() {
  return '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">' +
    '<p style="color:#6b7280;font-size:12px">' + CONFIG.CONDOMINIO + ' — ' + CONFIG.ENDERECO +
    ' — CNPJ ' + CONFIG.CNPJ + '<br>Contato: ' + CONFIG.EMAIL_ADMIN + ' — ' + CONFIG.TELEFONE_ADMIN + '</p>';
}

function moldura_(conteudo) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:600px">' +
    '<p style="font-size:13px;color:#6b7280;margin:0 0 16px">' + CONFIG.CONDOMINIO + ' — Salão de Festas</p>' +
    conteudo + '</div>';
}

function anexos_() {
  if (!CONFIG.REGULAMENTO_PDF_ID) return [];
  try {
    return [DriveApp.getFileById(CONFIG.REGULAMENTO_PDF_ID).getBlob()];
  } catch (err) {
    console.warn('Não foi possível anexar o regulamento: ' + err);
    return [];
  }
}

/* =========================================================
   Utilitários de data e texto
   ========================================================= */

function hojeISO_() {
  return paraISO_(new Date());
}

function paraISO_(data) {
  return Utilities.formatDate(data, CONFIG.FUSO, 'yyyy-MM-dd');
}

function inicioDoDia_(dataISO) {
  return new Date(dataISO + 'T00:00:00-03:00');
}

function somarDias_(dataISO, n) {
  const p = dataISO.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.toISOString().slice(0, 10);
}

function diaSemana_(dataISO) {
  const p = dataISO.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
}

function dataCurta_(dataISO) {
  const p = dataISO.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function dataPorExtenso_(dataISO) {
  return DIAS_SEMANA[diaSemana_(dataISO)] + ', ' + dataCurta_(dataISO);
}

function textoHorario_(dataISO) {
  const h = HORARIOS[diaSemana_(dataISO)];
  return 'das ' + h.inicio + ' às ' + h.encerramento + ' (som reduzido às ' + h.somReduzido + ')';
}

function gerarProtocolo_(dataISO) {
  const aleatorio = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return 'DD' + dataISO.replace(/-/g, '') + '-' + aleatorio;
}

function moeda_(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
