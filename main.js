(function () {
    var root = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) root.classList.add('reduced');
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

    // --- Entradas: cada parte de la sección sube escalonada, una sola vez ---
    var revealed = document.querySelectorAll('[data-r]');
    revealed.forEach(function (el) {
        var siblings = el.parentElement.querySelectorAll(':scope > [data-r]');
        el.style.setProperty('--d', Math.max(0, [].indexOf.call(siblings, el)) * 75 + 'ms');
    });
    if ('IntersectionObserver' in window && !reduced) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
            });
        }, { threshold: 0.12 });
        revealed.forEach(function (el) { io.observe(el); });
    } else {
        revealed.forEach(function (el) { el.classList.add('in'); });
    }

    // --- Barra fija: aparece cuando la portada queda atrás ---
    var bar = document.getElementById('bar');
    var hero = document.querySelector('.hero');
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
            bar.classList.toggle('on', !es[0].isIntersecting);
        }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' }).observe(hero);
    }

    // --- Portada: la captura cambia despacio, como la luz de una sala ---
    var room = document.querySelectorAll('.room img');
    var ri = 0, timer = null;
    function nextRoom() {
        room[ri].classList.remove('is-on');
        ri = (ri + 1) % room.length;
        room[ri].classList.add('is-on');
    }
    function startRoom() { if (!timer && !reduced) timer = setInterval(nextRoom, 6500); }
    function stopRoom() { clearInterval(timer); timer = null; }
    document.addEventListener('visibilitychange', function () { document.hidden ? stopRoom() : startRoom(); });
    startRoom();

    // --- Proyectos: el lomo elegido se abre y enseña su captura ---
    var items = document.querySelectorAll('#shelf li');
    var open = items[0], intent = null;
    function show(li) {
        if (li === open) return;
        open.classList.remove('is-on');
        li.classList.add('is-on');
        open = li;
    }
    items.forEach(function (li) {
        var a = li.querySelector('a');
        li.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'touch') return;
            clearTimeout(intent);
            intent = setTimeout(function () { show(li); }, 90);
        });
        li.addEventListener('pointerleave', function () { clearTimeout(intent); });
        a.addEventListener('focus', function () { show(li); });
    });
    // Las capturas restantes se cargan en reposo: así el primer lomo que se abre no enseña un hueco.
    function warm() { document.querySelectorAll('img[loading="lazy"]').forEach(function (m) { m.loading = 'eager'; }); }
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1500);

    // --- Cuenta atrás del examen de Simulación (la misma fecha de la agenda del atlas) ---
    var exam = document.getElementById('exam');
    var tab = document.getElementById('exam-tab');
    var days = Math.round((new Date('2026-11-11T00:00') - new Date(new Date().toDateString())) / 864e5);
    if (days >= 0) {
        var when = days === 0 ? 'es hoy' : days === 1 ? 'falta 1 día' : 'faltan ' + days + ' días';
        exam.textContent = 'Examen de Simulación el 11 de noviembre: ' + when + '. Ese tema late en el atlas.';
        tab.textContent = 'Examen de Simulación: ' + when;
        tab.hidden = false;
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
        orb.style.transform = 'scale(' + (1 + (far / d - 1) * ease(grow) * 1.02).toFixed(4) + ')';

        a.style.opacity = String(clamp(1 - (p - 0.1) / 0.2, 0, 1));
        var inB = clamp((p - 0.56) / 0.14, 0, 1);
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
