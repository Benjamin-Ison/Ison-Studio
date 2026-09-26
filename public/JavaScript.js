// Año dinámico
document.getElementById('year').textContent = new Date().getFullYear();

// Menú móvil
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// Carruseles
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('[data-track]');
  const prev = carousel.querySelector('[data-prev]');
  const next = carousel.querySelector('[data-next]');
  const scrollBy = () => {
    const first = track.querySelector('*');
    if (!first) return 300;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || 16);
    return first.getBoundingClientRect().width + gap;
  };

  // If this is the #proyectos carousel (data-basis="42"), make it infinite by cloning
  if (carousel.dataset.basis === '42') {
    (function makeInfiniteByIndex(track){
      const cards = Array.from(track.querySelectorAll('.project-card'));
      if (cards.length === 0) return;

      // Use larger buffer
      const clonesCount = 3;

      // Clone last N to the start
      const headClones = cards.slice(-clonesCount).map(node => {
        const c = node.cloneNode(true);
        c.classList.add('clone');
        return c;
      });
      headClones.reverse().forEach(c => track.insertBefore(c, track.firstChild));

      // Clone first N to the end
      const tailClones = cards.slice(0, clonesCount).map(node => {
        const c = node.cloneNode(true);
        c.classList.add('clone');
        return c;
      });
      tailClones.forEach(c => track.appendChild(c));

      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 16);
      const itemWidth = () => {
        const item = track.querySelector('.project-card');
        return item ? Math.round(item.getBoundingClientRect().width + gap) : 0;
      };

      // index state
      let currentIndex = 0; // 0..cards.length-1
      let trackIndex = clonesCount + currentIndex; // includes clones
      let isAnimating = false;
      let scrollEndTimer = null;

      const setInstant = (idx) => {
        const w = itemWidth(); if (!w) return;
        track.style.scrollBehavior = 'auto';
        track.scrollTo({ left: idx * w });
        // restore smooth next frame
        requestAnimationFrame(() => { track.style.scrollBehavior = 'smooth'; });
      };

      const onScrollEnd = () => {
        isAnimating = false;
        const w = itemWidth(); if (!w) return;
        // determine nearest index
        const idx = Math.round(track.scrollLeft / w);
        trackIndex = idx;

        // If in clone zone, jump to equivalent real index
        if (trackIndex < clonesCount) {
          trackIndex += cards.length;
          setInstant(trackIndex);
        } else if (trackIndex >= clonesCount + cards.length) {
          trackIndex -= cards.length;
          setInstant(trackIndex);
        }
        currentIndex = (trackIndex - clonesCount + cards.length) % cards.length;
        // re-enable buttons
        try { prev.removeAttribute('disabled'); next.removeAttribute('disabled'); } catch(e){}
        // restart autoplay immediately after animation/adjustment, if available
        try { if (typeof startAutoplay === 'function') startAutoplay(); } catch(e){}
      };

      const smoothTo = (idx) => {
        const w = itemWidth(); if (!w) return;
        isAnimating = true;
        // start smooth scroll
        track.scrollTo({ left: idx * w, behavior: 'smooth' });
        // fallback timeout if 'scrollend' not supported
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => { onScrollEnd(); }, 600);
      };

      // Intercept button clicks in capture phase to prevent outer handlers
      // control functions reused by buttons and autoplay
      const goPrev = () => {
        if (isAnimating) return;
        try { prev.setAttribute('disabled',''); next.setAttribute('disabled',''); } catch(e){}
        trackIndex -= 1;
        smoothTo(trackIndex);
      };
      const goNext = () => {
        if (isAnimating) return;
        try { prev.setAttribute('disabled',''); next.setAttribute('disabled',''); } catch(e){}
        trackIndex += 1;
        smoothTo(trackIndex);
      };

      const handlePrev = (e) => { e.preventDefault(); e.stopPropagation(); stopAutoplay(); goPrev(); };
      const handleNext = (e) => { e.preventDefault(); e.stopPropagation(); stopAutoplay(); goNext(); };
      prev?.addEventListener('click', handlePrev, true);
      next?.addEventListener('click', handleNext, true);

      // Listen for scroll end via debounced scroll (covers manual drags)
      let scrollDebounce;
      track.addEventListener('scroll', () => {
        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(() => {
          // If an animation triggered it, let onScrollEnd handle; otherwise, treat as manual end
          if (!isAnimating) onScrollEnd();
        }, 120);
      }, { passive: true });

      // Also try to listen for native scrollend if available
      track.addEventListener('scrollend', () => { onScrollEnd(); });


      // Initialize position (no animation)
      const initPosition = () => {
        const w = itemWidth(); if (!w) return;
        trackIndex = clonesCount + currentIndex;
        setInstant(trackIndex);
      };
      window.addEventListener('load', initPosition);
      window.addEventListener('resize', () => { initPosition(); });

      // --- Autoplay logic ---
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let autoplayId = null;

      const startAutoplay = () => {
        if (prefersReduced) return;
        if (autoplayId) return;
        autoplayId = setInterval(() => {
          if (!isAnimating) {
            goNext();
          }
        }, 1500);
      };

      const stopAutoplay = () => {
        if (autoplayId) {
          clearInterval(autoplayId);
          autoplayId = null;
        }
      };

      // Start autoplay initially (unless reduced motion)
      startAutoplay();

    })(track);
  }

  prev?.addEventListener('click', () => track.scrollBy({ left: -scrollBy(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: scrollBy(), behavior: 'smooth' }));
});

