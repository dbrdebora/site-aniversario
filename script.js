/* ==========================================================================
   UTILIDADES
   ========================================================================== */
const $ = (id) => document.getElementById(id);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mantém o foco dentro de um modal enquanto ele está aberto
function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.disabled && el.getClientRects().length > 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

/* ==========================================================================
   1. PLAYER DE MÚSICA (vinil + equalizador)
   ========================================================================== */
const audio = $('audio-player');
const playBtn = $('play-btn');
const seek = $('seek');
const timeCurrent = $('time-current');
const timeTotal = $('time-total');
const audioMsg = $('audio-msg');
const musicCard = $('music-card');
const playerStatus = $('player-status');

// Cria as barrinhas do equalizador com alturas e velocidades diferentes
(function buildEqualizer() {
    const eq = $('eq');
    for (let i = 0; i < 34; i++) {
        const bar = document.createElement('span');
        bar.style.setProperty('--d', `${(0.45 + Math.random() * 0.9).toFixed(2)}s`);
        bar.style.setProperty('--h', `${Math.round(35 + Math.random() * 65)}%`);
        bar.style.animationDelay = `-${(Math.random() * 1.2).toFixed(2)}s`;
        eq.appendChild(bar);
    }
})();

function updateSeekVisual() {
    seek.style.setProperty('--pct', `${seek.value}%`);
}

function setPlayingUI(isPlaying) {
    playBtn.textContent = isPlaying ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', isPlaying ? 'Pausar música' : 'Tocar música');
    musicCard.classList.toggle('playing', isPlaying);
    playerStatus.textContent = isPlaying ? 'TOCANDO AGORA' : 'PAUSADA';
}

playBtn.addEventListener('click', async () => {
    audioMsg.textContent = '';
    if (audio.paused) {
        try {
            await audio.play();
        } catch (err) {
            audioMsg.textContent = 'Não foi possível tocar a música. Verifique se o arquivo está em assets/audio/.';
        }
    } else {
        audio.pause();
    }
});

audio.addEventListener('play', () => setPlayingUI(true));
audio.addEventListener('pause', () => setPlayingUI(false));
audio.addEventListener('ended', () => {
    setPlayingUI(false);
    seek.value = 0;
    updateSeekVisual();
    timeCurrent.textContent = '0:00';
});
audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration);
});
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    seek.value = (audio.currentTime / audio.duration) * 100;
    updateSeekVisual();
    timeCurrent.textContent = formatTime(audio.currentTime);
});
audio.addEventListener('error', () => {
    audioMsg.textContent = 'Arquivo de áudio não encontrado.';
});
seek.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    updateSeekVisual();
});

/* ==========================================================================
   2. JOGO DA MEMÓRIA
   ========================================================================== */
const MEMORY_PHOTOS = [
    { src: 'assets/images/suzi-1.jpeg',        alt: 'Suzana em um momento icônico' },
    { src: 'assets/images/suzi-2.jpeg',        alt: 'Suzana exibindo um look' },
    { src: 'assets/images/suzi-3.jpeg',        alt: 'Suzana com energia de protagonista' },
    { src: 'assets/images/suzi-4.jpeg',        alt: 'Suzana com energia de protagonista' },
    { src: 'assets/images/suzi-5.jpeg',        alt: 'Suzana com energia de protagonista' },
    { src: 'assets/images/suzi-6.jpeg',        alt: 'Suzana com energia de protagonista' },
  
];
const TOTAL_PAIRS = MEMORY_PHOTOS.length;

const grid = $('memory-grid');
const movesEl = $('moves');
const timerEl = $('timer');
const pairsEl = $('pairs');
const gameStatus = $('game-status');

let firstCard = null;
let secondCard = null;
let boardLocked = false;
let moves = 0;
let matchedPairs = 0;
let seconds = 0;
let timerId = null;
let winTimeout = null;
let mismatchTimeout = null;

function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function updateGameStats() {
    movesEl.textContent = moves;
    timerEl.textContent = formatTime(seconds);
    pairsEl.textContent = `${matchedPairs}/${TOTAL_PAIRS}`;
}

function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
        seconds++;
        timerEl.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerId);
    timerId = null;
}

