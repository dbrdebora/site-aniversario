/* ==========================================================================
   EXTRAS — carregue DEPOIS do script.js (ambos com "defer")
   ========================================================================== */

/* ---------- CONFIGURE AQUI ---------- */
const SECRET_MESSAGE = 'Suzana, escreva aqui a sua mensagem secreta (pode ser longa). Só quem descobre o segredo lê isso. 🤍';
const HEART_MESSAGES = [
    'Você achou o primeiro segredo 🤍',
    'Continua procurando… tem mais 👀',
    'Dica: clique 5 vezes no VOGUE ✨'
];
const PLAYLIST = [
    { title: 'Angel', artist: 'Massive Attack', meta: 'Mezzanine · 1998', src: 'assets/audio/audio-massive-attack-angel_[cut_312sec].mp3' }
    // Adicione mais músicas aqui, ex.:
    // { title: 'Nome', artist: 'Artista', meta: 'Álbum · Ano', src: 'assets/audio/musica2.mp3' },
];
const PLAY_MUSIC_ON_OPEN = true; // toca a música ao abrir a capa

/* ---------- AVISO (toast) ---------- */
const toast = document.createElement('div');
toast.className = 'toast';
toast.setAttribute('role', 'status');
document.body.appendChild(toast);
let toastTimer;
function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ---------- 1. ABERTURA ---------- */
(function intro() {
    let seen = false;
    try { seen = sessionStorage.getItem('intro-seen') === '1'; } catch (e) {}
    if (seen) return;

    const el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Abrir a revista');
    el.innerHTML =
        '<div class="intro-half intro-l"></div><div class="intro-half intro-r"></div>' +
        '<div class="intro-center"><small>SPECIAL EDITION • Nº 21</small>' +
        '<h1 class="vogue-logo">VOGUE</h1><small>SUZANA’S 21st EDITION</small>' +
        '<span class="intro-hint">TOQUE PARA ABRIR</span></div>';
    document.body.append(el);
    document.body.classList.add('locked');
    el.focus();

    function open() {
        el.removeEventListener('click', open);
        el.classList.add('open');
        if (PLAY_MUSIC_ON_OPEN) audio.play().catch(() => {});
        try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
        setTimeout(() => { el.remove(); document.body.classList.remove('locked'); }, 1300);
    }
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
})();

/* ---------- 2. EASTER EGGS ---------- */
// (a) Clicar 5x no logo VOGUE abre a mensagem secreta
(function secretLetter() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Mensagem secreta');
    modal.innerHTML = '<div class="modal-content"><button type="button" class="close-btn" aria-label="Fechar">×</button>' +
        '<h2>🤫 Você descobriu o segredo</h2><p class="secret-letter"></p></div>';
    modal.querySelector('.secret-letter').textContent = SECRET_MESSAGE;
    document.body.appendChild(modal);

    const close = () => { modal.hidden = true; };
    modal.querySelector('.close-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', (e) => { trapFocus(modal, e); if (e.key === 'Escape') close(); });

    let clicks = 0, resetTimer;
    document.querySelector('.vogue-header .vogue-logo').addEventListener('click', () => {
        clicks++;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { clicks = 0; }, 2500);
        if (clicks >= 5) {
            clicks = 0;
            modal.hidden = false;
            modal.querySelector('.close-btn').focus();
            launchConfetti();
        }
    });
})();

// (b) O coraçãozinho da foto dá dicas
(function heartHints() {
    const heart = document.querySelector('.photo-note');
    if (!heart) return;
    let i = 0;
    heart.style.cursor = 'pointer';
    heart.style.pointerEvents = 'auto';
    heart.addEventListener('click', () => showToast(HEART_MESSAGES[i++ % HEART_MESSAGES.length]));
})();

/* ---------- 3. PLAYLIST (só aparece se tiver 2+ músicas) ---------- */
(function playlist() {
    if (PLAYLIST.length < 2) return;
    let current = 0;
    const title = document.querySelector('.track h3');
    const artist = document.querySelector('.track p');
    const metaChip = document.querySelector('.chips span:last-child');
    const label = document.querySelector('.vinyl-label span');

    function load(index, autoplay) {
        current = (index + PLAYLIST.length) % PLAYLIST.length;
        const t = PLAYLIST[current];
        audio.src = t.src;
        title.textContent = t.title;
        artist.textContent = t.artist;
        metaChip.textContent = t.meta;
        label.textContent = t.title.toUpperCase();
        audioMsg.textContent = '';
        if (autoplay) audio.play().catch(() => {});
    }

    const nav = document.createElement('div');
    nav.className = 'track-nav';
    [['⏮', 'Música anterior', -1], ['⏭', 'Próxima música', 1]].forEach(([icon, aria, dir]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = icon; b.setAttribute('aria-label', aria);
        b.addEventListener('click', () => load(current + dir, !audio.paused));
        nav.appendChild(b);
    });
    document.querySelector('.player-controls').prepend(nav);
    audio.addEventListener('ended', () => load(current + 1, true));
})();

/* ---------- 4. EFEITOS: tilt 3D nas fotos + brilhos no mouse ---------- */
(function hoverEffects() {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.photo-tile, .spread-photo').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            el.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    let last = 0;
    window.addEventListener('pointermove', (e) => {
        const now = performance.now();
        if (e.pointerType !== 'mouse' || now - last < 70) return;
        last = now;
        const s = document.createElement('span');
        s.className = 'spark';
        s.textContent = '✦';
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 900);
    }, { passive: true });
})();

/* ---------- 5. VÍDEOS: tocam sozinhos (mudos) só quando aparecem na tela ---------- */
(function lazyVideos() {
    const videos = document.querySelectorAll('video[data-autoplay]');
    if (!videos.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) en.target.play().catch(() => {});
            else en.target.pause();
        });
    }, { threshold: 0.35 });
    videos.forEach((v) => io.observe(v));
})();