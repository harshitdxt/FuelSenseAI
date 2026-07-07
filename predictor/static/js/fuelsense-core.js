/* ===========================================================
   FuelSense AI — Core JS
   fuelsense-core.js

   Scope (per project structure — do not add anything outside this list):
   Smooth Scroll · Navbar · CountUp · Ripple · Reveal Animation ·
   Mouse Glow · Utility Functions · Loading Helpers

   Dashboard-specific logic → dashboard/dashboard.js
   Prediction logic         → dashboard/predict.js
   Chart.js setup           → charts/chart.js
   Reusable animation utils → utils/animation.js
   =========================================================== */

const FuelSenseCore = (function () {

  /* ---------------- Utility Functions ---------------- */
  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, limit = 200) {
    let inThrottle = false;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /* ---------------- Smooth Scroll ---------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const headerOffset = 88;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ---------------- Navbar ---------------- */
  function initNavbar() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    // Shrink / add elevation once the page has scrolled a bit
    const onScroll = throttle(() => {
      if (window.scrollY > 12) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, 100);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu toggle (expects an element with .nav-toggle and .nav-links)
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        toggle.classList.toggle('open');
      });
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.classList.remove('open');
        });
      });
    }
  }

  /* ---------------- CountUp ---------------- */
  function countUp(el, opts = {}) {
    const target = parseFloat(opts.to ?? el.dataset.count ?? '0');
    const from = parseFloat(opts.from ?? el.dataset.from ?? '0');
    const decimals = opts.decimals ?? parseInt(el.dataset.decimals || '0', 10);
    const prefix = opts.prefix ?? el.dataset.prefix ?? '';
    const suffix = opts.suffix ?? el.dataset.suffix ?? '';
    const duration = opts.duration ?? 1200;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCountUpOnView() {
    const els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  /* ---------------- Ripple ---------------- */
  function initRipple() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  /* ---------------- Reveal Animation ---------------- */
  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------------- Mouse Glow ---------------- */
  function initMouseGlow() {
    const glow = document.querySelector('.mouse-glow');
    if (!glow) return;
    window.addEventListener('mousemove', (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
  }

  /* ---------------- Loading Helpers ---------------- */
  function showLoading(el) {
    if (!el) return;
    el.dataset.prevContent = el.innerHTML;
    el.classList.add('skeleton');
    el.style.color = 'transparent';
  }

  function hideLoading(el) {
    if (!el) return;
    el.classList.remove('skeleton');
    el.style.color = '';
    if (el.dataset.prevContent !== undefined) {
      el.innerHTML = el.dataset.prevContent;
      delete el.dataset.prevContent;
    }
  }

  function setButtonBusy(btn, busy, busyLabel = 'Working…') {
    if (!btn) return;
    if (busy) {
      btn.dataset.prevLabel = btn.innerHTML;
      btn.innerHTML = busyLabel;
      btn.disabled = true;
    } else {
      if (btn.dataset.prevLabel) btn.innerHTML = btn.dataset.prevLabel;
      btn.disabled = false;
    }
  }

  /* ---------------- Init ---------------- */
  function init() {
    initSmoothScroll();
    initNavbar();
    initReveal();
    initCountUpOnView();
    initRipple();
    initMouseGlow();
  }

  return {
    init,
    countUp,
    initReveal,
    initCountUpOnView,
    showLoading,
    hideLoading,
    setButtonBusy,
    debounce,
    throttle,
    clamp,
  };
})();

document.addEventListener('DOMContentLoaded', FuelSenseCore.init);