function setCardLabel(card, state) {
    const n = card.dataset.index;
    const alt = card.dataset.alt;
    if (state === 'hidden') card.setAttribute('aria-label', `Carta ${n}, virada para baixo`);
    if (state === 'shown') card.setAttribute('aria-label', `Carta ${n}: ${alt}`);
    if (state === 'matched') card.setAttribute('aria-label', `Carta ${n}: ${alt} (par encontrado)`);
}

function buildBoard() {
    grid.innerHTML = '';
    const deck = shuffle([...MEMORY_PHOTOS, ...MEMORY_PHOTOS].map((photo, i) => ({ ...photo, pair: MEMORY_PHOTOS.indexOf(photo) })));

    deck.forEach((card, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mcard';
        btn.dataset.pair = card.pair;
        btn.dataset.index = i + 1;
        btn.dataset.alt = card.alt;

        const inner = document.createElement('span');
        inner.className = 'mcard-inner';

        const back = document.createElement('span');
        back.className = 'mcard-face mcard-back';
        back.textContent = 'V';
        back.setAttribute('aria-hidden', 'true');

        const front = document.createElement('span');
        front.className = 'mcard-face mcard-front';
        const img = document.createElement('img');
        img.src = card.src;
        img.alt = '';
        img.decoding = 'async';
        front.appendChild(img);

        inner.append(back, front);
        btn.appendChild(inner);
        setCardLabel(btn, 'hidden');
        btn.addEventListener('click', () => flipCard(btn));
        grid.appendChild(btn);
    });
}

function flipCard(card) {
    if (boardLocked) return;
    if (card.classList.contains('flipped')) return;

    startTimer();
    card.classList.add('flipped');
    setCardLabel(card, 'shown');

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    moves++;
    updateGameStats();
    checkMatch();
}

function checkMatch() {
    const isMatch = firstCard.dataset.pair === secondCard.dataset.pair;

    if (isMatch) {
        [firstCard, secondCard].forEach((c) => {
            c.classList.add('matched');
            setCardLabel(c, 'matched');
        });
        matchedPairs++;
        updateGameStats();
        gameStatus.textContent = matchedPairs === TOTAL_PAIRS ? 'Você encontrou todas! 👑' : 'Par encontrado! ✨';
        firstCard = null;
        secondCard = null;

        if (matchedPairs === TOTAL_PAIRS) {
            stopTimer();
            winTimeout = setTimeout(showRewardModal, 900);
        }
        return;
    }

    boardLocked = true;
    gameStatus.textContent = 'Não foi dessa vez… tente de novo.';
    mismatchTimeout = setTimeout(() => {
        [firstCard, secondCard].forEach((c) => {
            c.classList.remove('flipped');
            setCardLabel(c, 'hidden');
        });
        firstCard = null;
        secondCard = null;
        boardLocked = false;
    }, 950);
}

function resetGame() {
    clearTimeout(winTimeout);
    clearTimeout(mismatchTimeout);
    stopTimer();
    firstCard = null;
    secondCard = null;
    boardLocked = false;
    moves = 0;
    matchedPairs = 0;
    seconds = 0;
    gameStatus.textContent = '';
    updateGameStats();
    buildBoard();
}

$('restart-btn').addEventListener('click', resetGame);

/* ==========================================================================
   3. MODAL DE RECOMPENSA (SELO)
   ========================================================================== */
const rewardModal = $('reward-modal');
let lastFocusedBeforeModal = null;

function getGrade() {
    // 6 pares: o mínimo possível é 6 jogadas
    if (moves <= 10) return { grade: 'A+', msg: 'Memória de elefante e olhar de editora de moda. Nota máxima! 👑' };
    if (moves <= 16) return { grade: 'A',  msg: 'Arrasou! Você conhece cada foto dessa edição. ✨' };
    return { grade: 'B+', msg: 'Missão cumprida! Cada tentativa valeu a pena. 💛' };
}

function showRewardModal() {
    const { grade, msg } = getGrade();
    $('reward-msg').textContent = msg;
    $('reward-stats').textContent = `${moves} jogadas • ${formatTime(seconds)}`;

    lastFocusedBeforeModal = document.activeElement;
    rewardModal.hidden = false;
    $('modal-close').focus();
    launchConfetti();
}

