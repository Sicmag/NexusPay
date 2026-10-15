// js/theme.js
// Modo oscuro de NexusPay

(function() {
  'use strict';

  const STORAGE_KEY = 'nexuspay_tema';

  // Aplicar el tema guardado al cargar
  function aplicarTemaGuardado() {
    const tema = localStorage.getItem(STORAGE_KEY) || 'claro';
    if (tema === 'oscuro') {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    }
    actualizarLabelTema();
  }

  // Alternar entre claro y oscuro
  function toggleTema() {
    const esOscuro = document.body.classList.contains('dark-mode');
    if (esOscuro) {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem(STORAGE_KEY, 'claro');
    } else {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem(STORAGE_KEY, 'oscuro');
    }
    actualizarLabelTema();
  }

  // Actualizar el texto del boton
  function actualizarLabelTema() {
    const label = document.getElementById('themeToggleLabel');
    if (!label) return;
    const esOscuro = document.body.classList.contains('dark-mode');
    label.textContent = esOscuro ? 'Modo claro' : 'Modo oscuro';
  }

  // Ejecutar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTemaGuardado);
  } else {
    aplicarTemaGuardado();
  }

  // Exponer globalmente para los onclick
  window.toggleTema = toggleTema;
  window.aplicarTemaGuardado = aplicarTemaGuardado;

})();