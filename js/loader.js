// js/loader.js
// Pantalla de carga con logo NexusPay

(function() {
  'use strict';

  const LOADER_ID = 'nexuspayLoader';
  const MIN_DURACION = 1200; // 1.2 segundos minimo para que se vea bien
  const inicio = Date.now();

  // ============ INYECTAR ESTILOS ============
  function inyectarEstilos() {
    if (document.getElementById('nexuspay-loader-styles')) return;
    const style = document.createElement('style');
    style.id = 'nexuspay-loader-styles';
    style.textContent = `
      #nexuspayLoader {
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: opacity 0.6s ease, visibility 0.6s ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      #nexuspayLoader.oculto {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* Logo */
      .nx-loader-logo {
        font-size: 42px;
        font-weight: 900;
        letter-spacing: -1.5px;
        color: #0F0F1E;
        margin-bottom: 32px;
        animation: nx-pulse 1.8s ease-in-out infinite;
      }
      .nx-loader-logo span {
        background: linear-gradient(135deg, #2563EB 0%, #10B981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* Icono animado */
      .nx-loader-icon {
        width: 70px;
        height: 70px;
        border-radius: 20px;
        background: linear-gradient(135deg, #2563EB 0%, #10B981 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        box-shadow: 0 20px 50px rgba(37,99,235,0.3);
        animation: nx-float 2.2s ease-in-out infinite;
      }
      .nx-loader-icon svg {
        width: 36px;
        height: 36px;
        stroke: #FFFFFF;
        stroke-width: 2.5;
        fill: none;
      }

      /* Texto debajo */
      .nx-loader-texto {
        font-size: 13px;
        color: #64748B;
        font-weight: 500;
        letter-spacing: 0.3px;
        margin-bottom: 24px;
      }

      /* Barra de progreso */
      .nx-loader-barra {
        width: 200px;
        height: 4px;
        background: #E2E8F0;
        border-radius: 100px;
        overflow: hidden;
        position: relative;
      }
      .nx-loader-barra::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 40%;
        background: linear-gradient(90deg, #2563EB, #10B981);
        border-radius: 100px;
        animation: nx-progress 1.2s ease-in-out infinite;
      }

      /* Animaciones */
      @keyframes nx-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.03); }
      }

      @keyframes nx-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      @keyframes nx-progress {
        0% { left: -40%; width: 40%; }
        50% { left: 30%; width: 50%; }
        100% { left: 100%; width: 40%; }
      }

      /* Modo oscuro */
      body.dark-mode #nexuspayLoader,
      html.dark-mode #nexuspayLoader {
        background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      }
      body.dark-mode .nx-loader-logo,
      html.dark-mode .nx-loader-logo {
        color: #F1F5F9;
      }
      body.dark-mode .nx-loader-texto,
      html.dark-mode .nx-loader-texto {
        color: #94A3B8;
      }
      body.dark-mode .nx-loader-barra,
      html.dark-mode .nx-loader-barra {
        background: #334155;
      }
    `;
    document.head.appendChild(style);
  }

  // ============ CREAR LOADER ============
  function crearLoader() {
    inyectarEstilos();

    const loader = document.createElement('div');
    loader.id = LOADER_ID;
    loader.innerHTML = `
      <div class="nx-loader-icon">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div class="nx-loader-logo">Nexus<span>Pay</span></div>
      <div class="nx-loader-texto">Cargando tu banco digital...</div>
      <div class="nx-loader-barra"></div>
    `;

    document.body.insertBefore(loader, document.body.firstChild);
  }

  // ============ OCULTAR LOADER ============
  function ocultarLoader() {
    const loader = document.getElementById(LOADER_ID);
    if (!loader) return;

    const transcurrido = Date.now() - inicio;
    const espera = Math.max(0, MIN_DURACION - transcurrido);

    setTimeout(function() {
      loader.classList.add('oculto');
      setTimeout(function() {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }, espera);
  }

  // ============ EJECUTAR ============
  // Insertar loader inmediatamente (antes de que cargue el DOM completo)
  if (document.body) {
    crearLoader();
  } else {
    document.addEventListener('DOMContentLoaded', crearLoader);
  }

  // Ocultar cuando la pagina este lista
  if (document.readyState === 'complete') {
    ocultarLoader();
  } else {
    window.addEventListener('load', ocultarLoader);
  }

  // Seguridad: si despues de 5 segundos no cargó, ocultarlo igual
  setTimeout(ocultarLoader, 5000);

})();