// Abre Index.html num "celular" de 390px, com o servidor simulado, e verifica se nada fica cortado.
// Uso: node salao-dom-duarte/testes/testar-celular.js <pasta-de-saida> [qrcode.min.js local]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const saida = process.argv[2] || '.';
const qrLocal = process.argv[3];
const raiz = path.join(__dirname, '..');
const regulamento = fs.readFileSync(path.join(raiz, 'Regulamento.html'), 'utf8');
const mock = `<script>
  window.__srv = {
    obterDadosIniciais: function () { return { valor: 162.1, dataMin: '2026-10-31', dataMax: '2027-04-24',
      ocupadas: ['2026-11-07', '2026-11-13', '2026-11-20'],
      horarios: [0,1,2,3,4,5,6].map(function (d) { return d >= 5 ? {inicio:'08h',somReduzido:'22h',encerramento:'00h'} : {inicio:'08h',somReduzido:'21h',encerramento:'22h'}; }) }; },
    solicitarReserva: function () { return { protocolo: 'DD20261114-AB12', dataExtenso: 'sábado, 14/11/2026',
      horario: 'das 08h às 00h (som reduzido às 22h)', valor: 162.1,
      pix: '00020126360014br.gov.bcb.pix0114686812790001505204000053039865406162.105802BR5915Cond Dom Duarte6014RIO DE JANEIRO62180514DD20261114AB126304ABCD',
      chave: '68681279000150', favorecido: 'Cond Dom Duarte', banco: 'C6 Bank',
      emailAdmin: 'domduartecondominio@gmail.com', telefoneAdmin: '(21) 2454-7602' }; }
  };
  function __runner(ok, falha) {
    return new Proxy({}, { get: function (_, nome) {
      if (nome === 'withSuccessHandler') return function (f) { return __runner(f, falha); };
      if (nome === 'withFailureHandler') return function (f) { return __runner(ok, f); };
      return function (arg) { setTimeout(function () { ok(window.__srv[nome](arg)); }, 50); };
    }});
  }
  window.google = { script: { get run() { return __runner(function () {}, function () {}); } } };
</script>`;
const html = fs.readFileSync(path.join(raiz, 'Index.html'), 'utf8')
  .replace("<?!= include('Regulamento') ?>", regulamento)
  .replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1">' + mock);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  if (qrLocal) await page.route(/qrcode\.min\.js$/, (r) => r.fulfill({ body: fs.readFileSync(qrLocal), contentType: 'text/javascript' }));
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForSelector('.cal button');

  const estouro = () => page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const fora = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > largura + 0.5 || r.left < -0.5) && !el.closest('.isca');
    }).map((el) => el.tagName + '.' + el.className);
    return { scroll: document.documentElement.scrollWidth, largura, fora };
  });

  const e1 = await estouro();
  await page.screenshot({ path: path.join(saida, 'celular-1-formulario.png'), fullPage: true });

  await page.click('#prox');
  await page.click('.cal button[data-d="2026-11-14"]');
  await page.fill('#nome', 'Maria da Silva Teste');
  await page.fill('#unidade', '302');
  await page.fill('#telefone', '(21) 99999-0000');
  await page.fill('#email', 'maria.da.silva.teste.com.email.comprido@exemplo.com.br');
  await page.check('#aceite');
  await page.click('#enviar');
  await page.waitForSelector('#resultado', { state: 'visible' });
  await page.waitForTimeout(300);
  const temQR = await page.evaluate(() => !!document.querySelector('#qrcode img, #qrcode canvas'));
  const e2 = await estouro();
  await page.screenshot({ path: path.join(saida, 'celular-2-pix.png'), fullPage: true });

  console.log(JSON.stringify({ formulario: e1, resultado: e2, qrCodeDesenhado: temQR, erros }, null, 1));
  await browser.close();
  if (e1.scroll > 390 || e2.scroll > 390 || e1.fora.length || e2.fora.length || erros.length || !temQR) process.exit(1);
})();
