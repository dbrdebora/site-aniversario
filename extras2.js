/* ==========================================================================
   EXTRAS 2 — carregue DEPOIS do script.js e do extras.js (todos com "defer")
   ========================================================================== */

/* ---------- CONFIGURE AQUI ---------- */
const BACK_PHRASE = 'Que venham mais 21 razões pra brilhar. Com todo o meu carinho.';
const STICKERS = []; // vazio = sem adesivos flutuantes

/* ---------- 1. SUMÁRIO ---------- */
(function toc() {
    const items = [
        ['capa', '.hero-cover', 'Capa'],
        ['cover-story', '.spread', 'Cover Story'],
        ['soundtrack', '#music-card', 'Soundtrack'],
        ['game', '.game-card', 'Game'],
        ['galeria', '.gallery-card', 'Galeria']
    ];
    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'Sumário da revista');

    const io = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                nav.querySelectorAll('a').forEach((a) =>
                    a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
            });
        }, { rootMargin: '-45% 0px -45% 0px' })
        : null;

    items.forEach(([id, selector, label]) => {
        const target = document.querySelector(selector);
        if (!target) return;
        if (!target.id) target.id = id;
        const a = document.createElement('a');
        a.href = '#' + target.id;
        a.textContent = label;
        nav.appendChild(a);
        if (io) io.observe(target);
    });
    document.body.appendChild(nav);
})();

/* ---------- 2. GALERIA SCRAPBOOK + ADESIVOS ---------- */
(function scrapbook() {
    const mosaic = $('gallery');
    if (!mosaic) return;
    mosaic.classList.add('scrap');

    const hint = document.querySelector('.gallery-card .hint');
    if (hint && STICKERS.length) hint.textContent = 'arraste os adesivos · toque nas fotos';

    STICKERS.forEach((emoji, i) => {
        const s = document.createElement('span');
        s.className = 'drag-sticker';
        s.textContent = emoji;
        s.setAttribute('aria-hidden', 'true');
        s.style.left = (6 + i * 19) + '%';
        s.style.top = (i % 2 ? 62 : 4) + '%';
        s.style.setProperty('--rot', (i % 2 ? -12 : 10) + 'deg');
        mosaic.appendChild(s);

        let offX = 0, offY = 0, dragging = false;
        s.addEventListener('pointerdown', (e) => {
            dragging = true;
            s.setPointerCapture(e.pointerId);
            s.classList.add('dragging');
            const r = s.getBoundingClientRect();
            offX = e.clientX - r.left;
            offY = e.clientY - r.top;
        });
        s.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const m = mosaic.getBoundingClientRect();
            const x = Math.min(Math.max(e.clientX - m.left - offX, 0), m.width - s.offsetWidth);
            const y = Math.min(Math.max(e.clientY - m.top - offY, 0), m.height - s.offsetHeight);
            s.style.left = x + 'px';
            s.style.top = y + 'px';
        });
        const stop = () => { dragging = false; s.classList.remove('dragging'); };
        s.addEventListener('pointerup', stop);
        s.addEventListener('pointercancel', stop);
    });
})();

/* ---------- 3. CONTRACAPA ---------- */
(function backCover() {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;

    // código de barras (padrão fixo, só visual)
    const pattern = [2,1,1,3,1,2,2,1,3,1,1,2,1,1,3,2,1,2,1,1,2,3,1,1,2,1,3,1,2,2,1,1,3,1,2,1,1,2,2,3,1,1,2,1,1,3,2,1];
    let x = 0, bars = '';
    pattern.forEach((w, i) => {
        if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="56" fill="#111"/>`;
        x += w;
    });

    const sec = document.createElement('section');
    sec.className = 'back-cover';
    sec.setAttribute('aria-label', 'Contracapa');
    sec.innerHTML =
        '<p class="bc-kicker">NEXT ISSUE</p>' +
        '<h2>Próxima edição:<br><em>22 anos</em></h2>' +
        '<p class="bc-phrase"></p>' +
        `<div class="barcode"><svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>` +
        '<span>0021 · 2026</span></div>';
    sec.querySelector('.bc-phrase').textContent = BACK_PHRASE;
    footer.before(sec);
})();

/* ---------- 4. EQUALIZADOR QUE DANÇA COM A MÚSICA ---------- */
(function realEqualizer() {
    // Só funciona com o site hospedado (http/https). Abrindo o arquivo direto
    // no computador (file://) o navegador deixaria a música muda, então não ativamos.
    if (!location.protocol.startsWith('http') || prefersReducedMotion) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const eq = $('eq');
    const bars = [...eq.children];
    let ctx = null, analyser = null, data = null, raf = null;

    function setup() {
        ctx = new AC();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        data = new Uint8Array(analyser.frequencyBinCount);
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        eq.classList.add('real');
    }

    function draw() {
        analyser.getByteFrequencyData(data);
        bars.forEach((bar, i) => {
            const v = data[i + 1] / 255;
            bar.style.transform = `scaleY(${Math.max(0.12, Math.pow(v, 1.3))})`;
        });
        raf = requestAnimationFrame(draw);
    }

    audio.addEventListener('play', () => {
        if (!ctx) setup();
        ctx.resume();
        if (!raf) draw();
    });
    audio.addEventListener('pause', () => {
        cancelAnimationFrame(raf);
        raf = null;
        bars.forEach((b) => { b.style.transform = ''; });
    });
})();