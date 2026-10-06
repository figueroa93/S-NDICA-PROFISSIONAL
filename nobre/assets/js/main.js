/* Nobre Gestão de Condomínios — scripts do site (sem dependências) */
(function () {
  'use strict';

  const SITE = window.NOBRE || {};
  const IMOVEIS = window.IMOVEIS || [];
  const ICONS = 'assets/img/icons.svg';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  let io; // observador da animação ao rolar

  const icon = (name) => `<svg class="ico" aria-hidden="true"><use href="${ICONS}#i-${name}"></use></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const waLink = (msg) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg || SITE.mensagemWhatsapp || '')}`;

  /* ---------- Contatos e links configuráveis ---------- */
  $$('[data-site]').forEach((el) => { if (SITE[el.dataset.site]) el.textContent = SITE[el.dataset.site]; });
  $$('[data-link]').forEach((el) => {
    const type = el.dataset.link;
    if (type === 'whatsapp') { el.href = waLink(el.dataset.msg); el.target = '_blank'; el.rel = 'noopener'; }
    if (type === 'tel') el.href = 'tel:+' + SITE.whatsapp;
    if (type === 'email') el.href = 'mailto:' + SITE.email;
    if (type === 'instagram') {
      if (!SITE.instagram) { el.closest('li')?.remove(); el.remove(); return; }
      el.href = 'https://instagram.com/' + SITE.instagram; el.target = '_blank'; el.rel = 'noopener';
    }
    if (type === 'condomino') { el.href = SITE.areaCondomino; el.target = '_blank'; el.rel = 'noopener'; }
  });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Cabeçalho, menu e submenus ---------- */
  const header = $('.header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const nav = $('#nav');
  const toggle = $('.menu-toggle');
  const setMenu = (open) => {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = icon(open ? 'close' : 'menu');
  };
  toggle && toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav && nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  $$('.nav__item > button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const open = !item.classList.contains('is-open');
      $$('.nav__item.is-open').forEach((i) => { i.classList.remove('is-open'); i.firstElementChild.setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item')) $$('.nav__item.is-open').forEach((i) => { i.classList.remove('is-open'); i.firstElementChild.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setMenu(false);
    $$('.nav__item.is-open').forEach((i) => i.classList.remove('is-open'));
  });

  /* ---------- Formulário de busca ---------- */
  const FAIXAS = {
    venda: [['0-400000', 'Até R$ 400 mil'], ['400000-700000', 'R$ 400 mil a R$ 700 mil'], ['700000-1000000', 'R$ 700 mil a R$ 1 milhão'], ['1000000-', 'Acima de R$ 1 milhão']],
    aluguel: [['0-2000', 'Até R$ 2.000'], ['2000-3500', 'R$ 2.000 a R$ 3.500'], ['3500-6000', 'R$ 3.500 a R$ 6.000'], ['6000-', 'Acima de R$ 6.000']],
  };
  const uniq = (key) => [...new Set(IMOVEIS.map((i) => i[key]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const fillSelect = (sel, opts, first) => {
    if (!sel) return;
    sel.innerHTML = `<option value="">${first}</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  };

  $$('[data-search]').forEach((form) => {
    const fin = () => (form.querySelector('[name="finalidade"]:checked') || {}).value || 'venda';
    fillSelect(form.elements.bairro, uniq('bairro').map((b) => [b, b]), 'Todos os bairros');
    fillSelect(form.elements.tipo, uniq('tipo').map((t) => [t, t]), 'Todos');
    fillSelect(form.elements.quartos, [['1', '1 ou mais'], ['2', '2 ou mais'], ['3', '3 ou mais'], ['4', '4 ou mais']], 'Todos');
    const fillPreco = () => fillSelect(form.elements.preco, FAIXAS[fin()], 'Todas');

    // Valores vindos da URL (página de imóveis)
    const f = params.get('finalidade');
    if (f) { const r = form.querySelector(`[name="finalidade"][value="${CSS.escape(f)}"]`); if (r) r.checked = true; }
    fillPreco();
    ['bairro', 'tipo', 'quartos', 'preco'].forEach((n) => { if (params.get(n) && form.elements[n]) form.elements[n].value = params.get(n); });

    $$('[name="finalidade"]', form).forEach((r) => r.addEventListener('change', fillPreco));
    // Não envia campos vazios (URL mais limpa)
    form.addEventListener('submit', () => { $$('select', form).forEach((s) => { s.disabled = !s.value; }); });
  });

  /* ---------- Cards de imóveis ---------- */
  const card = (p) => `
    <article class="prop reveal">
      <a class="media" href="imovel.html?id=${encodeURIComponent(p.id)}" style="aspect-ratio:16/9.4" tabindex="-1" aria-hidden="true">
        <span class="badge ${p.finalidade === 'aluguel' ? 'badge--aluguel' : ''}">${p.finalidade === 'aluguel' ? 'Para alugar' : 'À venda'}</span>
        <img src="${esc(p.fotos[0])}" alt="" loading="lazy">
      </a>
      <div class="prop__body">
        <p class="prop__price">${brl(p.preco)}${p.finalidade === 'aluguel' ? '<small>/mês</small>' : ''}</p>
        <h3 class="prop__title">${esc(p.tipo)} · ${esc(p.titulo)}</h3>
        <p class="prop__loc">${icon('pin')}${esc(p.bairro)} - ${esc(p.cidade)}</p>
        <ul class="specs">
          ${p.quartos ? `<li>${icon('bed')}${p.quartos} ${p.quartos > 1 ? 'quartos' : 'quarto'}</li>` : ''}
          <li>${icon('area')}${p.area} m²</li>
          ${p.vagas ? `<li>${icon('car')}${p.vagas} ${p.vagas > 1 ? 'vagas' : 'vaga'}</li>` : ''}
        </ul>
        <a class="btn btn--block" href="imovel.html?id=${encodeURIComponent(p.id)}">Ver imóvel ${icon('arrow')}</a>
      </div>
    </article>`;

  const destaques = $('[data-destaques]');
  if (destaques) destaques.innerHTML = IMOVEIS.filter((p) => p.destaque).slice(0, 4).map(card).join('');

  /* ---------- Página de listagem ---------- */
  const listing = $('[data-listing]');
  if (listing) {
    const fin = params.get('finalidade');
    const [min, max] = (params.get('preco') || '').split('-').map((v) => (v ? Number(v) : null));
    let list = IMOVEIS.filter((p) =>
      (!fin || p.finalidade === fin) &&
      (!params.get('bairro') || p.bairro === params.get('bairro')) &&
      (!params.get('tipo') || p.tipo === params.get('tipo')) &&
      (!params.get('quartos') || p.quartos >= Number(params.get('quartos'))) &&
      (min == null || p.preco >= min) && (max == null || p.preco <= max));

    const title = $('[data-listing-title]');
    if (title && fin) title.textContent = fin === 'aluguel' ? 'Imóveis para alugar' : 'Imóveis à venda';

    const sort = $('#ordem');
    const render = () => {
      const o = sort ? sort.value : 'destaque';
      const sorted = [...list].sort((a, b) =>
        o === 'menor' ? a.preco - b.preco : o === 'maior' ? b.preco - a.preco : (b.destaque === true) - (a.destaque === true));
      listing.innerHTML = sorted.length ? sorted.map(card).join('') :
        `<div class="props__empty"><strong>Nenhum imóvel encontrado com esses filtros.</strong>Tente ampliar a busca ou <a class="link-arrow" data-link="whatsapp" href="${waLink('Olá! Estou procurando um imóvel e não encontrei no site. Podem me ajudar?')}" target="_blank" rel="noopener">fale com a gente pelo WhatsApp ${icon('arrow')}</a></div>`;
      const count = $('[data-listing-count]');
      if (count) count.innerHTML = `<strong>${sorted.length}</strong> ${sorted.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`;
      observe();
    };
    sort && sort.addEventListener('change', render);
    render();
  }

  /* ---------- Página de detalhe ---------- */
  const detail = $('[data-detail]');
  if (detail) {
    const p = IMOVEIS.find((i) => i.id === params.get('id'));
    if (!p) {
      detail.innerHTML = `<div class="props__empty"><strong>Imóvel não encontrado.</strong>Ele pode ter sido vendido ou alugado. <a class="link-arrow" href="imoveis.html">Ver todos os imóveis ${icon('arrow')}</a></div>`;
    } else {
      document.title = `${p.tipo} em ${p.bairro} | Nobre Gestão de Condomínios`;
      $('[data-detail-title]').textContent = `${p.tipo} · ${p.titulo}`;
      $('[data-detail-loc]').textContent = `${p.bairro} - ${p.cidade}`;
      const aluguel = p.finalidade === 'aluguel';
      const msg = `Olá! Tenho interesse no imóvel "${p.tipo} · ${p.titulo}" (${p.bairro}), código ${p.id}. Pode me passar mais informações?`;
      detail.innerHTML = `
        <div>
          <div class="gallery">
            <div class="media gallery__main"><span class="badge ${aluguel ? 'badge--aluguel' : ''}">${aluguel ? 'Para alugar' : 'À venda'}</span><img src="${esc(p.fotos[0])}" alt="Foto do imóvel: ${esc(p.titulo)}"></div>
            ${p.fotos.length > 1 ? `<div class="gallery__thumbs">${p.fotos.map((f, i) => `<button type="button" aria-label="Ver foto ${i + 1}" aria-current="${i === 0}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
          </div>
          <div class="detail__info">
            <ul class="detail__specs">
              <li>${icon('bed')}<strong>${p.quartos}</strong>${p.quartos === 1 ? 'quarto' : 'quartos'}</li>
              <li>${icon('bath')}<strong>${p.banheiros}</strong>${p.banheiros === 1 ? 'banheiro' : 'banheiros'}</li>
              <li>${icon('area')}<strong>${p.area} m²</strong>área útil</li>
              <li>${icon('car')}<strong>${p.vagas}</strong>${p.vagas === 1 ? 'vaga' : 'vagas'}</li>
            </ul>
            <h2>Sobre o imóvel</h2>
            <p>${esc(p.descricao)}</p>
          </div>
        </div>
        <aside class="aside">
          <span class="eyebrow">${aluguel ? 'Aluguel' : 'Venda'}</span>
          <p class="aside__price">${brl(p.preco)}${aluguel ? '<small style="font-size:1rem">/mês</small>' : ''}</p>
          <div class="aside__costs">
            ${p.condominio ? `<div>Condomínio <strong>${brl(p.condominio)}</strong></div>` : ''}
            ${p.iptu ? `<div>IPTU (mensal) <strong>${brl(p.iptu)}</strong></div>` : ''}
            <div>Código <strong>${esc(p.id)}</strong></div>
          </div>
          <a class="btn btn--block btn--wa" href="${waLink(msg)}" target="_blank" rel="noopener">${icon('whatsapp')} Quero saber mais</a>
          <a class="btn btn--block btn--navy-outline" href="index.html?assunto=${aluguel ? 'alugar' : 'comprar'}&imovel=${encodeURIComponent(p.id)}#contato">Agendar visita</a>
          <small>Valores sujeitos a alteração e confirmação de disponibilidade.</small>
        </aside>`;
      const main = $('.gallery__main img', detail);
      $$('.gallery__thumbs button', detail).forEach((b) => b.addEventListener('click', () => {
        main.src = $('img', b).src;
        $$('.gallery__thumbs button', detail).forEach((x) => x.setAttribute('aria-current', x === b));
      }));
    }
  }

  /* ---------- Formulário de contato (envia pelo WhatsApp) ---------- */
  const contact = $('[data-contact-form]');
  if (contact) {
    const assunto = params.get('assunto');
    if (assunto && contact.elements.assunto) contact.elements.assunto.value = assunto;
    if (params.get('imovel') && contact.elements.mensagem) contact.elements.mensagem.value = `Tenho interesse no imóvel código ${params.get('imovel')}.`;
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contact.reportValidity()) return;
      const d = Object.fromEntries(new FormData(contact));
      const assuntoTxt = contact.elements.assunto.selectedOptions[0].textContent;
      const msg = [`Olá! Vim pelo site da Nobre.`, ``, `*Assunto:* ${assuntoTxt}`, `*Nome:* ${d.nome}`, `*Telefone:* ${d.telefone}`,
        d.email ? `*E-mail:* ${d.email}` : '', d.condominio ? `*Condomínio / imóvel:* ${d.condominio}` : '', d.mensagem ? `*Mensagem:* ${d.mensagem}` : '']
        .filter((l, i) => l || i === 1).join('\n');
      window.open(waLink(msg), '_blank', 'noopener');
    });
  }

  /* ---------- Animação ao rolar ---------- */
  function observe() {
    const els = $$('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }
  observe();
})();
