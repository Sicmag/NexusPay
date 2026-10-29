// js/theme.js
// Modo oscuro persistente con Cookies (no se borra al cerrar sesión)

(function() {
  'use strict';

  const COOKIE_NAME = 'nexuspay_tema';

  // Leer cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Guardar cookie (dura 1 año)
  function setCookie(name, value) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }

  // Aplicar el tema guardado al cargar
  function aplicarTemaGuardado() {
    let tema = getCookie(COOKIE_NAME);
    
    // Si no hay cookie, usar la preferencia del sistema operativo
    if (!tema) {
      const prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      tema = prefiereOscuro ? 'oscuro' : 'claro';
      setCookie(COOKIE_NAME, tema);
    }

    if (tema === 'oscuro') {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
    actualizarLabelTema();
  }

  // Alternar entre claro y oscuro
  function toggleTema() {
    const esOscuro = document.body.classList.contains('dark-mode');
    
    if (esOscuro) {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      setCookie(COOKIE_NAME, 'claro');
    } else {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      setCookie(COOKIE_NAME, 'oscuro');
    }
    actualizarLabelTema();
  }

  // Actualizar los íconos y textos en la interfaz
  function actualizarLabelTema() {
    const esOscuro = document.body.classList.contains('dark-mode');
    
    // Actualizar los botones de la app (Topbar)
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.textContent = esOscuro ? '☀️' : '🌙';
    });

    // Actualizar los textos del menú lateral
    const labelN = document.getElementById('themeToggleLabel-natural');
    const iconN = document.getElementById('themeIcon-natural');
    if (labelN) labelN.textContent = esOscuro ? 'Modo claro' : 'Modo oscuro';
    if (iconN) iconN.textContent = esOscuro ? '☀️' : '🌙';

    const labelE = document.getElementById('themeToggleLabel-emprendedor');
    const iconE = document.getElementById('themeIcon-emprendedor');
    if (labelE) labelE.textContent = esOscuro ? 'Modo claro' : 'Modo oscuro';
    if (iconE) iconE.textContent = esOscuro ? '☀️' : '🌙';
  }

  // Ejecutar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTemaGuardado);
  } else {
    aplicarTemaGuardado();
  }

  // Exponer globalmente
  window.toggleTema = toggleTema;
  window.aplicarTemaGuardado = aplicarTemaGuardado;

})();