function closeModal() {
    rewardModal.hidden = true;
    if (lastFocusedBeforeModal && document.contains(lastFocusedBeforeModal)) lastFocusedBeforeModal.focus();
}

$('modal-close').addEventListener('click', closeModal);
$('retry-btn').addEventListener('click', () => {
    closeModal();
    resetGame();
});
rewardModal.addEventListener('click', (e) => {
    if (e.target === rewardModal) closeModal();
});
rewardModal.addEventListener('keydown', (e) => trapFocus(rewardModal, e));

/* ==========================================================================
   4. LIGHTBOX
   ========================================================================== */
const lightbox = $('lightbox');
const lightboxImg = $('lightbox-img');
const lightboxCaption = $('lightbox-caption');
const galleryItems = [...document.querySelectorAll('#gallery .photo-tile')];
let currentPhoto = 0;
let lastFocusedBeforeLightbox = null;

function showPhoto(index) {
    currentPhoto = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentPhoto];
    lightboxImg.src = item.dataset.src;
    lightboxImg.alt = item.querySelector('img').alt;
    lightboxCaption.textContent = item.dataset.caption;
}

function openLightbox(index) {
    lastFocusedBeforeLightbox = document.activeElement;
    showPhoto(index);
    lightbox.hidden = false;
    $('lb-close').focus();
}

function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    if (lastFocusedBeforeLightbox) lastFocusedBeforeLightbox.focus();
}

galleryItems.forEach((item, index) => item.addEventListener('click', () => openLightbox(index)));
$('lb-close').addEventListener('click', closeLightbox);
$('lb-prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
$('lb-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});
lightbox.addEventListener('keydown', (e) => trapFocus(lightbox, e));

document.addEventListener('keydown', (e) => {
    if (!lightbox.hidden) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPhoto(currentPhoto - 1);
        if (e.key === 'ArrowRight') showPhoto(currentPhoto + 1);
    } else if (!rewardModal.hidden && e.key === 'Escape') {
        closeModal();
    }
});

let touchStartX = null;
lightbox.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) showPhoto(currentPhoto + (diff < 0 ? 1 : -1));
    touchStartX = null;
}, { passive: true });

/* ==========================================================================
   5. CONFETE
   ========================================================================== */
function launchConfetti() {
    if (prefersReducedMotion) return;
    const canvas = $('confetti');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#4A0E17', '#6B1C27', '#cca625', '#ffd700', '#E8DDD3', '#FAFAFA'];
    const pieces = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: 2 + Math.random() * 3.5,
        speedX: -1.5 + Math.random() * 3,
        rotation: Math.random() * Math.PI,
        spin: -0.15 + Math.random() * 0.3
    }));

    const start = performance.now();
    function frame(now) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach((p) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.spin;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        if (now - start < 3800) {
            requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    requestAnimationFrame(frame);
}

/* ==========================================================================
   6. ANIMAÇÕES DE ENTRADA, CONTADORES E ROLAGEM
   ========================================================================== */
function animateCount(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (prefersReducedMotion) {
        el.textContent = target + suffix;
        return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function setupReveal() {
    const cards = document.querySelectorAll('.reveal');
    const counters = document.querySelectorAll('[data-count]');

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        cards.forEach((c) => c.classList.add('visible'));
        return;
    }

    document.documentElement.classList.add('js');
    counters.forEach((el) => { el.textContent = '0' + (el.dataset.suffix || ''); });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            entry.target.querySelectorAll('[data-count]').forEach(animateCount);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.15 });
    cards.forEach((c) => observer.observe(c));
}

// Barra de progresso + leve parallax na capa
const progressBar = $('scroll-progress');
const coverImg = $('cover-img');
let scrollTicking = false;

function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const progress = max > 0 ? doc.scrollTop / max : 0;
        progressBar.style.transform = `scaleX(${progress})`;
        if (!prefersReducedMotion && doc.scrollTop < 800) {
            coverImg.style.transform = `translateY(${doc.scrollTop * 0.06}px) scale(1.08)`;
        }
        scrollTicking = false;
    });
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */
setupReveal();
resetGame();
onScroll();