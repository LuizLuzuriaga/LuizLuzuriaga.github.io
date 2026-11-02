(function () {
    var root = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) root.classList.add('reduced');
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

    // --- Entradas: cada parte de la sección sube escalonada, una sola vez ---
    var revealed = document.querySelectorAll('[data-r]');
    revealed.forEach(function (el, i) {
        var siblings = el.parentElement.querySelectorAll(':scope > [data-r]');
        el.style.setProperty('--d', Math.max(0, [].indexOf.call(siblings, el)) * 75 + 'ms');
    });
    if ('IntersectionObserver' in window && !reduced) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
            });
        }, { threshold: 0.15 });
        revealed.forEach(function (el) { io.observe(el); });
    } else {
        revealed.forEach(function (el) { el.classList.add('in'); });
    }

    // --- Proyectos: la imagen de la derecha sigue a la fila elegida ---
    var imgs = document.querySelectorAll('.preview img');
    var links = document.querySelectorAll('#ledger a');
    var current = links[0];
    links[0].classList.add('is-on');
    function show(a) {
        if (!a || a === current) return;
        current = a;
        var i = [].indexOf.call(links, a);
        links.forEach(function (l) { l.classList.toggle('is-on', l === a); });
        imgs.forEach(function (m, k) { m.classList.toggle('is-on', k === i); });
    }
    links.forEach(function (a) {
        a.addEventListener('pointerenter', function () { show(a); });
        a.addEventListener('focus', function () { show(a); });
    });
    // Las capturas restantes se cargan en reposo: así la primera pasada por la lista no enseña un hueco gris.
    function warm() { imgs.forEach(function (m) { m.loading = 'eager'; }); }
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1500);

    // --- Cuenta atrás del examen de Simulación (la misma fecha de la agenda del atlas) ---
    var exam = document.getElementById('exam');
    var days = Math.round((new Date('2026-11-11T00:00') - new Date(new Date().toDateString())) / 864e5);
    if (days >= 0) {
        exam.hidden = false;
        exam.textContent = 'Examen de Simulación el 11 de noviembre: ' +
            (days === 0 ? 'es hoy' : days === 1 ? 'falta 1 día' : 'faltan ' + days + ' días') +
            '. Ese tema late en el atlas.';
    }

    // --- La esfera crece con el scroll hasta cubrirlo todo ---
    if (reduced) return;
    var section = document.querySelector('.sphere');
    var orb = document.getElementById('orb');
    var a = document.getElementById('s-a');
    var b = document.getElementById('s-b');
    var enter = document.getElementById('enter');
    var ticking = false;
    var ease = function (t) { return t * t * (3 - 2 * t); };

    // La geometría del orbe solo cambia al redimensionar: se mide una vez, no en cada fotograma de scroll.
    var d, far;
    function measure() {
        var vh = window.innerHeight, vw = window.innerWidth;
        d = orb.offsetWidth;
        var cx = orb.offsetLeft + d / 2, cy = orb.offsetTop + d / 2;
        far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy)) * 2;
    }
    measure();

    function frame() {
        ticking = false;
        var rect = section.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = clamp(-rect.top / (rect.height - vh), 0, 1);

        var grow = clamp((p - 0.06) / 0.5, 0, 1);
        var scale = 1 + (far / d - 1) * ease(grow) * 1.02;
        // el orbe llega a la página desde abajo y respira un poco antes de crecer
        orb.style.transform = 'scale(' + scale.toFixed(4) + ')';

        a.style.opacity = String(clamp(1 - (p - 0.1) / 0.2, 0, 1));
        var inB = clamp((p - 0.56) / 0.12, 0, 1);
        b.style.opacity = String(inB);
        b.style.transform = 'translateY(' + ((1 - inB) * 28).toFixed(1) + 'px)';
        var on = inB > 0.05;
        b.style.visibility = on ? 'visible' : 'hidden';
        a.style.visibility = p > 0.3 ? 'hidden' : 'visible';
        enter.tabIndex = on ? 0 : -1;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    frame();
})();
