// js/toast.js
// Sistema de notificaciones flotantes (toasts) para NexusPay

(function() {
  'use strict';

  const CONTAINER_ID = 'toastContainer';

  function crearContenedor() {
    if (document.getElementById(CONTAINER_ID)) return;
    const div = document.createElement('div');
    div.id = CONTAINER_ID;
    div.style.cssText = 'position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
    document.body.appendChild(div);
  }

  function crearToast(tipo, titulo, mensaje, duracion) {
    crearContenedor();
    const contenedor = document.getElementById(CONTAINER_ID);

    const colores = {
      success: { bg: '#10B981', icono: '✅' },
      error:   { bg: '#EF4444', icono: '❌' },
      warning: { bg: '#F59E0B', icono: '⚠️' },
      info:    { bg: '#2563EB', icono: 'ℹ️' },
    };

    const { bg, icono } = colores[tipo] || colores.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${bg};
      color: #FFFFFF;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      min-width: 280px;
      max-width: 380px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      opacity: 0;
      transform: translateX(400px);
      transition: all 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      pointer-events: auto;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.5;
    `;

    toast.innerHTML = `
      <div style="font-size:20px; flex-shrink:0; line-height:1;">${icono}</div>
      <div style="flex:1;">
        <div style="font-weight:700; margin-bottom:2px;">${titulo}</div>
        ${mensaje ? '<div style="opacity:0.95; font-size:13px;">' + mensaje + '</div>' : ''}
      </div>
      <button style="background:none; border:none; color:#FFFFFF; cursor:pointer; opacity:0.7; font-size:18px; padding:0; margin-left:8px; line-height:1; font-family:inherit;">×</button>
    `;

    contenedor.appendChild(toast);

    // Boton cerrar
    toast.querySelector('button').addEventListener('click', function() {
      removerToast(toast);
    });

    // Animar entrada
    setTimeout(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 50);

    // Auto-remover
    const dur = duracion || 3500;
    setTimeout(function() {
      removerToast(toast);
    }, dur);
  }

  function removerToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  // Exponer globalmente
  window.toast = {
    success: function(titulo, mensaje) { crearToast('success', titulo, mensaje); },
    error:   function(titulo, mensaje) { crearToast('error', titulo, mensaje); },
    warning: function(titulo, mensaje) { crearToast('warning', titulo, mensaje); },
    info:    function(titulo, mensaje) { crearToast('info', titulo, mensaje); },
  };

})();