/* =========================================================
   Natália Figueroa — Síndica Profissional
   ========================================================= */

/*
 * DADOS DE CONTATO — edite apenas aqui.
 * whatsapp:  somente números, com DDI e DDD (ex.: "5521999999999")
 * email:     ex.: "contato@seudominio.com.br"
 * instagram: usuário sem @ (ex.: "nataliafigueroa.sindica")
 * Enquanto um campo estiver vazio, o site mostra o texto provisório do HTML.
 */
const SITE = {
  whatsapp: '5521981360537',
  email: 'natalia.gestao.condominial@gmail.com',
  instagram: '',
  mensagemWhatsapp: 'Olá, Natália! Conheci seu trabalho pelo site e gostaria de conversar sobre a gestão do meu condomínio.',
};

document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Contatos ---------- */
(function setupContacts() {
  const waUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(SITE.mensagemWhatsapp)}`;
  document.querySelectorAll('[data-whatsapp]').forEach((a) => { a.href = waUrl; });

  if (SITE.whatsapp) {
    const n = SITE.whatsapp.replace(/^55/, '');
    const formatted = n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : SITE.whatsapp;
    document.querySelectorAll('[data-contact="whatsapp"]').forEach((el) => { el.textContent = formatted; });
  }

  if (SITE.email) {
    document.querySelectorAll('[data-contact="email"], [data-email]').forEach((el) => { el.href = `mailto:${SITE.email}`; });
    document.querySelectorAll('[data-contact="email"]').forEach((el) => { el.textContent = SITE.email; });
  }

  if (SITE.instagram) {
    document.querySelectorAll('[data-contact="instagram"]').forEach((el) => {
      el.href = `https://www.instagram.com/${SITE.instagram}/`;
      el.textContent = `@${SITE.instagram}`;
    });
  }
})();

/* ---------- Cabeçalho e menu ---------- */
(function setupHeader() {
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('menu-principal');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  // Destaca o item do menu correspondente à seção visível
  const links = [...document.querySelectorAll('.nav__link')];
  const sections = links.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => {
        const active = l.getAttribute('href') === `#${entry.target.id}`;
        l.classList.toggle('is-active', active);
        if (active) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
})();

/* ---------- Animações de entrada e números ---------- */
(function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  const counters = document.querySelectorAll('[data-count]');

  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (Number.isNaN(target) || reduceMotion) { el.textContent = el.dataset.count; return; }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Pequeno escalonamento entre elementos irmãos (cards aparecendo gradualmente)
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i * 0.07, 0.5)}s`);
  });

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('[data-count]').forEach(animateCount);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach((el) => io.observe(el));

  // Contadores fora de .reveal (caso o HTML seja alterado)
  counters.forEach((c) => { if (!c.closest('.reveal')) io.observe(c); });
})();

/* ---------- Carrossel de depoimentos ---------- */
(function setupSlider() {
  const slider = document.querySelector('[data-slider]');
  if (!slider) return;
  const track = slider.querySelector('.slider__track');
  const slides = [...track.children];
  const prev = document.querySelector('[data-slider-prev]');
  const next = document.querySelector('[data-slider-next]');
  const dotsWrap = slider.querySelector('[data-slider-dots]');
  const status = slider.querySelector('[data-slider-status]');
  let index = 0;

  const perView = () => (window.matchMedia('(min-width: 768px)').matches ? 2 : 1);
  const maxIndex = () => Math.max(0, slides.length - perView());

  const renderDots = () => {
    dotsWrap.innerHTML = '';
    for (let i = 0; i <= maxIndex(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slider__dot';
      b.setAttribute('aria-label', `Ir para o depoimento ${i + 1}`);
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
    }
  };

  const update = (announce) => {
    track.style.transform = `translateX(-${(100 / perView()) * index}%)`;
    slides.forEach((s, i) => {
      const visible = i >= index && i < index + perView();
      s.setAttribute('aria-hidden', String(!visible));
      s.querySelectorAll('a, button').forEach((f) => { f.tabIndex = visible ? 0 : -1; });
    });
    [...dotsWrap.children].forEach((d, i) => d.setAttribute('aria-current', String(i === index)));
    prev.disabled = index === 0;
    next.disabled = index >= maxIndex();
    if (announce) status.textContent = `Depoimento ${index + 1} de ${slides.length}`;
  };

  const go = (i) => { index = Math.max(0, Math.min(i, maxIndex())); update(true); };

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });

  // Gesto de arrastar no celular
  let startX = null;
  track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  let lastPerView = perView();
  window.addEventListener('resize', () => {
    if (perView() === lastPerView) return;
    lastPerView = perView();
    renderDots();
    go(index);
  });

  renderDots();
  update(false);
})();