// Captura de plan elegido
const planHidden = document.getElementById('plan');
const planBanner = document.getElementById('planSelected');
const planBannerName = document.getElementById('planSelectedName');
const planClearBtn = document.getElementById('planClear');

document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const planName = btn.dataset.plan;
    planHidden.value = planName;
    planBannerName.textContent = planName;
    planBanner.hidden = false;
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
  });
});

planClearBtn?.addEventListener('click', () => {
  planHidden.value = '';
  planBanner.hidden = true;
});

// Formulario de contacto con sistema de manejo de errores profesional
const form = document.getElementById('contactForm');
const msg = document.getElementById('formMsg');
const nombreInput = document.getElementById('nombre');
const apellidoInput = document.getElementById('apellido');
const whatsappInput = document.getElementById('whatsapp');
const mensajeInput = document.getElementById('mensaje');

// Restricción en tiempo real para el campo WhatsApp (solo números, máx 20 dígitos)
if (whatsappInput) {
  whatsappInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 20);
  });
}

// Limpiar clases de error al escribir en cualquier campo
[nombreInput, apellidoInput, whatsappInput, mensajeInput].forEach(input => {
  if (input) {
    input.addEventListener('input', () => {
      input.classList.remove('field-error');
      input.removeAttribute('aria-invalid');
    });
  }
});

// Resolución configurable de la URL del backend
function getBackendEndpoint() {
  if (window.APP_CONFIG && window.APP_CONFIG.API_URL) {
    return window.APP_CONFIG.API_URL;
  }
  const isLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.protocol === 'file:';
  return isLocal ? 'http://localhost:3000/api/contact' : '/api/contact';
}

let isSubmitting = false;

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Evitar envíos múltiples simultáneos
    if (isSubmitting) return;

    // Limpiar mensaje anterior y estados de error
    msg.textContent = '';
    msg.className = 'form-msg';
    [nombreInput, whatsappInput].forEach(el => {
      if (el) {
        el.classList.remove('field-error');
        el.removeAttribute('aria-invalid');
      }
    });

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const apellido = apellidoInput ? apellidoInput.value.trim() : '';
    const mensaje = mensajeInput ? mensajeInput.value.trim() : '';
    const plan = planHidden ? planHidden.value.trim() : '';
    const whatsapp = whatsappInput ? whatsappInput.value.trim() : '';

    // Validación del lado del cliente
    if (!nombre || nombre.length < 2) {
      msg.textContent = 'Por favor, ingresá tu nombre.';
      msg.className = 'form-msg err';
      if (nombreInput) {
        nombreInput.classList.add('field-error');
        nombreInput.setAttribute('aria-invalid', 'true');
        nombreInput.focus();
      }
      return;
    }

    if (!whatsapp || !/^[0-9]+$/.test(whatsapp) || whatsapp.length < 7 || whatsapp.length > 20) {
      msg.textContent = 'Ingresá un número de WhatsApp válido (solo números, entre 7 y 20 dígitos).';
      msg.className = 'form-msg err';
      if (whatsappInput) {
        whatsappInput.classList.add('field-error');
        whatsappInput.setAttribute('aria-invalid', 'true');
        whatsappInput.focus();
      }
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Enviar formulario →';
    const backendUrl = getBackendEndpoint();

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando...';
    }
    msg.textContent = 'Enviando solicitud...';
    msg.className = 'form-msg';

    // AbortController para timeout de 15 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log(`[Ison Studio] Enviando datos a: ${backendUrl}`);
      }

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nombre,
          apellido,
          whatsapp,
          plan,
          mensaje
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Verificar el tipo de contenido de la respuesta
      const contentType = response.headers.get('content-type') || '';
      let result = null;

      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResponse = await response.text();
        console.warn('[Ison Studio] La respuesta del servidor no fue JSON:', textResponse.slice(0, 150));
        throw new Error('El servidor devolvió un formato no válido. Por favor, intentá más tarde.');
      }

      if (!response.ok || !result || !result.success) {
        const serverErrorMsg = (result && result.message) ? result.message : `Error del servidor (${response.status}).`;
        throw new Error(serverErrorMsg);
      }

      // Respuesta exitosa
      msg.textContent = result.message || 'Mensaje enviado correctamente. Te contactaremos pronto.';
      msg.className = 'form-msg ok';
      form.reset();

      if (planBanner) planBanner.hidden = true;
      if (planHidden) planHidden.value = '';

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Ison Studio Form Error]:', error);

      let userFriendlyMessage = 'No se pudo enviar el formulario. Por favor, intentá nuevamente.';

      if (error.name === 'AbortError') {
        userFriendlyMessage = 'La solicitud tardó demasiado tiempo en responder. Verificá tu conexión e intentá nuevamente.';
      } else if (error.name === 'TypeError' || error.message === 'Failed to fetch' || error.message.includes('fetch')) {
        userFriendlyMessage = 'No se pudo conectar con el servidor. Verificá tu conexión a internet o que el backend esté activo.';
      } else if (error.message) {
        userFriendlyMessage = error.message;
      }

      msg.textContent = userFriendlyMessage;
      msg.className = 'form-msg err';

    } finally {
      clearTimeout(timeoutId);
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}


// Mostrar/ocultar botón WhatsApp al hacer scroll (opcional)
(function(){
  const wa = document.querySelector('.whatsapp-float');
  if(!wa) return;
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > lastY && y > 100) {
      wa.classList.add('hidden');
    } else {
      wa.classList.remove('hidden');
    }
    lastY = y <= 0 ? 0 : y;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }, {passive:true});
})();



