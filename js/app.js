// ============================================================
// NexusPay - App Principal (SPA) - v22 (Unificado y Corregido)
// ============================================================

let usuarioActual = null;
let datosPersonales = null;
let streamCamara = null;
let chatHistorial = [];
let tipoUsuario = 'natural';
let saldosOcultos = false;

// ============ UTILIDADES ============

function formatearDinero(valor) {
  if (saldosOcultos) return '$ ••••••';
  const numero = Math.round(Number(valor) || 0);
  return '$' + numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatearFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatearFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO');
}

function mostrarAlerta(msg, tipo) {
  return '<div class="alert alert-' + tipo + '">' + msg + '</div>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function togglePrivacidad() {
  saldosOcultos = !saldosOcultos;
  const currentPage = document.querySelector('.sidebar-link.active')?.getAttribute('data-page') || 'dashboard';
  navegarA(currentPage);
}

async function crearNotificacion(userId, titulo, mensaje, tipo) {
  try {
    await supabaseClient.from('notificaciones').insert({
      user_id: userId, titulo, mensaje, tipo: tipo || 'info',
    });
  } catch (e) {
    console.error('Error creando notificacion:', e);
  }
}

// ============ INICIALIZACION ============

document.addEventListener('DOMContentLoaded', async function () {
  const session = await verificarSesion();
  if (!session) return;

  usuarioActual = session.user;
  datosPersonales = await obtenerDatosUsuario();

  const { data: perfilData } = await supabaseClient
    .from('profiles')
    .select('tipo_usuario, nombre_negocio, nit, categoria_negocio')
    .eq('id', session.user.id)
    .single();

  tipoUsuario = perfilData?.tipo_usuario || 'natural';

  await cargarMenuPerfil();
  actualizarIconoTema();
  ocultarProductosSegunTipo();

  navegarA('dashboard');
});

// ============ MENU Y NAVEGACION ============

function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function ocultarProductosSegunTipo() {
  const menuNatural = document.getElementById('menuNaturalSidebar');
  const menuEmprendedor = document.getElementById('menuEmprendedorSidebar');

  if (!menuNatural || !menuEmprendedor) return;

  if (tipoUsuario === 'emprendedor') {
    menuNatural.style.display = 'none';
    menuEmprendedor.style.display = 'block';
  } else {
    menuNatural.style.display = 'block';
    menuEmprendedor.style.display = 'none';
  }
}

async function cargarMenuPerfil() {
  const email = localStorage.getItem('user_email') || '';
  let nombre = email.split('@')[0];
  if (datosPersonales && datosPersonales.nombres) {
    nombre = (datosPersonales.nombres + ' ' + (datosPersonales.apellidos || '')).trim();
  }

  const topAvatar = document.getElementById('topAvatar');

  if (topAvatar) {
    const userId = localStorage.getItem('user_id');
    try {
      const { data: profile } = await supabaseClient
        .from('profiles').select('foto_perfil_url').eq('id', userId).single();

      if (profile && profile.foto_perfil_url) {
        topAvatar.innerHTML = '<img src="' + profile.foto_perfil_url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      } else {
        const inicial = nombre.charAt(0).toUpperCase() || '👤';
        topAvatar.textContent = inicial;
      }
    } catch (e) {
      const inicial = nombre.charAt(0).toUpperCase() || '👤';
      topAvatar.textContent = inicial;
    }
  }
}

function actualizarIconoTema() {
  const esOscuro = document.body.classList.contains('dark-mode');
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => btn.textContent = esOscuro ? '☀️' : '🌙');
}

async function navegarA(page) {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');

  document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
  const linkActivo = document.querySelector('.sidebar-link[data-page="' + page + '"]');
  if (linkActivo) linkActivo.classList.add('active');

  const titulos = {
    dashboard: ['Overview', 'Resumen de tu cuenta'],
    flowpay: ['Transactions', 'Transferencias y pagos'],
    flowcard: ['Credit Cards', 'Tu tarjeta digital'],
    flowsave: ['Savings', 'Ahorro programado'],
    flowinvest: tipoUsuario === 'natural' ? ['Investments', 'CDT'] : ['Investments', 'NexusInvest'],
    flowshield: ['Services', 'Seguros digitales'],
    flowbusiness: ['Services', 'Cuenta empresarial'],
    flowanalytics: ['Analytics', 'Análisis financiero'],
    nexusbox: ['Accounts', 'Cajitas con rendimiento'],
    creditos: ['Loans', 'Solicita tu crédito'],
    simulador: ['Simulator', 'Calcula tu cuota'],
    perfil: ['Setting', 'Configuración de cuenta'],
    verificacion: ['Verification', 'Verifica tu identidad'],
    notificaciones: ['Notifications', 'Alertas de tu cuenta'],
    ayuda: ['Help Center', 'Preguntas frecuentes']
  };

  const titulo = titulos[page] || ['NexusPay', ''];
  document.getElementById('pageTitle').textContent = titulo[0];

  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    switch (page) {
      case 'dashboard': await renderDashboard(); break;
      case 'flowpay': await renderFlowPay(); break;
      function seleccionarServicio(elemento, nombreServicio) {
  // Quitar la clase 'selected' a todos los servicios
  document.querySelectorAll('.servicio-item').forEach(el => el.classList.remove('selected'));
  
  // Agregar la clase 'selected' al que se hizo clic
  elemento.classList.add('selected');
  
  // Guardar el valor en el input oculto
  document.getElementById('servicioNombre').value = nombreServicio;
}
      case 'flowcard': await renderFlowCard(); break;
      case 'flowsave': await renderFlowSave(); break;
      case 'flowinvest':
        if (tipoUsuario === 'natural') await renderCDT();
        else await renderFlowInvest();
        break;
      case 'flowshield': await renderFlowShield(); break;
      case 'flowbusiness': await renderFlowBusiness(); break;
      case 'flowanalytics': await renderFlowAnalytics(); break;
      case 'nexusbox': await renderNexusBox(); break;
      case 'creditos': await renderCreditos(); break;
      case 'simulador': await renderSimulador(); break;
      case 'perfil': await renderPerfil(); break;
      case 'verificacion': await renderVerificacion(); break;
      case 'notificaciones': await renderNotificaciones(); break;
      case 'ayuda': await renderAyuda(); break;
      default: content.innerHTML = '<p>Pagina no encontrada</p>';
    }
  } catch (error) {
    console.error(error);
    content.innerHTML = mostrarAlerta('Error: ' + error.message, 'error');
  }
}

// ============ DATOS ============

async function obtenerSaldo() {
  const userId = localStorage.getItem('user_id');
  try {
    const { data } = await supabaseClient.from('cuentas').select('saldo').eq('user_id', userId).single();
    if (data) return Number(data.saldo) || 0;

    const numero = 'NP-' + userId.slice(0, 8);
    const { data: nueva } = await supabaseClient.from('cuentas').insert({
      user_id: userId, numero_cuenta: numero, saldo: 1000000
    }).select().single();
    return nueva ? Number(nueva.saldo) : 0;
  } catch (e) {
    return 0;
  }
}

async function obtenerCuenta() {
  const userId = localStorage.getItem('user_id');
  const { data } = await supabaseClient.from('cuentas').select('*').eq('user_id', userId).single();
  return data;
}

async function actualizarSaldoSidebar() {
  const currentPage = document.querySelector('.sidebar-link.active')?.getAttribute('data-page');
  if (currentPage === 'dashboard') renderDashboard();
}

// ============ DASHBOARD ============

async function renderDashboard() {
  const userId = localStorage.getItem('user_id');
  const saldo = await obtenerSaldo();

  const { data: movimientos } = await supabaseClient
    .from('movimientos').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(5);

  const { data: tarjeta } = await supabaseClient
    .from('tarjetas').select('*').eq('user_id', userId).maybeSingle();

  const nombreTitular = datosPersonales && datosPersonales.nombres
    ? (datosPersonales.nombres + ' ' + (datosPersonales.apellidos || '')).toUpperCase()
    : 'USUARIO NEXUSPAY';
  const iconoOjo = saldosOcultos ? '🙈' : '👁️';

  let totalIngresos = 0;
  let totalEgresos = 0;
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const ingresosPorDia = [0, 0, 0, 0, 0, 0, 0];
  const egresosPorDia = [0, 0, 0, 0, 0, 0, 0];

  if (movimientos && movimientos.length > 0) {
    movimientos.forEach(m => {
      const dia = new Date(m.created_at).getDay();
      if (m.tipo === 'ingreso') {
        totalIngresos += Number(m.monto);
        ingresosPorDia[dia] += Number(m.monto);
      } else {
        totalEgresos += Number(m.monto);
        egresosPorDia[dia] += Number(m.monto);
      }
    });
  }

  const html = `
    <div class="dash-grid-2col">
      <div>
        <div class="section-heading">My Cards <a href="#" onclick="navegarA('flowcard'); return false;">See All</a></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          
          <div class="credit-card-horizontal blue">
            <div class="cc-top">
              <div>
                <div class="cc-balance-label">Balance <button class="eye-btn" onclick="togglePrivacidad()" style="color:white; font-size:14px;">${iconoOjo}</button></div>
                <div class="cc-balance">${formatearDinero(saldo)}</div>
              </div>
              <div class="cc-chip">💳</div>
            </div>
            <div class="cc-middle">
              <div><div class="cc-label">Card Holder</div><div class="cc-value">${nombreTitular}</div></div>
              <div><div class="cc-label">Valid Thru</div><div class="cc-value">${tarjeta ? tarjeta.fecha_expiracion : '12/28'}</div></div>
            </div>
            <div class="cc-bottom">
              <div class="cc-number">${tarjeta ? String(tarjeta.numero).replace(/(\d{4}) (\d{4}) (\d{4}) (\d{4})/, '$1 **** **** $4') : '3778 **** **** 1234'}</div>
              <div class="cc-logo">VISA</div>
            </div>
          </div>

          <div class="credit-card-horizontal white">
            <div class="cc-top">
              <div>
                <div class="cc-balance-label">Cupo Disponible</div>
                <div class="cc-balance">${tarjeta ? formatearDinero(tarjeta.cupo_disponible) : '$0'}</div>
              </div>
              <div class="cc-chip" style="color:#64748B;">💳</div>
            </div>
            <div class="cc-middle">
              <div><div class="cc-label">Card Holder</div><div class="cc-value">${nombreTitular}</div></div>
              <div><div class="cc-label">Valid Thru</div><div class="cc-value">${tarjeta ? tarjeta.fecha_expiracion : '12/28'}</div></div>
            </div>
            <div class="cc-bottom">
              <div class="cc-number" style="color:#0F172A;">•••• •••• •••• ${tarjeta ? String(tarjeta.numero).slice(-4) : '5678'}</div>
              <div class="cc-logo" style="color:#0F172A;">VISA</div>
            </div>
          </div>

        </div>
      </div>

      <div>
        <div class="section-heading">Recent Transaction</div>
        <div class="transaction-list">
          ${movimientos && movimientos.length > 0 ? movimientos.map(m => {
            const isIngreso = m.tipo === 'ingreso';
            return `
              <div class="transaction-item">
                <div style="display:flex; align-items:center;">
                  <div class="t-icon ${isIngreso ? 'in' : 'out'}">${isIngreso ? '↓' : '↑'}</div>
                  <div class="t-info">
                    <div class="t-title">${m.descripcion}</div>
                    <div class="t-date">${formatearFechaCorta(m.created_at)}</div>
                  </div>
                </div>
                <div class="t-amount ${isIngreso ? 'in' : 'out'}">${isIngreso ? '+' : '-'}${formatearDinero(m.monto)}</div>
              </div>
            `;
          }).join('') : '<p style="padding:16px; color:#64748B;">No hay transacciones.</p>'}
        </div>
      </div>
    </div>

    <div class="dash-grid-2col" style="margin-bottom: 24px;">
      <div class="widget-metric">
        <div class="widget-icon blue">💵</div>
        <div class="widget-info">
          <div class="label">Ingresos Totales</div>
          <div class="value">${formatearDinero(totalIngresos)}</div>
        </div>
      </div>
      <div class="widget-metric">
        <div class="widget-icon red">📉</div>
        <div class="widget-info">
          <div class="label">Egresos Totales</div>
          <div class="value">${formatearDinero(totalEgresos)}</div>
        </div>
      </div>
    </div>

    <div class="dash-grid-3col">
      <div class="app-section" style="margin-bottom:0;">
        <div class="section-heading">Weekly Activity</div>
        <canvas id="chartWeekly" height="120"></canvas>
      </div>

      <div class="app-section" style="margin-bottom:0;">
        <div class="section-heading">Expense Statistics</div>
        <canvas id="chartPie" height="200"></canvas>
      </div>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;

  setTimeout(() => {
    const ctxWeekly = document.getElementById('chartWeekly');
    if (ctxWeekly) {
      new Chart(ctxWeekly.getContext('2d'), {
        type: 'bar',
        data: {
          labels: diasSemana,
          datasets: [
            { label: 'Ingresos', data: ingresosPorDia, backgroundColor: '#2563EB', borderRadius: 4 },
            { label: 'Egresos', data: egresosPorDia, backgroundColor: '#14B8A6', borderRadius: 4 }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }
      });
    }

    const ctxPie = document.getElementById('chartPie');
    if (ctxPie) {
      new Chart(ctxPie.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Entretenimiento', 'Servicios', 'Inversión', 'Otros'],
          datasets: [{
            data: [30, 15, 20, 35],
            backgroundColor: ['#334155', '#F59E0B', '#D946EF', '#2563EB'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } }
      });
    }
  }, 100);
}

// ============ SIMULADOR ============

async function renderSimulador() {
  const html = `
    <div class="app-section">
      <div class="app-section-title">Simulador de Crédito</div>
      <div class="slider-container">
        <label class="app-form-label">Monto a solicitar: <span id="lblMonto" style="color:var(--primary); font-size:18px;">$1.000.000</span></label>
        <input type="range" class="slider" id="simMonto" min="100000" max="5000000" step="100000" value="1000000" oninput="calcularSimulacion()">
      </div>
      <div class="app-form-group">
        <label class="app-form-label">Plazo (días)</label>
        <select class="app-form-select" id="simPlazo" onchange="calcularSimulacion()">
          <option value="30">30 días</option>
          <option value="60">60 días</option>
          <option value="90" selected>90 días</option>
          <option value="120">120 días</option>
        </select>
      </div>
    </div>
    <div class="dash-grid-2col">
      <div class="widget-metric">
        <div class="widget-icon blue">💵</div>
        <div class="widget-info"><div class="label">Cuota estimada</div><div class="value" id="lblCuota">$0</div></div>
      </div>
      <div class="widget-metric">
        <div class="widget-icon green">📈</div>
        <div class="widget-info"><div class="label">Tasa estimada</div><div class="value" id="lblTasa">18% E.A.</div></div>
      </div>
    </div>
    <div class="app-section" id="semaforoBox">
      <div class="app-section-title">Capacidad de pago</div>
      <div id="semaforoMsg" class="alert alert-success">🟢 Cuota saludable</div>
    </div>
    <button class="btn-primary btn-large" onclick="navegarA('creditos')">Ir a solicitar crédito</button>
  `;
  document.getElementById('pageContent').innerHTML = html;
  calcularSimulacion();
}

function calcularSimulacion() {
  const montoEl = document.getElementById('simMonto');
  const plazoEl = document.getElementById('simPlazo');
  if (!montoEl || !plazoEl) return;
  const monto = parseFloat(montoEl.value);
  const plazo = parseInt(plazoEl.value);
  document.getElementById('lblMonto').textContent = formatearDinero(monto);
  const tasaAnual = 0.18;
  const tasaPeriodo = (tasaAnual * plazo) / 365;
  const interes = monto * tasaPeriodo;
  const totalPagar = monto + interes;
  const numCuotas = plazo / 30;
  const cuotaMensual = totalPagar / numCuotas;
  document.getElementById('lblCuota').textContent = formatearDinero(cuotaMensual);
  const semaforoMsg = document.getElementById('semaforoMsg');
  if (cuotaMensual > 500000) {
    semaforoMsg.className = 'alert alert-error';
    semaforoMsg.textContent = '🔴 Cuota muy alta.';
  } else if (cuotaMensual > 200000) {
    semaforoMsg.className = 'alert alert-warning';
    semaforoMsg.textContent = '🟡 Cuota moderada.';
  } else {
    semaforoMsg.className = 'alert alert-success';
    semaforoMsg.textContent = '🟢 Cuota saludable.';
  }
}

// ============ CDT (Para Persona Natural) ============

async function renderCDT() {
  const userId = localStorage.getItem('user_id');
  const { data: inversiones } = await supabaseClient.from('inversiones').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const saldo = await obtenerSaldo();

  const productos = [
    { nombre: 'CDT 90 dias', rendimiento: 10.5, desc: 'Plazo 90 dias · Tasa fija' },
    { nombre: 'CDT 180 dias', rendimiento: 12.0, desc: 'Plazo 180 dias · Tasa fija' },
    { nombre: 'CDT 360 dias', rendimiento: 15.5, desc: 'Plazo 360 dias · Tasa fija' },
  ];

  let totalInv = 0, totalAct = 0;
  if (inversiones) inversiones.forEach(i => { totalInv += Number(i.monto_invertido); totalAct += Number(i.valor_actual); });

  let html = `
    <div class="app-section" style="background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%); border: 2px solid #2563EB;">
      <div style="font-size: 18px; font-weight: 800; color: var(--dark); margin-bottom: 8px;">CDT - Certificado de Deposito a Termino</div>
      <div style="font-size: 14px; color: var(--text-light); margin-bottom: 16px;">Invierte tu dinero con tasas garantizadas. Sin riesgo, con rentabilidad fija.</div>
    </div>

    <div class="dash-grid-2col">
      <div class="widget-metric"><div class="widget-info"><div class="label">Total invertido</div><div class="value">${formatearDinero(totalInv)}</div></div></div>
      <div class="widget-metric"><div class="widget-info"><div class="label">Valor actual</div><div class="value">${formatearDinero(totalAct)}</div></div></div>
    </div>

    <div class="app-section">
      <div class="app-section-title">Productos disponibles</div>
  `;

  productos.forEach(p => {
    html += `
      <div class="product-item" style="display:flex; justify-content:space-between; padding:16px; border-bottom:1px solid var(--border);">
        <div class="product-item-info">
          <h4 style="font-size:15px; font-weight:600; color:var(--dark);">${p.nombre}</h4>
          <p style="font-size:13px; color:var(--text-light);">${p.desc}</p>
        </div>
        <div style="font-weight:800; color:var(--primary); font-size:16px;">${p.rendimiento}%</div>
      </div>
    `;
  });

  html += `
    </div>

    <div class="app-section">
      <div class="app-section-title">Abrir un CDT</div>
      <div class="app-form-group">
        <label class="app-form-label">Monto a invertir (minimo $100.000)</label>
        <input class="app-form-input" type="number" id="cdtMonto" value="100000" min="100000">
      </div>
      <div class="app-form-group">
        <label class="app-form-label">Plazo</label>
        <select class="app-form-select" id="cdtPlazo">
          <option value="90|10.5">90 dias - 10.5% anual</option>
          <option value="180|12.0">180 dias - 12.0% anual</option>
          <option value="360|15.5">360 dias - 15.5% anual</option>
        </select>
      </div>
      <button class="btn-primary btn-large" onclick="abrirCDT()">Abrir CDT</button>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;
}

async function abrirCDT() {
  const monto = parseFloat(document.getElementById('cdtMonto').value);
  const seleccion = document.getElementById('cdtPlazo').value.split('|');
  const plazo = seleccion[0];
  const rendimiento = parseFloat(seleccion[1]);
  const nombreProducto = 'CDT ' + plazo + ' dias';

  if (!monto || monto < 100000) { if (window.toast) toast.error('Monto minimo', 'Minimo $100.000'); return; }
  const saldo = await obtenerSaldo();
  if (saldo < monto) { if (window.toast) toast.error('Saldo insuficiente', 'No tienes suficiente saldo'); return; }

  if (window.toast) toast.info('Abriendo CDT...', 'Procesando tu inversion');

  const userId = localStorage.getItem('user_id');
  await supabaseClient.from('inversiones').insert({
    user_id: userId, producto: nombreProducto, monto_invertido: monto, rendimiento_anual: rendimiento, valor_actual: monto
  });
  await supabaseClient.rpc('retirar_saldo', { p_monto: monto });
  await actualizarSaldoSidebar();
  if (window.toast) toast.success('CDT abierto', 'Invertiste ' + formatearDinero(monto));
  renderCDT();
}

// ============ NEXUSPAGOS ============

async function renderFlowPay() {
  const cuenta = await obtenerCuenta();
  const saldo = cuenta ? Number(cuenta.saldo) : 0;
  const userIdActual = localStorage.getItem('user_id');

  const { data: perfil } = await supabaseClient.from('profiles').select('es_admin').eq('id', userIdActual).single();
  const esAdmin = perfil && perfil.es_admin === true;

  const { data: usuarios } = await supabaseClient.from('usuarios_registrados').select('*');
  const otros = (usuarios || []).filter(u => u.user_id !== userIdActual);

  const { data: transferencias } = await supabaseClient
    .from('transferencias').select('*')
    .or('emisor_id.eq.' + userIdActual + ',receptor_id.eq.' + userIdActual)
    .order('created_at', { ascending: false }).limit(20);

  let html = `
    <div class="dash-grid-2col">
      <div class="widget-metric">
        <div class="widget-icon blue">🏦</div>
        <div class="widget-info">
          <div class="label">Numero de cuenta</div>
          <div class="value" style="font-size:18px;">${cuenta ? cuenta.numero_cuenta : 'N/A'}</div>
        </div>
      </div>
      <div class="widget-metric">
        <div class="widget-icon green">💰</div>
        <div class="widget-info">
          <div class="label">Saldo disponible</div>
          <div class="value">${formatearDinero(saldo)}</div>
        </div>
      </div>
    </div>

    <div class="app-tabs">
      <button class="app-tab active" data-tab="enviar">Enviar</button>
      <button class="app-tab" data-tab="recargar">Recargar</button>
      <button class="app-tab" data-tab="retirar">Retirar con codigo</button>
      <button class="app-tab" data-tab="servicios">Servicios</button>
      <button class="app-tab" data-tab="historial">Historial</button>
    </div>

    <div class="app-tab-content active" id="tab-enviar">
      <div class="app-section">
        <div class="app-section-title">Nueva transferencia</div>
        ${otros.slice(0, 4).length > 0 ? `<label class="app-form-label">Contactos frecuentes</label><div class="contactos-grid">${otros.slice(0, 4).map(c => `<div class="contacto-item" onclick="document.getElementById('payReceptor').value='${c.email}'"><div class="contacto-avatar">${c.email.charAt(0).toUpperCase()}</div><div class="contacto-nombre">${c.email.split('@')[0]}</div></div>`).join('')}</div>` : ''}
        <div class="app-form-group">
          <label class="app-form-label">Destinatario (Correo)</label>
          <select class="app-form-select" id="payReceptor">
            <option value="">Selecciona o escribe abajo</option>
            ${otros.map(u => '<option value="' + u.email + '">' + u.email + '</option>').join('')}
          </select>
        </div>
        <div class="app-form-group">
          <label class="app-form-label">Monto (COP)</label>
          <input class="app-form-input" type="number" id="payMonto" min="1000" placeholder="100000">
        </div>
        <div class="app-form-group">
          <label class="app-form-label">Concepto (opcional)</label>
          <input class="app-form-input" type="text" id="payConcepto" placeholder="Sin concepto">
        </div>
        <button class="btn-primary btn-large" onclick="enviarDinero()">Enviar dinero</button>
      </div>
    </div>

    <div class="app-tab-content" id="tab-recargar">
      <div class="app-section">
        <div class="app-section-title">Recargar saldo</div>
        <div class="app-form-group">
          <label class="app-form-label">Monto a recargar (COP)</label>
          <input class="app-form-input" type="number" id="recargarMonto" min="10000" value="100000">
        </div>
        <button class="btn-primary btn-large" onclick="recargarSaldo()">Recargar</button>
      </div>
    </div>

    <div class="app-tab-content" id="tab-retirar">
      <div class="app-section">
        <div class="app-section-title">Retirar con codigo</div>
        <div class="app-form-group">
          <label class="app-form-label">Monto a retirar (COP)</label>
          <input class="app-form-input" type="number" id="retiroMonto" min="10000" value="50000">
        </div>
        <button class="btn-primary btn-large" onclick="generarCodigoRetiro()">Generar codigo de retiro</button>
      </div>
    </div>

        <div class="app-tab-content" id="tab-servicios">
      <div class="app-section">
        <div class="app-section-title">Pagar servicios</div>
        
        <label class="app-form-label">Selecciona el servicio</label>
        <div class="servicios-grid" id="serviciosGrid">
          <div class="servicio-item" onclick="seleccionarServicio(this, 'Claro')">
            <img src="img/servicios/claro.png" class="servicio-logo" alt="Claro" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#DA291C; color:white;">📱</div>
            <span>Claro</span>
          </div>
          
          <div class="servicio-item" onclick="seleccionarServicio(this, 'Movistar')">
            <img src="img/servicios/movistar.png" class="servicio-logo" alt="Movistar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#019DF4; color:white;">📶</div>
            <span>Movistar</span>
          </div>
          
          <div class="servicio-item" onclick="seleccionarServicio(this, 'Tigo')">
            <img src="img/servicios/tigo.png" class="servicio-logo" alt="Tigo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#00377E; color:white;">📞</div>
            <span>Tigo</span>
          </div>
          
          <div class="servicio-item" onclick="seleccionarServicio(this, 'EPM')">
            <img src="img/servicios/epm.png" class="servicio-logo" alt="EPM" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#007A33; color:white;">💡</div>
            <span>EPM</span>
          </div>
          
          <div class="servicio-item" onclick="seleccionarServicio(this, 'Netflix')">
            <img src="img/servicios/netflix.png" class="servicio-logo" alt="Netflix" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#E50914; color:white;">🎬</div>
            <span>Netflix</span>
          </div>
          
          <div class="servicio-item" onclick="seleccionarServicio(this, 'Spotify')">
            <img src="img/servicios/spotify.png" class="servicio-logo" alt="Spotify" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="servicio-logo-fallback" style="display:none; background:#1DB954; color:white;">🎵</div>
            <span>Spotify</span>
          </div>
        </div>

        <!-- Input oculto para guardar el servicio seleccionado -->
        <input type="hidden" id="servicioNombre" value="">

        <div class="app-form-group" style="margin-top: 16px;">
          <label class="app-form-label">Monto (COP)</label>
          <input class="app-form-input" type="number" id="servicioMonto" min="1000" value="45000">
        </div>
        <button class="btn-primary btn-large" onclick="pagarServicio()">Pagar servicio</button>
      </div>
    </div>

    <div class="app-tab-content" id="tab-historial">
      <div class="app-section">
        <div class="app-section-title">Historial de transferencias</div>
        ${transferencias && transferencias.length > 0 ? `
          <table class="app-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Contraparte</th><th style="text-align:right;">Monto</th><th></th></tr></thead>
            <tbody>
              ${transferencias.map(t => {
                const esEmisor = t.emisor_id === userIdActual;
                const signo = esEmisor ? '-' : '+';
                const clase = esEmisor ? 'text-red' : 'text-green';
                const contraparte = esEmisor ? t.receptor_email : t.emisor_email;
                return '<tr><td>' + formatearFecha(t.created_at) + '</td><td>' + (esEmisor ? '📤' : '📥') + '</td><td>' + contraparte + '</td><td class="' + clase + '" style="text-align:right;">' + signo + formatearDinero(t.monto) + '</td><td><button class="btn-secondary-sm" onclick="generarReciboPDF(' + t.id + ')" style="font-size:11px;padding:4px 8px;">📄</button></td></tr>';
              }).join('')}
            </tbody>
          </table>
        ` : '<p style="color:#64748B;">Aun no has realizado transferencias.</p>'}
      </div>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

function activarTabs() {
  document.querySelectorAll('.app-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.app-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.getAttribute('data-tab')).classList.add('active');
    });
  });
}

async function enviarDinero() {
  const receptor = document.getElementById('payReceptor').value;
  const monto = parseFloat(document.getElementById('payMonto').value);
  const concepto = document.getElementById('payConcepto').value || 'Sin concepto';

  if (!receptor || !monto || monto <= 0) { if (window.toast) toast.error('Campos incompletos', 'Completa todos los campos'); return; }
  if (window.toast) toast.info('Procesando...', 'Enviando transferencia');

  const { data, error } = await supabaseClient.rpc('transferir_dinero', {
    p_receptor_email: receptor.toLowerCase(), p_monto: monto, p_concepto: concepto,
  });

  if (error) { if (window.toast) toast.error('Error', error.message); return; }

  if (data && data.success) {
    const { data: receptorInfo } = await supabaseClient.from('usuarios_registrados').select('user_id').eq('email', receptor.toLowerCase()).single();
    if (receptorInfo) await crearNotificacion(receptorInfo.user_id, '💸 Dinero recibido', 'Recibiste ' + formatearDinero(monto) + ' de ' + localStorage.getItem('user_email'), 'success');
    await crearNotificacion(localStorage.getItem('user_id'), '✅ Transferencia enviada', 'Enviaste ' + formatearDinero(monto) + ' a ' + receptor, 'success');
    if (window.toast) toast.success('Transferencia exitosa', 'Enviaste ' + formatearDinero(monto) + ' a ' + receptor);
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowpay'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo transferir'));
  }
}

async function recargarSaldo() {
  const monto = parseFloat(document.getElementById('recargarMonto').value);
  if (!monto || monto <= 0) { if (window.toast) toast.error('Monto invalido', 'Ingresa un monto mayor a 0'); return; }
  const { data } = await supabaseClient.rpc('recargar_saldo', { p_monto: monto });
  if (data && data.success) {
    await crearNotificacion(localStorage.getItem('user_id'), '💰 Recarga exitosa', 'Recargaste ' + formatearDinero(monto), 'success');
    if (window.toast) toast.success('Recarga exitosa', 'Recargaste ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowpay'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo recargar'));
  }
}

async function pagarServicio() {
  const servicio = document.getElementById('servicioNombre').value;
  const monto = parseFloat(document.getElementById('servicioMonto').value);
  if (!monto || monto <= 0) { if (window.toast) toast.error('Monto invalido', 'Ingresa un monto mayor a 0'); return; }
  const { data } = await supabaseClient.rpc('pagar_servicio', { p_servicio: servicio, p_monto: monto });
  if (data && data.success) {
    await crearNotificacion(localStorage.getItem('user_id'), '💡 Pago exitoso', 'Pagaste ' + servicio + ' por ' + formatearDinero(monto), 'success');
    if (window.toast) toast.success('Pago exitoso', 'Pagaste ' + servicio + ' por ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowpay'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo pagar'));
  }
}

async function generarCodigoRetiro() {
  const monto = parseFloat(document.getElementById('retiroMonto').value);
  if (!monto || monto < 10000) { 
    if (window.toast) toast.error('Monto minimo', 'Minimo $10.000 COP'); 
    return; 
  }

  const userId = localStorage.getItem('user_id');
  const saldo = await obtenerSaldo();

  if (saldo < monto) {
    if (window.toast) toast.error('Saldo insuficiente', 'No tienes fondos para este retiro');
    return;
  }

  if (window.toast) toast.info('Generando...', 'Creando tu codigo de retiro');

  try {
    // 1. Descontamos el saldo de la cuenta inmediatamente
    const { error: errSaldo } = await supabaseClient.rpc('retirar_saldo', { p_monto: monto });
    if (errSaldo) throw new Error('No se pudo descontar el saldo: ' + errSaldo.message);

    // 2. Generamos un código de 6 dígitos
    const codigo = String(Math.floor(100000 + Math.random() * 900000));

    // 3. Guardamos el código en la tabla 'codigos_retiro'
    const { error: errCodigo } = await supabaseClient.from('codigos_retiro').insert({
      user_id: userId,
      codigo: codigo,
      monto: monto,
      estado: 'pendiente'
    });

    if (errCodigo) throw new Error('Error guardando el código: ' + errCodigo.message);

    // 4. Registramos el movimiento en el historial
    await supabaseClient.from('movimientos').insert({
      user_id: userId,
      tipo: 'egreso',
      monto: monto,
      descripcion: 'Retiro generado con código ' + codigo
    });

    // 5. Notificamos
    await crearNotificacion(userId, '🎫 Código generado', 'Tu código es: ' + codigo + ' por ' + formatearDinero(monto), 'info');

    if (window.toast) toast.success('Código generado', 'Código: ' + codigo + ' — guárdalo para retirar');
    
    // Actualizamos los saldos y recargamos la vista
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowpay'), 3000);

  } catch (error) {
    console.error(error);
    if (window.toast) toast.error('Error', error.message);
  }
}
async function generarReciboPDF(transferenciaId) {
  const { data: t } = await supabaseClient.from('transferencias').select('*').eq('id', transferenciaId).single();
  if (!t) { if (window.toast) toast.error('No encontrada', 'Transferencia no encontrada'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('NEXUSPAY', 105, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprobante de Transferencia', 105, 38, { align: 'center' });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(20, 44, 190, 44);
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text('Numero: #' + t.id, 20, 60);
  doc.text('Fecha: ' + formatearFecha(t.created_at), 20, 70);
  doc.text('Emisor: ' + t.emisor_email, 20, 80);
  doc.text('Receptor: ' + t.receptor_email, 20, 90);
  doc.text('Monto: ' + formatearDinero(t.monto) + ' COP', 20, 100);
  doc.save('recibo_nexuspay_' + t.id + '.pdf');
}

// ============ NEXUSCARD (Credit Cards Design) ============

async function renderFlowCard() {
  const userId = localStorage.getItem('user_id');
  let { data: tarjeta } = await supabaseClient.from('tarjetas').select('*').eq('user_id', userId).single();

  if (!tarjeta) {
    const numero = '4000 ' + Array.from({length: 3}, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
    const cvv = String(Math.floor(100 + Math.random() * 900));
    const mes = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const anio = String(new Date().getFullYear() + 4).slice(-2);
    const { data } = await supabaseClient.from('tarjetas').insert({
      user_id: userId, numero, cvv, fecha_expiracion: mes + '/' + anio, cupo_total: 3000000, cupo_disponible: 3000000
    }).select().single();
    tarjeta = data;
  }

  const nombreTitular = datosPersonales && datosPersonales.nombres
    ? (datosPersonales.nombres + ' ' + (datosPersonales.apellidos || '')).toUpperCase()
    : (localStorage.getItem('user_email').split('@')[0]).toUpperCase();

  const deuda = Number(tarjeta.cupo_total) - Number(tarjeta.cupo_disponible);

  const html = `
    <div class="section-heading">My Cards</div>
    <div class="dash-grid-2col" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-bottom: 32px;">
      
      <!-- Tarjeta Azul -->
      <div class="credit-card-horizontal blue">
        <div class="cc-top">
          <div>
            <div class="cc-balance-label">Balance</div>
            <div class="cc-balance">${formatearDinero(tarjeta.cupo_disponible)}</div>
          </div>
          <div class="cc-chip">💳</div>
        </div>
        <div class="cc-middle">
          <div><div class="cc-label">Card Holder</div><div class="cc-value">${nombreTitular}</div></div>
          <div><div class="cc-label">Valid Thru</div><div class="cc-value">${tarjeta.fecha_expiracion}</div></div>
        </div>
        <div class="cc-bottom">
          <div class="cc-number">${tarjeta.numero.replace(/(\d{4}) (\d{4}) (\d{4}) (\d{4})/, '$1 **** **** $4')}</div>
          <div class="cc-logo">VISA</div>
        </div>
      </div>

      <!-- Tarjeta Blanca -->
      <div class="credit-card-horizontal white">
        <div class="cc-top">
          <div>
            <div class="cc-balance-label">Deuda actual</div>
            <div class="cc-balance">${formatearDinero(deuda)}</div>
          </div>
          <div class="cc-chip" style="color:#64748B;">💳</div>
        </div>
        <div class="cc-middle">
          <div><div class="cc-label">Card Holder</div><div class="cc-value">${nombreTitular}</div></div>
          <div><div class="cc-label">Valid Thru</div><div class="cc-value">${tarjeta.fecha_expiracion}</div></div>
        </div>
        <div class="cc-bottom">
          <div class="cc-number" style="color:#0F172A;">•••• •••• •••• ${String(tarjeta.numero).slice(-4)}</div>
          <div class="cc-logo" style="color:#0F172A;">VISA</div>
        </div>
      </div>
    </div>

    <div class="dash-grid-2col">
      <div class="app-section">
        <div class="app-section-title">Estado: ${tarjeta.estado === 'activa' ? '🟢 Activa' : '🔒 Congelada'}</div>
        <button class="btn-primary btn-large" onclick="toggleTarjeta(${tarjeta.id}, '${tarjeta.estado}')">
          ${tarjeta.estado === 'activa' ? '🔒 Congelar Tarjeta' : '🔓 Descongelar Tarjeta'}
        </button>
      </div>

      <div class="app-section">
        <div class="app-tabs" style="margin-bottom:16px;">
          <button class="app-tab active" data-tab="sacar-cupo">💸 Sacar cupo</button>
          <button class="app-tab" data-tab="pagar-tarjeta">💳 Pagar tarjeta</button>
        </div>

        <div class="app-tab-content active" id="tab-sacar-cupo">
          <div class="app-form-group">
            <label class="app-form-label">Monto a retirar (COP)</label>
            <input class="app-form-input" type="number" id="montoSacarCupo" min="10000" value="100000">
          </div>
          <button class="btn-primary btn-large" onclick="sacarCupo()">💸 Retirar a mi cuenta</button>
        </div>

        <div class="app-tab-content" id="tab-pagar-tarjeta">
          <div class="app-form-group">
            <label class="app-form-label">Monto a pagar (COP)</label>
            <input class="app-form-input" type="number" id="montoPagarTarjeta" min="1000" value="${deuda > 0 ? Math.min(deuda, 100000) : 0}">
          </div>
          <button class="btn-primary btn-large" onclick="pagarTarjeta()">💳 Pagar tarjeta</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function toggleTarjeta(id, estadoActual) {
  const nuevoEstado = estadoActual === 'activa' ? 'congelada' : 'activa';
  await supabaseClient.from('tarjetas').update({ estado: nuevoEstado }).eq('id', id);
  if (window.toast) {
    if (nuevoEstado === 'congelada') toast.warning('Tarjeta congelada', 'No se podra usar');
    else toast.success('Tarjeta activada', 'Ya puedes usarla');
  }
  navegarA('flowcard');
}

async function sacarCupo() {
  const monto = parseFloat(document.getElementById('montoSacarCupo').value);
  if (!monto || monto < 10000) { if (window.toast) toast.error('Monto minimo', 'Minimo $10.000'); return; }
  if (window.toast) toast.info('Procesando...', 'Sacando cupo');
  const { data } = await supabaseClient.rpc('usar_cupo_tarjeta', { p_monto: monto });
  if (data && data.success) {
    await crearNotificacion(localStorage.getItem('user_id'), '💸 Avance de cupo', 'Retiraste ' + formatearDinero(monto), 'success');
    if (window.toast) toast.success('Cupo retirado', 'Retiraste ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowcard'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo sacar'));
  }
}

async function pagarTarjeta() {
  const monto = parseFloat(document.getElementById('montoPagarTarjeta').value);
  if (!monto || monto <= 0) { if (window.toast) toast.error('Monto invalido', 'Ingresa un monto mayor a 0'); return; }
  if (window.toast) toast.info('Procesando...', 'Pagando tarjeta');
  const { data } = await supabaseClient.rpc('pagar_tarjeta', { p_monto: monto });
  if (data && data.success) {
    const pagoReal = data.pago_real || monto;
    await crearNotificacion(localStorage.getItem('user_id'), '💳 Pago de tarjeta', 'Pagaste ' + formatearDinero(pagoReal), 'success');
    if (window.toast) toast.success('Pago realizado', 'Pagaste ' + formatearDinero(pagoReal));
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowcard'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo pagar'));
  }
}

// ============ NEXUSSAVE ============

async function renderFlowSave() {
  const userId = localStorage.getItem('user_id');
  const { data: metas } = await supabaseClient.from('metas_ahorro').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="mis-metas">Mis metas</button><button class="app-tab" data-tab="nueva-meta">Nueva meta</button></div><div class="app-tab-content active" id="tab-mis-metas">';

  if (metas && metas.length > 0) {
    metas.forEach(meta => {
      const progreso = meta.monto_objetivo > 0 ? (meta.monto_actual / meta.monto_objetivo) * 100 : 0;
      html += '<div class="meta-card" style="background:var(--bg-card); border:1px solid var(--border); padding:20px; border-radius:16px; margin-bottom:16px;">' +
        '<div style="display:flex; justify-content:space-between; margin-bottom:12px;"><div style="font-weight:700; color:var(--dark);">' + (meta.icono || '🎯') + ' ' + meta.nombre + '</div><div class="badge badge-purple">' + progreso.toFixed(1) + '%</div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-light); margin-bottom:8px;"><span>Ahorrado: <strong>' + formatearDinero(meta.monto_actual) + '</strong></span><span>Meta: <strong>' + formatearDinero(meta.monto_objetivo) + '</strong></span></div>' +
        '<div style="width:100%; height:10px; background:var(--bg-soft); border-radius:100px; overflow:hidden;"><div style="height:100%; width:' + Math.min(progreso, 100) + '%; background:linear-gradient(90deg, #2563EB, #10B981);"></div></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;"><input class="app-form-input" type="number" id="aporte-' + meta.id + '" placeholder="Aportar" style="flex:1;"><button class="btn-primary" onclick="aportarMeta(' + meta.id + ')">Aportar</button></div></div>';
    });
  } else {
    html += '<div class="app-section"><p style="color:var(--text-light);">Aun no tienes metas.</p></div>';
  }

  html += '</div><div class="app-tab-content" id="tab-nueva-meta"><div class="app-section"><div class="app-section-title">Crear meta</div>' +
    '<div class="app-form-group"><label class="app-form-label">Nombre</label><input class="app-form-input" type="text" id="metaNombre"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Monto objetivo (COP)</label><input class="app-form-input" type="number" id="metaObjetivo" value="500000"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Fecha limite</label><input class="app-form-input" type="date" id="metaFecha"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Icono</label><select class="app-form-select" id="metaIcono"><option value="🎯">🎯 Meta</option><option value="✈️">✈️ Viaje</option><option value="🏠">🏠 Casa</option><option value="🚗">🚗 Auto</option><option value="💻">💻 Tecnologia</option><option value="🎓">🎓 Educacion</option></select></div>' +
    '<button class="btn-primary btn-large" onclick="crearMeta()">Crear meta</button></div></div>';

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function crearMeta() {
  const userId = localStorage.getItem('user_id');
  const nombre = document.getElementById('metaNombre').value;
  const objetivo = parseFloat(document.getElementById('metaObjetivo').value);
  const fecha = document.getElementById('metaFecha').value || null;
  const icono = document.getElementById('metaIcono').value;
  if (!nombre || !objetivo) { if (window.toast) toast.error('Campos incompletos', 'Nombre y monto son obligatorios'); return; }
  await supabaseClient.from('metas_ahorro').insert({ user_id: userId, nombre, monto_objetivo: objetivo, fecha_limite: fecha, icono });
  if (window.toast) toast.success('Meta creada', nombre + ' por ' + formatearDinero(objetivo));
  navegarA('flowsave');
}

async function aportarMeta(metaId) {
  const input = document.getElementById('aporte-' + metaId);
  const monto = parseFloat(input.value);
  if (!monto || monto <= 0) { if (window.toast) toast.error('Monto invalido', 'Ingresa un monto mayor a 0'); return; }
  const { data } = await supabaseClient.from('metas_ahorro').select('monto_actual').eq('id', metaId).single();
  const actual = data ? Number(data.monto_actual) : 0;
  await supabaseClient.from('metas_ahorro').update({ monto_actual: actual + monto }).eq('id', metaId);
  if (window.toast) toast.success('Aporte registrado', formatearDinero(monto) + ' guardados');
  navegarA('flowsave');
}

// ============ NEXUSINVEST ============

async function renderFlowInvest() {
  const userId = localStorage.getItem('user_id');
  const { data: inversiones } = await supabaseClient.from('inversiones').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const saldo = await obtenerSaldo();

  const productos = [
    { nombre: 'CDT Digital', rendimiento: 10.5, desc: 'Bajo riesgo' },
    { nombre: 'Fondo Conservador', rendimiento: 12.0, desc: 'Riesgo medio' },
    { nombre: 'Fondo Crecimiento', rendimiento: 15.5, desc: 'Riesgo alto' },
    { nombre: 'Portafolio Emprendedor', rendimiento: 18.0, desc: 'Diversificado' },
  ];

  let totalInv = 0, totalAct = 0;
  if (inversiones) inversiones.forEach(i => { totalInv += Number(i.monto_invertido); totalAct += Number(i.valor_actual); });

  let html = '<div class="dash-grid-2col">' +
    '<div class="widget-metric"><div class="widget-icon blue">📈</div><div class="widget-info"><div class="label">Total invertido</div><div class="value">' + formatearDinero(totalInv) + '</div></div></div>' +
    '<div class="widget-metric"><div class="widget-icon green">💵</div><div class="widget-info"><div class="label">Valor actual</div><div class="value text-green">' + formatearDinero(totalAct) + '</div></div></div></div>';

  html += '<div class="app-tabs"><button class="app-tab active" data-tab="mis-inv">Mis inversiones</button><button class="app-tab" data-tab="nueva-inv">Invertir</button></div><div class="app-tab-content active" id="tab-mis-inv">';

  if (inversiones && inversiones.length > 0) {
    inversiones.forEach(inv => {
      html += '<div class="app-section" style="display:flex; justify-content:space-between; align-items:center;"><div><h4 style="font-weight:700; color:var(--dark);">' + inv.producto + '</h4><p style="font-size:13px; color:var(--text-light);">Rendimiento anual: ' + inv.rendimiento_anual + '%</p></div><div style="font-weight:800; color:var(--primary); font-size:18px;">' + formatearDinero(inv.monto_invertido) + '</div></div>';
    });
  } else {
    html += '<div class="app-section"><p style="color:var(--text-light);">Aun no tienes inversiones.</p></div>';
  }

  html += '</div><div class="app-tab-content" id="tab-nueva-inv"><div class="app-section"><div class="app-section-title">Productos disponibles</div>';

  productos.forEach(p => {
    html += '<div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border);"><div><h4 style="font-weight:600; color:var(--dark);">' + p.nombre + '</h4><p style="font-size:13px; color:var(--text-light);">' + p.desc + '</p></div><div style="font-weight:800; color:var(--primary);">' + p.rendimiento + '%</div></div>';
  });

  html += '</div><div class="app-section"><div class="app-section-title">Nueva inversion</div><div class="app-form-group"><label class="app-form-label">Producto</label><select class="app-form-select" id="invProducto">';

  productos.forEach(p => {
    html += '<option value="' + p.nombre + '" data-rend="' + p.rendimiento + '">' + p.nombre + ' - ' + p.rendimiento + '%</option>';
  });

  html += '</select></div><div class="app-form-group"><label class="app-form-label">Monto (COP)</label><input class="app-form-input" type="number" id="invMonto" value="100000"></div><button class="btn-primary btn-large" onclick="crearInversion()">Invertir</button></div></div>';

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function crearInversion() {
  const userId = localStorage.getItem('user_id');
  const sel = document.getElementById('invProducto');
  const producto = sel.value;
  const rend = parseFloat(sel.options[sel.selectedIndex].getAttribute('data-rend'));
  const monto = parseFloat(document.getElementById('invMonto').value);
  if (!monto || monto < 100000) { if (window.toast) toast.error('Monto minimo', 'Minimo $100.000'); return; }
  const saldo = await obtenerSaldo();
  if (saldo < monto) { if (window.toast) toast.error('Saldo insuficiente', 'No tienes suficiente dinero'); return; }
  await supabaseClient.from('inversiones').insert({ user_id: userId, producto, monto_invertido: monto, rendimiento_anual: rend, valor_actual: monto });
  await supabaseClient.rpc('retirar_saldo', { p_monto: monto });
  await actualizarSaldoSidebar();
  if (window.toast) toast.success('Inversion creada', producto + ' por ' + formatearDinero(monto));
  navegarA('flowinvest');
}

// ============ NEXUSSHIELD ============

async function renderFlowShield() {
  const userId = localStorage.getItem('user_id');
  const { data: seguros } = await supabaseClient.from('seguros').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  const tipos = [
    { tipo: 'Vida', cobertura: 50000000, prima: 45000 },
    { tipo: 'Negocio', cobertura: 20000000, prima: 28000 },
    { tipo: 'Fraude digital', cobertura: 5000000, prima: 12000 },
    { tipo: 'Incendio/Hurto', cobertura: 15000000, prima: 22000 },
    { tipo: 'Salud', cobertura: 10000000, prima: 35000 },
  ];

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="mis-seguros">Mis polizas</button><button class="app-tab" data-tab="nuevo-seguro">Contratar</button></div><div class="app-tab-content active" id="tab-mis-seguros">';

  if (seguros && seguros.length > 0) {
    seguros.forEach(s => {
      html += '<div style="display:flex; justify-content:space-between; padding:16px; border-bottom:1px solid var(--border);"><div><h4 style="font-weight:700; color:var(--dark);">Seguro de ' + s.tipo + '</h4><p style="font-size:13px; color:var(--text-light);">Cobertura: ' + formatearDinero(s.cobertura) + '</p></div><div style="font-weight:800; color:var(--primary);">' + formatearDinero(s.prima_mensual) + '/mes</div></div>';
    });
  } else {
    html += '<div class="app-section"><p style="color:var(--text-light);">No tienes polizas.</p></div>';
  }

  html += '</div><div class="app-tab-content" id="tab-nuevo-seguro"><div class="app-section"><div class="app-section-title">Disponibles</div>';

  tipos.forEach(t => {
    html += '<div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border);"><div><h4 style="font-weight:600; color:var(--dark);">Seguro de ' + t.tipo + '</h4><p style="font-size:13px; color:var(--text-light);">Cobertura: ' + formatearDinero(t.cobertura) + '</p></div><div style="font-weight:800; color:var(--primary);">' + formatearDinero(t.prima) + '/mes</div></div>';
  });

  html += '</div><div class="app-section"><div class="app-section-title">Contratar</div><div class="app-form-group"><label class="app-form-label">Tipo</label><select class="app-form-select" id="seguroTipo">';

  tipos.forEach(t => {
    html += '<option value="' + t.tipo + '" data-cob="' + t.cobertura + '" data-prima="' + t.prima + '">' + t.tipo + '</option>';
  });

  html += '</select></div><button class="btn-primary btn-large" onclick="contratarSeguro()">Contratar</button></div></div>';

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function contratarSeguro() {
  const userId = localStorage.getItem('user_id');
  const sel = document.getElementById('seguroTipo');
  const tipo = sel.value;
  const cobertura = parseFloat(sel.options[sel.selectedIndex].getAttribute('data-cob'));
  const prima = parseFloat(sel.options[sel.selectedIndex].getAttribute('data-prima'));
  await supabaseClient.from('seguros').insert({ user_id: userId, tipo, cobertura, prima_mensual: prima });
  if (window.toast) toast.success('Poliza contratada', 'Seguro de ' + tipo + ' activo');
  navegarA('flowshield');
}

// ============ NEXUSBUSINESS ============

async function renderFlowBusiness() {
  const userId = localStorage.getItem('user_id');
  const { data: cuentas } = await supabaseClient.from('cuentas_empresariales').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="mis-empresas">Mis cuentas</button><button class="app-tab" data-tab="nueva-empresa">Nueva cuenta</button></div><div class="app-tab-content active" id="tab-mis-empresas">';

  if (cuentas && cuentas.length > 0) {
    cuentas.forEach(c => {
      html += '<div style="display:flex; justify-content:space-between; padding:16px; border-bottom:1px solid var(--border);"><div><h4 style="font-weight:700; color:var(--dark);">🏢 ' + c.nombre_negocio + '</h4><p style="font-size:13px; color:var(--text-light);">NIT: ' + (c.nit || 'N/A') + ' | ' + (c.categoria || 'General') + '</p></div><div style="font-weight:800; color:var(--primary);">' + formatearDinero(c.saldo) + '</div></div>';
    });
  } else {
    html += '<div class="app-section"><p style="color:var(--text-light);">No tienes cuentas empresariales.</p></div>';
  }

  html += '</div><div class="app-tab-content" id="tab-nueva-empresa"><div class="app-section"><div class="app-section-title">Crear cuenta</div>' +
    '<div class="app-form-group"><label class="app-form-label">Nombre del negocio</label><input class="app-form-input" type="text" id="empNombre"></div>' +
    '<div class="app-form-group"><label class="app-form-label">NIT (obligatorio)</label><input class="app-form-input" type="text" id="empNit"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Categoria</label><select class="app-form-select" id="empCategoria"><option>E-commerce</option><option>Servicios</option><option>Tecnologia</option><option>Alimentos</option><option>Moda</option><option>Educacion</option><option>Otro</option></select></div>' +
    '<button class="btn-primary btn-large" onclick="crearEmpresa()">Crear cuenta</button></div></div>';

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function crearEmpresa() {
  const userId = localStorage.getItem('user_id');
  const nombre = document.getElementById('empNombre').value.trim();
  const nit = document.getElementById('empNit').value.trim();
  const categoria = document.getElementById('empCategoria').value;
  if (!nombre) { if (window.toast) toast.error('Falta nombre', 'Escribe el nombre del negocio'); return; }
  if (!nit) { if (window.toast) toast.error('Falta NIT', 'El NIT es obligatorio'); return; }
  await supabaseClient.from('cuentas_empresariales').insert({ user_id: userId, nombre_negocio: nombre, nit, categoria, saldo: 0 });
  if (window.toast) toast.success('Cuenta empresarial creada', nombre);
  navegarA('flowbusiness');
}

// ============ NEXUSANALYTICS ============

async function renderFlowAnalytics() {
  const userId = localStorage.getItem('user_id');
  const { data: movs } = await supabaseClient.from('movimientos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200);

  let ingresos = 0, egresos = 0;
  if (movs) movs.forEach(m => { if (m.tipo === 'ingreso') ingresos += Number(m.monto); else egresos += Number(m.monto); });
  const balance = ingresos - egresos;

  let html = '<div class="dash-grid-2col">' +
    '<div class="widget-metric"><div class="widget-icon green">📈</div><div class="widget-info"><div class="label">Ingresos</div><div class="value text-green">' + formatearDinero(ingresos) + '</div></div></div>' +
    '<div class="widget-metric"><div class="widget-icon red">📉</div><div class="widget-info"><div class="label">Egresos</div><div class="value text-red">' + formatearDinero(egresos) + '</div></div></div>' +
    '<div class="widget-metric"><div class="widget-icon blue">💵</div><div class="widget-info"><div class="label">Balance</div><div class="value">' + formatearDinero(balance) + '</div></div></div>' +
    '<div class="widget-metric"><div class="widget-icon yellow">📊</div><div class="widget-info"><div class="label">Movimientos</div><div class="value">' + (movs ? movs.length : 0) + '</div></div></div></div>';

  html += '<div class="app-section"><div class="app-section-title">Historial completo</div>';

  if (movs && movs.length > 0) {
    html += '<table class="app-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripcion</th><th style="text-align:right;">Monto</th></tr></thead><tbody>';
    movs.slice(0, 30).forEach(m => {
      const signo = m.tipo === 'ingreso' ? '+' : '-';
      const clase = m.tipo === 'ingreso' ? 'text-green' : 'text-red';
      html += '<tr><td>' + formatearFechaCorta(m.created_at) + '</td><td>' + (m.tipo === 'ingreso' ? '🟢' : '🔴') + '</td><td>' + m.descripcion + '</td><td class="' + clase + '" style="text-align:right;">' + signo + formatearDinero(m.monto) + '</td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:var(--text-light);">No hay movimientos.</p>';
  }

  html += '</div>';
  document.getElementById('pageContent').innerHTML = html;
}

// ============ NEXUSCREDIT ============

async function renderCreditos() {
  const userId = localStorage.getItem('user_id');
  const { data: solicitudes } = await supabaseClient.from('solicitudes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const { data: creditos } = await supabaseClient.from('creditos').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="solicitar">Solicitar</button><button class="app-tab" data-tab="mis-creditos">Mis creditos</button><button class="app-tab" data-tab="historial-cred">Historial</button></div>';

  html += '<div class="app-tab-content active" id="tab-solicitar"><div class="app-section"><div class="app-section-title">Nueva solicitud</div>' +
    '<div class="app-form-group"><label class="app-form-label">Tipo de negocio</label><select class="app-form-select" id="credTipo"><option>E-commerce</option><option>Creador de contenido</option><option>Servicios digitales</option><option>SaaS / App</option><option>Marketing digital</option><option>Otro</option></select></div>' +
    '<div class="app-form-group"><label class="app-form-label">Ingresos mensuales (COP)</label><input class="app-form-input" type="number" id="credIngresos" value="3000000"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Meses con el negocio</label><input class="app-form-input" type="number" id="credMeses" value="12"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Monto (COP)</label><input class="app-form-input" type="number" id="credMonto" value="1000000"></div>' +
    '<div class="app-form-group"><label class="app-form-label">Plazo</label><select class="app-form-select" id="credPlazo"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90" selected>90 dias</option><option value="120">120 dias</option><option value="180">180 dias</option></select></div>' +
    '<div class="app-form-group"><label class="app-form-label">Historial</label><select class="app-form-select" id="credHistorial"><option>Sin historial</option><option>1 credito pagado</option><option>2-3 creditos pagados</option><option>Mas de 3 creditos</option></select></div>' +
    '<button class="btn-primary btn-large" onclick="solicitarCredito()">Analizar con IA</button></div></div>';

  html += '<div class="app-tab-content" id="tab-mis-creditos">';

  if (creditos && creditos.length > 0) {
    creditos.forEach(c => {
      const progreso = c.num_cuotas > 0 ? (c.cuotas_pagadas / c.num_cuotas) * 100 : 0;
      html += '<div class="app-section" style="padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:12px;"><div style="font-weight:700; color:var(--dark);">Credito #' + c.id + '</div><div class="badge ' + (c.estado === 'activo' ? 'badge-green' : 'badge-blue') + '">' + c.estado + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px; color:var(--text);">' +
        '<div><div style="font-size:12px;color:var(--text-light);">Monto</div><div style="font-weight:700;">' + formatearDinero(c.monto_aprobado) + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Tasa</div><div style="font-weight:700;">' + c.tasa_anual + '%</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Saldo</div><div style="font-weight:700;">' + formatearDinero(c.saldo_pendiente) + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Cuotas</div><div style="font-weight:700;">' + c.cuotas_pagadas + '/' + c.num_cuotas + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Valor Cuota</div><div style="font-weight:700;">' + formatearDinero(c.valor_cuota) + '</div></div>' +
        '</div><div style="width:100%; height:8px; background:var(--bg-soft); border-radius:100px; margin:16px 0;"><div style="height:100%; width:' + progreso + '%; background:var(--primary); border-radius:100px;"></div></div>' +
        (c.estado === 'activo' ? '<button class="btn-primary btn-large" onclick="pagarCuota(' + c.id + ', ' + c.valor_cuota + ')">💳 Pagar Cuota</button>' : '<p style="text-align:center; color:var(--green); font-weight:700;">🎉 Crédito Pagado</p>') +
        '<button class="btn-secondary-sm" onclick="generarContratoPDF(' + c.id + ')" style="margin-top:8px;">📄 Descargar contrato</button></div>';
    });
  } else {
    html += '<div class="app-section"><p style="color:var(--text-light);">No tienes creditos activos.</p></div>';
  }

  html += '</div><div class="app-tab-content" id="tab-historial-cred"><div class="app-section"><div class="app-section-title">Historial</div>';

  if (solicitudes && solicitudes.length > 0) {
    html += '<table class="app-table"><thead><tr><th>Fecha</th><th>Monto</th><th>Score</th><th>Decision</th></tr></thead><tbody>';
    solicitudes.forEach(s => {
      html += '<tr><td>' + formatearFechaCorta(s.created_at) + '</td><td>' + formatearDinero(s.monto_solicitado) + '</td><td>' + (s.score || '-') + '</td><td><span class="badge ' + (s.decision === 'APROBADO' ? 'badge-green' : s.decision === 'RECHAZADO' ? 'badge-red' : 'badge-yellow') + '">' + (s.decision || '-') + '</span></td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:var(--text-light);">No hay solicitudes.</p>';
  }

  html += '</div></div>';
  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function pagarCuota(creditoId, valorCuota) {
  if (!confirm('¿Estás seguro de pagar la cuota por ' + formatearDinero(valorCuota) + '?')) return;
  const saldo = await obtenerSaldo();
  if (saldo < valorCuota) { if (window.toast) toast.error('Saldo insuficiente', 'No tienes fondos'); return; }
  await supabaseClient.rpc('retirar_saldo', { p_monto: valorCuota });
  const { data: credito } = await supabaseClient.from('creditos').select('*').eq('id', creditoId).single();
  const nuevasPagadas = credito.cuotas_pagadas + 1;
  const nuevoSaldo = credito.saldo_pendiente - valorCuota;
  const nuevoEstado = nuevasPagadas >= credito.num_cuotas ? 'pagado' : 'activo';
  await supabaseClient.from('creditos').update({
    cuotas_pagadas: nuevasPagadas, saldo_pendiente: nuevoSaldo, estado: nuevoEstado
  }).eq('id', creditoId);
  if (window.toast) toast.success('Pago exitoso', 'Cuota pagada');
  if (nuevoEstado === 'pagado' && typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    if (window.toast) toast.success('¡Felicidades!', 'Has pagado tu crédito');
  }
  navegarA('creditos');
}

async function solicitarCredito() {
  if (window.toast) toast.info('Analizando...', 'La IA esta revisando tu solicitud');

  const monto = parseFloat(document.getElementById('credMonto').value) || 1000000;
  const plazo = parseInt(document.getElementById('credPlazo').value) || 90;
  const tipo = document.getElementById('credTipo').value;
  const userId = localStorage.getItem('user_id');

  await new Promise(r => setTimeout(r, 1500));

  const tasaAnual = 15; // 15% E.A.
  const numCuotas = Math.max(1, Math.floor(plazo / 30));
  const tasaPeriodo = (tasaAnual / 100) * (plazo / 365); // Interés simple para el plazo
  
  const totalIntereses = monto * tasaPeriodo;
  const totalPagar = monto + totalIntereses;
  const valorCuota = totalPagar / numCuotas;

  // 1. Guardamos la solicitud
  const { data: solicitud, error: errSol } = await supabaseClient.from('solicitudes').insert({
    user_id: userId,
    monto_solicitado: monto,
    plazo_dias: plazo,
    tipo_negocio: tipo,
    ingresos_mensuales: 3000000,
    score: 750,
    decision: 'APROBADO',
    monto_aprobado: monto,
    tasa_sugerida: tasaAnual
  }).select().single();

  if (errSol) { if (window.toast) toast.error('Error en solicitud', errSol.message); return; }

  // 2. Creamos el crédito con TODOS los campos obligatorios calculados
  const { error: errCred } = await supabaseClient.from('creditos').insert({
    user_id: userId,
    solicitud_id: solicitud.id,
    monto_aprobado: monto,
    tasa_anual: tasaAnual,
    plazo_dias: plazo,
    num_cuotas: numCuotas,
    valor_cuota: valorCuota,
    total_intereses: totalIntereses,
    total_pagar: totalPagar,
    saldo_pendiente: totalPagar,
    estado: 'activo',
    cuotas_pagadas: 0
  });

  if (errCred) { if (window.toast) toast.error('Error en crédito', errCred.message); return; }

  // 3. Desembolso del dinero a la cuenta
  await supabaseClient.rpc('recargar_saldo', { p_monto: monto });

  // 4. Registramos el movimiento
  await supabaseClient.from('movimientos').insert({
    user_id: userId,
    tipo: 'ingreso',
    monto: monto,
    descripcion: 'Desembolso de crédito NexusCredit'
  });

  // 5. Notificamos
  await crearNotificacion(userId, '💸 Crédito Desembolsado', 'Se han consignado ' + formatearDinero(monto) + ' en tu cuenta.', 'success');

  if (window.toast) toast.success('¡Crédito Aprobado!', 'El dinero ya está en tu cuenta');

  navegarA('dashboard');
}
async function generarContratoPDF(creditoId) {
  const userId = localStorage.getItem('user_id');
  const { data: credito } = await supabaseClient.from('creditos').select('*').eq('id', creditoId).single();
  const { data: cuotas } = await supabaseClient.from('cuotas').select('*').eq('credito_id', creditoId).order('numero');
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
  if (!credito) { if (window.toast) toast.error('No encontrado', 'Credito no encontrado'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('NEXUSPAY', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Contrato de Microcredito Digital', 105, 27, { align: 'center' });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(20, 32, 190, 32);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACION DEL CLIENTE', 20, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const nombres = ((profile?.nombres || '') + ' ' + (profile?.apellidos || '')).trim() || 'No registrado';
  doc.text('Nombre: ' + nombres, 20, 54);
  doc.text('Cedula: ' + (profile?.cedula || 'N/A'), 20, 60);
  doc.text('Telefono: ' + (profile?.telefono || 'N/A'), 20, 66);
  doc.text('Email: ' + (localStorage.getItem('user_email') || ''), 20, 72);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CONDICIONES DEL CREDITO', 20, 86);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Monto aprobado: ' + formatearDinero(credito.monto_aprobado), 20, 95);
  doc.text('Tasa anual: ' + credito.tasa_anual + '%', 20, 101);
  doc.text('Plazo: ' + credito.plazo_dias + ' dias', 20, 107);
  doc.text('Numero de cuotas: ' + credito.num_cuotas, 20, 113);
  doc.text('Valor por cuota: ' + formatearDinero(credito.valor_cuota), 20, 119);
  doc.text('Total intereses: ' + formatearDinero(credito.total_intereses || 0), 20, 125);
  doc.text('Total a pagar: ' + formatearDinero(credito.total_pagar || credito.monto_aprobado), 20, 131);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN DE PAGOS', 20, 145);

  doc.setFontSize(9);
  doc.setFillColor(30, 41, 59);
  doc.setTextColor(255, 255, 255);
  doc.rect(20, 150, 15, 7, 'F');
  doc.rect(35, 150, 35, 7, 'F');
  doc.rect(70, 150, 35, 7, 'F');
  doc.rect(105, 150, 35, 7, 'F');
  doc.rect(140, 150, 35, 7, 'F');
  doc.text('No.', 27, 155, { align: 'center' });
  doc.text('Vencimiento', 52, 155, { align: 'center' });
  doc.text('Valor', 87, 155, { align: 'center' });
  doc.text('Capital', 122, 155, { align: 'center' });
  doc.text('Intereses', 157, 155, { align: 'center' });

  let y = 162;
  doc.setTextColor(51, 65, 85);
  if (cuotas && cuotas.length > 0) {
    cuotas.forEach(c => {
      doc.rect(20, y, 15, 6);
      doc.rect(35, y, 35, 6);
      doc.rect(70, y, 35, 6);
      doc.rect(105, y, 35, 6);
      doc.rect(140, y, 35, 6);
      doc.text(String(c.numero), 27, y + 4, { align: 'center' });
      doc.text(c.fecha_vencimiento || '', 52, y + 4, { align: 'center' });
      doc.text(formatearDinero(c.valor), 87, y + 4, { align: 'center' });
      doc.text(formatearDinero(c.capital), 122, y + 4, { align: 'center' });
      doc.text(formatearDinero(c.intereses), 157, y + 4, { align: 'center' });
      y += 6;
      if (y > 260) { doc.addPage(); y = 20; }
    });
  }

  doc.save('contrato_nexuspay_' + creditoId + '.pdf');
  if (window.toast) toast.success('PDF descargado', 'Contrato #' + creditoId);
}

// ============ NEXUSBOX ============

async function renderNexusBox() {
  const userId = localStorage.getItem('user_id');
  const { data: cajitas } = await supabaseClient.from('cajitas').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  let saldoTotal = 0, rendimientoTotal = 0, rendimientoHoy = 0;
  if (cajitas) {
    cajitas.forEach(c => {
      saldoTotal += Number(c.saldo);
      rendimientoTotal += Number(c.rendimiento_acumulado);
      rendimientoHoy += Number(c.saldo) * Number(c.tasa_diaria);
    });
  }

  let html = `
    <div class="dash-grid-2col">
      <div class="widget-metric"><div class="widget-icon blue">🎁</div><div class="widget-info"><div class="label">Total en cajitas</div><div class="value">${formatearDinero(saldoTotal)}</div></div></div>
      <div class="widget-metric"><div class="widget-icon green">📈</div><div class="widget-info"><div class="label">Rendimiento acumulado</div><div class="value text-green">+${formatearDinero(rendimientoTotal)}</div></div></div>
    </div>

    <div class="app-section" style="background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%); border: 2px solid #2563EB; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <div style="font-size: 16px; font-weight: 800; color: var(--dark); margin-bottom: 4px;">Tus cajitas generan rendimiento diario</div>
        <div style="font-size: 14px; color: var(--text-light);">Guarda plata para tus metas y gana hasta 10.5% anual.</div>
      </div>
      <button class="btn-primary" onclick="abrirNuevaCajita()">+ Crear nueva cajita</button>
    </div>
  `;

  if (cajitas && cajitas.length > 0) {
    html += '<div class="cajitas-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';
    cajitas.forEach(c => {
      const rendimientoHoyCajita = Number(c.saldo) * Number(c.tasa_diaria);
      const progreso = c.meta ? Math.min((Number(c.saldo) / Number(c.meta)) * 100, 100) : null;
      html += `<div class="cajita-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px; cursor:pointer;" onclick="verCajita(${c.id})">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;"><div style="font-size:32px;">${c.icono || '🎯'}</div><div style="font-size:16px; font-weight:700; color:var(--dark);">${escapeHtml(c.nombre)}</div></div>
        <div style="font-size:26px; font-weight:800; color:var(--dark); margin-bottom:6px;">${formatearDinero(c.saldo)}</div>
        <div style="display:flex; flex-direction:column; gap:2px; margin-bottom:12px; font-size:14px;"><span style="color: #10B981; font-weight: 700;">+${formatearDinero(rendimientoHoyCajita)} hoy</span><span style="color: var(--text-light); font-size: 13px;">+${formatearDinero(c.rendimiento_acumulado)} total</span></div>
        ${c.meta ? `<div style="width:100%; height:6px; background:var(--bg-soft); border-radius:100px; margin-top:12px;"><div style="height:100%; width:${progreso}%; background:${c.color || '#2563EB'}; border-radius:100px;"></div></div>` : ''}
      </div>`;
    });
    html += '</div>';
  } else {
    html += `<div class="app-section" style="text-align: center; padding: 48px 24px;"><div style="font-size: 64px; margin-bottom: 16px;">🎁</div><div style="font-size: 20px; font-weight: 800; color: var(--dark); margin-bottom: 8px;">Aun no tienes cajitas</div><div style="color: var(--text-light); margin-bottom: 24px;">Crea tu primera cajita y empieza a ganar rendimiento diario</div><button class="btn-primary btn-large" onclick="abrirNuevaCajita()">+ Crear mi primera cajita</button></div>`;
  }

  document.getElementById('pageContent').innerHTML = html;
}

function abrirNuevaCajita() {
  const html = `
    <div id="modalCajita" class="modal-overlay" onclick="if(event.target.id==='modalCajita') cerrarModalCajita()">
      <div class="modal-card">
        <div class="modal-header"><div class="modal-title">Nueva cajita</div><button class="modal-close" onclick="cerrarModalCajita()">×</button></div>
        <div class="app-form-group"><label class="app-form-label">Nombre</label><input class="app-form-input" type="text" id="cajitaNombre" placeholder="Viaje a Japon" maxlength="40"></div>
        <div class="app-form-group"><label class="app-form-label">Icono</label><div class="cajita-iconos-picker" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:8px;">${['🎯','🏝️','🛡️','💻','📱','🚗','🏠','🎓','💍','🎁','💰','✈️','📚','🎮','🏋️'].map(ic => '<button type="button" class="cajita-icono-btn" data-icono="' + ic + '" onclick="seleccionarIcono(\'' + ic + '\')" style="aspect-ratio:1; border:2px solid var(--border); border-radius:12px; background:var(--bg-card); font-size:22px; cursor:pointer;">' + ic + '</button>').join('')}</div></div>
        <div class="app-form-group"><label class="app-form-label">Monto inicial (minimo $10.000)</label><input class="app-form-input" type="number" id="cajitaMonto" placeholder="100000" min="10000" value="100000"></div>
        <div class="app-form-group"><label class="app-form-label">Meta (opcional)</label><input class="app-form-input" type="number" id="cajitaMeta" placeholder="5000000" min="0"></div>
        <div class="app-form-group"><label class="app-form-label">Color</label><div class="cajita-colores-picker" style="display:flex; gap:10px; flex-wrap:wrap;">${[{c:'#2563EB'},{c:'#10B981'},{c:'#F59E0B'},{c:'#EF4444'},{c:'#8B5CF6'},{c:'#EC4899'}].map(x => '<button type="button" class="cajita-color-btn" data-color="' + x.c + '" style="background:' + x.c + '; width:40px; height:40px; border-radius:50%; border:3px solid transparent; cursor:pointer;" onclick="seleccionarColor(\'' + x.c + '\')"></button>').join('')}</div></div>
        <div id="cajitaMessage"></div>
        <button class="btn-primary btn-large" style="margin-top:16px;" onclick="crearCajita()">Crear cajita</button>
      </div>
    </div>
  `;
  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;
  document.body.appendChild(contenedor.firstElementChild);
  seleccionarIcono('🎯');
  seleccionarColor('#2563EB');
}

let cajitaIconoSeleccionado = '🎯';
let cajitaColorSeleccionado = '#2563EB';

function seleccionarIcono(icono) {
  cajitaIconoSeleccionado = icono;
  document.querySelectorAll('.cajita-icono-btn').forEach(btn => btn.classList.toggle('selected', btn.getAttribute('data-icono') === icono));
  document.querySelectorAll('.cajita-icono-btn').forEach(btn => {
    if(btn.getAttribute('data-icono') === icono) btn.style.borderColor = '#2563EB';
    else btn.style.borderColor = 'var(--border)';
  });
}

function seleccionarColor(color) {
  cajitaColorSeleccionado = color;
  document.querySelectorAll('.cajita-color-btn').forEach(btn => {
    if(btn.getAttribute('data-color') === color) btn.style.borderColor = 'var(--dark)';
    else btn.style.borderColor = 'transparent';
  });
}

function cerrarModalCajita() {
  const modal = document.getElementById('modalCajita');
  if (modal) modal.remove();
}

async function crearCajita() {
  const nombre = document.getElementById('cajitaNombre').value.trim();
  const monto = parseFloat(document.getElementById('cajitaMonto').value);
  const meta = parseFloat(document.getElementById('cajitaMeta').value) || null;
  const msg = document.getElementById('cajitaMessage');

  if (!nombre) { msg.innerHTML = mostrarAlerta('Escribe un nombre', 'error'); return; }
  if (!monto || monto < 10000) { msg.innerHTML = mostrarAlerta('Minimo $10.000', 'error'); return; }

  msg.innerHTML = '<div class="alert alert-info">Creando cajita...</div>';
  const { data, error } = await supabaseClient.rpc('crear_cajita', {
    p_nombre: nombre, p_icono: cajitaIconoSeleccionado, p_saldo_inicial: monto, p_meta: meta, p_color: cajitaColorSeleccionado,
  });

  if (error) { msg.innerHTML = mostrarAlerta('Error: ' + error.message, 'error'); return; }

  if (data && data.success) {
    if (window.toast) toast.success('Cajita creada', nombre + ' con ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    cerrarModalCajita();
    navegarA('nexusbox');
  } else {
    msg.innerHTML = mostrarAlerta(data ? data.message : 'Error', 'error');
  }
}

async function verCajita(cajitaId) {
  const userId = localStorage.getItem('user_id');
  const { data: cajita } = await supabaseClient.from('cajitas').select('*').eq('id', cajitaId).eq('user_id', userId).single();
  if (!cajita) { if (window.toast) toast.error('No encontrada', 'Cajita no encontrada'); return; }

  const { data: movimientos } = await supabaseClient.from('cajitas_movimientos').select('*').eq('cajita_id', cajitaId).order('created_at', { ascending: false }).limit(20);
  const rendimientoHoy = Number(cajita.saldo) * Number(cajita.tasa_diaria);
  const tasaAnual = Number(cajita.tasa_diaria) * 365 * 100;
  const progreso = cajita.meta ? Math.min((Number(cajita.saldo) / Number(cajita.meta)) * 100, 100) : null;

  let html = `
    <button class="btn-secondary-sm" onclick="navegarA('nexusbox')" style="margin-bottom: 16px;">← Volver a cajitas</button>
    <div class="app-section" style="text-align: center; background: linear-gradient(135deg, ${cajita.color}15 0%, ${cajita.color}05 100%); border: 2px solid ${cajita.color};">
      <div style="font-size: 56px; margin-bottom: 8px;">${cajita.icono || '🎯'}</div>
      <div style="font-size: 20px; font-weight: 800; color: var(--dark); margin-bottom: 4px;">${escapeHtml(cajita.nombre)}</div>
      <div style="font-size: 32px; font-weight: 900; color: var(--dark); margin-bottom: 4px;">${formatearDinero(cajita.saldo)}</div>
      <div style="color: #10B981; font-weight: 700; font-size: 15px;">+${formatearDinero(rendimientoHoy)} hoy</div>
      <div style="color: var(--text-light); font-size: 12px; margin-top: 4px;">Tasa: ${tasaAnual.toFixed(1)}% anual</div>
    </div>
    <div class="app-tabs">
      <button class="app-tab active" data-tab="meter">📥 Meter plata</button>
      <button class="app-tab" data-tab="sacar">📤 Sacar plata</button>
      <button class="app-tab" data-tab="historial-cajita">📋 Historial</button>
    </div>
    <div class="app-tab-content active" id="tab-meter">
      <div class="app-section"><div class="app-section-title">Meter plata</div><div class="app-form-group"><label class="app-form-label">Monto (minimo $1.000)</label><input class="app-form-input" type="number" id="meterMonto" placeholder="50000" min="1000" value="50000"></div><button class="btn-primary btn-large" onclick="meterPlata(${cajitaId})">📥 Meter a la cajita</button></div>
    </div>
    <div class="app-tab-content" id="tab-sacar">
      <div class="app-section"><div class="app-section-title">Sacar plata</div><div class="app-form-group"><label class="app-form-label">Monto (minimo $1.000)</label><input class="app-form-input" type="number" id="sacarMonto" placeholder="50000" min="1000" value="50000"></div><button class="btn-primary btn-large" onclick="sacarPlata(${cajitaId})">📤 Sacar a mi cuenta</button></div>
    </div>
    <div class="app-tab-content" id="tab-historial-cajita">
      <div class="app-section"><div class="app-section-title">Movimientos</div>
        ${movimientos && movimientos.length > 0 ? `<table class="app-table"><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${movimientos.map(m => { const icono = m.tipo === 'ingreso' ? '📥' : m.tipo === 'retiro' ? '📤' : '💰'; const clase = m.tipo === 'retiro' ? 'text-red' : 'text-green'; const signo = m.tipo === 'retiro' ? '-' : '+'; return '<tr><td>' + formatearFechaCorta(m.created_at) + '</td><td>' + icono + ' ' + (m.descripcion || m.tipo) + '</td><td class="' + clase + '" style="text-align:right;">' + signo + formatearDinero(m.monto) + '</td></tr>'; }).join('')}</tbody></table>` : '<p style="color:var(--text-light);">No hay movimientos.</p>'}
      </div>
    </div>
    <div class="app-section"><button class="btn-secondary" style="width: 100%; justify-content: center; color: var(--red); border-color: var(--red);" onclick="confirmarEliminarCajita(${cajita.id}, '${escapeHtml(cajita.nombre)}', ${cajita.saldo})">🗑️ Eliminar cajita</button></div>
  `;

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function meterPlata(cajitaId) {
  const monto = parseFloat(document.getElementById('meterMonto').value);
  if (!monto || monto < 1000) { if (window.toast) toast.error('Monto minimo', 'Minimo $1.000'); return; }
  if (window.toast) toast.info('Procesando...', 'Metiendo plata a la cajita');
  const { data, error } = await supabaseClient.rpc('meter_a_cajita', { p_cajita_id: cajitaId, p_monto: monto });
  if (error) { if (window.toast) toast.error('Error', error.message); return; }
  if (data && data.success) {
    if (window.toast) toast.success('Listo', 'Metiste ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    verCajita(cajitaId);
  } else {
    if (window.toast) toast.error('Error', data ? data.message : 'No se pudo');
  }
}

async function sacarPlata(cajitaId) {
  const monto = parseFloat(document.getElementById('sacarMonto').value);
  if (!monto || monto < 1000) { if (window.toast) toast.error('Monto minimo', 'Minimo $1.000'); return; }
  if (window.toast) toast.info('Procesando...', 'Sacando plata de la cajita');
  const { data, error } = await supabaseClient.rpc('sacar_de_cajita', { p_cajita_id: cajitaId, p_monto: monto });
  if (error) { if (window.toast) toast.error('Error', error.message); return; }
  if (data && data.success) {
    if (window.toast) toast.success('Listo', 'Sacaste ' + formatearDinero(monto));
    await actualizarSaldoSidebar();
    verCajita(cajitaId);
  } else {
    if (window.toast) toast.error('Error', data ? data.message : 'No se pudo');
  }
}

async function confirmarEliminarCajita(cajitaId, nombre, saldo) {
  const html = `<div id="modalEliminar" class="modal-overlay" onclick="if(event.target.id==='modalEliminar') cerrarModalEliminar()"><div class="modal-card" style="max-width: 400px;"><div class="modal-header"><div class="modal-title">Eliminar cajita</div><button class="modal-close" onclick="cerrarModalEliminar()">×</button></div><div style="text-align: center; padding: 8px 0 16px;"><div style="font-size: 48px; margin-bottom: 12px;">🗑️</div><div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: var(--dark);">¿Eliminar "${nombre}"?</div><div style="font-size: 14px; color: var(--text-light);">Se devolveran <strong>${formatearDinero(saldo)}</strong> a tu cuenta.</div></div><div style="display: flex; gap: 8px; margin-top: 16px;"><button class="btn-secondary" style="flex: 1; justify-content: center;" onclick="cerrarModalEliminar()">Cancelar</button><button class="btn-primary" style="flex: 1; justify-content: center; background: var(--red);" onclick="eliminarCajita(${cajitaId})">Eliminar</button></div></div></div>`;
  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;
  document.body.appendChild(contenedor.firstElementChild);
}

function cerrarModalEliminar() {
  const modal = document.getElementById('modalEliminar');
  if (modal) modal.remove();
}

async function eliminarCajita(cajitaId) {
  cerrarModalEliminar();
  if (window.toast) toast.info('Eliminando...', 'Cerrando la cajita');
  const { data, error } = await supabaseClient.rpc('eliminar_cajita', { p_cajita_id: cajitaId });
  if (error) { if (window.toast) toast.error('Error', error.message); return; }
  if (data && data.success) {
    if (window.toast) toast.success('Cajita eliminada', 'El saldo volvio a tu cuenta');
    await actualizarSaldoSidebar();
    navegarA('nexusbox');
  } else {
    if (window.toast) toast.error('Error', data ? data.message : 'No se pudo');
  }
}

// ============ PERFIL ============

async function renderPerfil() {
  const userId = localStorage.getItem('user_id');
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
  const email = localStorage.getItem('user_email');

  const nombre = profile?.nombres || '';
  const apellidos = profile?.apellidos || '';
  const cedula = profile?.cedula || '';
  const telefono = profile?.telefono || '';
  const fotoUrl = profile?.foto_perfil_url || '';

  const inicial = (nombre.charAt(0) || email.charAt(0) || 'U').toUpperCase();

  const html = `
    <div class="app-section" style="text-align:center;">
      <div style="position:relative; display:inline-block; margin-bottom:16px;">
        <div style="width: 110px; height: 110px; border-radius: 50%; background: linear-gradient(135deg, #2563EB 0%, #10B981 100%); display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 900; color: #FFFFFF; overflow: hidden; border: 4px solid var(--bg-card); box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);">
          ${fotoUrl ? '<img src="' + fotoUrl + '" style="width:100%;height:100%;object-fit:cover;">' : '<span>' + inicial + '</span>'}
        </div>
        <button style="position:absolute; bottom:0; right:0; width:36px; height:36px; border-radius:50%; background:#2563EB; color:#FFF; border:3px solid var(--bg-card); cursor:pointer;" onclick="document.getElementById('fotoInput').click()">📷</button>
        <input type="file" id="fotoInput" accept="image/*" style="display:none;" onchange="subirFotoPerfil(event)">
      </div>

      <div style="font-size:22px; font-weight:800; color:var(--dark); margin-bottom:4px;">
        ${(nombre + ' ' + apellidos).trim() || 'Sin nombre'}
      </div>
      <div style="font-size:14px; color:var(--text-light); margin-bottom:12px;">${email}</div>
    </div>

    <div class="app-section">
      <div class="app-section-title">Informacion personal</div>
      <div class="app-form-group"><label class="app-form-label">Nombres</label><input class="app-form-input" type="text" id="perfilNombres" value="${escapeHtml(nombre)}"></div>
      <div class="app-form-group"><label class="app-form-label">Apellidos</label><input class="app-form-input" type="text" id="perfilApellidos" value="${escapeHtml(apellidos)}"></div>
      <div class="app-form-group"><label class="app-form-label">Cedula</label><input class="app-form-input" type="text" id="perfilCedula" value="${escapeHtml(cedula)}"></div>
      <div class="app-form-group"><label class="app-form-label">Telefono</label><input class="app-form-input" type="tel" id="perfilTelefono" value="${escapeHtml(telefono)}"></div>
      <button class="btn-primary btn-large" onclick="guardarDatosPerfil()">💾 Guardar cambios</button>
    </div>

    <div class="app-section">
      <div class="app-section-title">Seguridad</div>
      <button class="btn-secondary" style="width:100%; justify-content:center; margin-bottom:12px;" onclick="document.getElementById('cambioPasswordBox').style.display = document.getElementById('cambioPasswordBox').style.display === 'none' ? 'block' : 'none'">🔒 Cambiar contrasena</button>
      <div id="cambioPasswordBox" style="display:none; margin-top:12px;">
        <div class="app-form-group"><label class="app-form-label">Nueva contrasena</label><input class="app-form-input" type="password" id="perfilNuevaPassword"></div>
        <div class="app-form-group"><label class="app-form-label">Confirmar contrasena</label><input class="app-form-input" type="password" id="perfilNuevaPassword2"></div>
        <button class="btn-primary" style="width:100%; justify-content:center;" onclick="cambiarPassword()">Guardar nueva contrasena</button>
      </div>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;
}

async function guardarDatosPerfil() {
  const userId = localStorage.getItem('user_id');
  const nombres = document.getElementById('perfilNombres').value.trim();
  const apellidos = document.getElementById('perfilApellidos').value.trim();
  const cedula = document.getElementById('perfilCedula').value.trim();
  const telefono = document.getElementById('perfilTelefono').value.trim();

  if (!nombres || !apellidos) { if (window.toast) toast.error('Faltan datos', 'Nombres y apellidos son obligatorios'); return; }
  if (window.toast) toast.info('Guardando...', 'Actualizando tu perfil');

  const { error } = await supabaseClient.from('profiles').update({ nombres, apellidos, cedula, telefono }).eq('id', userId);

  if (error) { if (window.toast) toast.error('Error', error.message); return; }

  datosPersonales = { nombres, apellidos, cedula, telefono };
  await cargarMenuPerfil();
  if (window.toast) toast.success('Perfil actualizado', 'Tus datos fueron guardados');
  renderPerfil();
}

async function subirFotoPerfil(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { if (window.toast) toast.error('Imagen muy grande', 'Maximo 2 MB'); return; }

  const userId = localStorage.getItem('user_id');
  if (window.toast) toast.info('Subiendo...', 'Guardando tu foto de perfil');

  try {
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = 'perfil_' + userId + '_' + Date.now() + '.' + extension;
    const { error } = await supabaseClient.storage.from('verificaciones').upload(fileName, file, { contentType: file.type, upsert: true });
    if (error) throw new Error(error.message);

    const { data: publicData } = supabaseClient.storage.from('verificaciones').getPublicUrl(fileName);
    const { error: errUpdate } = await supabaseClient.from('profiles').update({ foto_perfil_url: publicData.publicUrl }).eq('id', userId);
    if (errUpdate) throw new Error(errUpdate.message);

    if (window.toast) toast.success('Foto actualizada', 'Tu nuevo avatar esta listo');
    cargarMenuPerfil();
    renderPerfil();
  } catch (e) {
    if (window.toast) toast.error('Error', e.message);
  }
}

async function cambiarPassword() {
  const pwd1 = document.getElementById('perfilNuevaPassword').value;
  const pwd2 = document.getElementById('perfilNuevaPassword2').value;

  if (!pwd1 || pwd1.length < 8) { if (window.toast) toast.error('Contrasena corta', 'Minimo 8 caracteres'); return; }
  if (pwd1 !== pwd2) { if (window.toast) toast.error('No coinciden', 'Las contrasenas no son iguales'); return; }

  if (window.toast) toast.info('Actualizando...', 'Cambiando tu contrasena');
  const { error } = await supabaseClient.auth.updateUser({ password: pwd1 });

  if (error) { if (window.toast) toast.error('Error', error.message); return; }

  if (window.toast) toast.success('Contrasena actualizada', 'Usa la nueva en tu proximo inicio');
  document.getElementById('cambioPasswordBox').style.display = 'none';
}

// ============ VERIFICACION ============

async function renderVerificacion() {
  const userId = localStorage.getItem('user_id');
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();

  let html = '<div class="app-section"><div class="app-section-title">Datos personales</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
    '<div><div style="font-size:12px;color:var(--text-light);">Nombres</div><div style="font-weight:700; color:var(--text);">' + (profile?.nombres || 'No registrado') + '</div></div>' +
    '<div><div style="font-size:12px;color:var(--text-light);">Apellidos</div><div style="font-weight:700; color:var(--text);">' + (profile?.apellidos || 'No registrado') + '</div></div>' +
    '<div><div style="font-size:12px;color:var(--text-light);">Cedula</div><div style="font-weight:700; color:var(--text);">' + (profile?.cedula || 'No registrada') + '</div></div>' +
    '<div><div style="font-size:12px;color:var(--text-light);">Telefono</div><div style="font-weight:700; color:var(--text);">' + (profile?.telefono || 'No registrado') + '</div></div></div></div>';

  html += '<div class="app-section"><div class="app-section-title">Verificacion con camara</div><p style="color:var(--text-light);margin-bottom:16px;">Toma una foto de tu rostro.</p>' +
    '<div style="text-align:center;"><video id="videoCam" autoplay playsinline muted style="width:100%;max-width:400px;border-radius:16px;background:#000;display:block;margin:0 auto 16px;"></video><canvas id="canvasFoto" style="display:none;"></canvas>' +
    '<div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
    '<button class="btn-primary" onclick="iniciarCamara()">📸 Activar camara</button>' +
    '<button class="btn-primary" onclick="capturarFoto(\'' + userId + '\')">✅ Tomar foto</button></div></div></div>';

  document.getElementById('pageContent').innerHTML = html;
}

async function iniciarCamara() {
  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    const video = document.getElementById('videoCam');
    video.srcObject = streamCamara;
    if (window.toast) toast.info('Camara activa', 'Ubicate bien y presiona Tomar foto');
  } catch (e) {
    if (window.toast) toast.error('Sin acceso a camara', e.message);
  }
}

async function capturarFoto(userId) {
  const video = document.getElementById('videoCam');
  const canvas = document.getElementById('canvasFoto');
  if (!video.srcObject) { if (window.toast) toast.error('Camara apagada', 'Primero activa la camara'); return; }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  if (window.toast) toast.info('Procesando...', 'Guardando foto');
  canvas.toBlob(async function (blob) {
    const fileName = userId + '_' + Date.now() + '.jpg';
    const { error } = await supabaseClient.storage.from('verificaciones').upload(fileName, blob, { contentType: 'image/jpeg' });
    if (error) { if (window.toast) toast.error('Error al subir', error.message); return; }
    const { data: publicData } = supabaseClient.storage.from('verificaciones').getPublicUrl(fileName);
    await supabaseClient.from('profiles').update({
      foto_verificacion_url: publicData.publicUrl, verificacion_estado: 'verificado', verificacion_fecha: new Date().toISOString(), verificado: true,
    }).eq('id', userId);
    if (streamCamara) streamCamara.getTracks().forEach(t => t.stop());
    if (window.toast) toast.success('Verificacion completada', 'Tu identidad fue verificada');
    setTimeout(() => navegarA('verificacion'), 2000);
  }, 'image/jpeg', 0.85);
}

// ============ NOTIFICACIONES ============

async function renderNotificaciones() {
  const userId = localStorage.getItem('user_id');
  const { data: notifs } = await supabaseClient.from('notificaciones').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);

  let html = '';
  if (!notifs || notifs.length === 0) {
    html = '<div class="app-section"><p style="color:var(--text-light);">No tienes notificaciones.</p></div>';
  } else {
    const noLeidas = notifs.filter(n => !n.leida).length;
    if (noLeidas > 0) {
      html += '<div class="alert alert-warning">Tienes ' + noLeidas + ' sin leer <button class="btn-secondary-sm" onclick="marcarTodasLeidas(\'' + userId + '\')" style="margin-left:12px;">Marcar todas</button></div>';
    }
    notifs.forEach(n => {
      html += '<div class="app-section" style="display:flex; gap:12px; padding:16px; margin-bottom:12px; ' + (!n.leida ? 'border-left: 4px solid var(--primary);' : '') + '"><div style="font-size:24px;">' + (n.leida ? '📭' : '📬') + '</div><div><div style="font-weight:700; color:var(--dark);">' + n.titulo + '</div><div style="color:var(--text-light); font-size:14px; margin:4px 0;">' + n.mensaje + '</div><div style="color:#94A3B8; font-size:12px;">' + formatearFecha(n.created_at) + '</div></div></div>';
    });
  }
  document.getElementById('pageContent').innerHTML = html;
}

async function marcarTodasLeidas(userId) {
  await supabaseClient.from('notificaciones').update({ leida: true }).eq('user_id', userId).eq('leida', false);
  if (window.toast) toast.success('Notificaciones leidas', 'Todas marcadas como leidas');
  navegarA('notificaciones');
}

// ============ AYUDA ============

async function renderAyuda() {
  const faqs = [
    { q: '¿Cómo recargo mi cuenta?', a: 'Ve a NexusPagos, haz clic en "Recargar" e ingresa el monto.' },
    { q: '¿Qué pasa si congelo mi tarjeta?', a: 'Tu tarjeta quedará bloqueada. Puedes descongelarla cuando quieras.' },
    { q: '¿Cómo funcionan las Cajitas?', a: 'Son espacios para ahorrar con rendimiento diario.' },
    { q: '¿Cuánto demora un crédito?', a: 'La IA analiza tu perfil en segundos y se consigna de inmediato si es aprobado.' }
  ];
  let html = '<div class="app-section"><div class="app-section-title">¿En qué podemos ayudarte?</div>';
  faqs.forEach(f => {
    html += '<div class="faq-item" onclick="this.classList.toggle(\'active\')"><div class="faq-question">' + f.q + ' <span>▾</span></div><div class="faq-answer">' + f.a + '</div></div>';
  });
  html += '</div>';
  document.getElementById('pageContent').innerHTML = html;
}

// ============ CHAT CON LUCI ============

function toggleChat() {
  document.getElementById('chatWindow').classList.toggle('open');
}

async function enviarChat() {
  const input = document.getElementById('chatInput');
  const mensaje = input.value.trim();
  if (!mensaje) return;

  const mensajes = document.getElementById('chatMessages');
  mensajes.innerHTML += '<div class="chat-message chat-user">' + escapeHtml(mensaje) + '</div>';
  input.value = '';
  mensajes.scrollTop = mensajes.scrollHeight;

  const loading = document.createElement('div');
  loading.className = 'chat-message chat-bot chat-loading';
  loading.textContent = 'Luci esta escribiendo...';
  loading.id = 'chatLoading';
  mensajes.appendChild(loading);
  mensajes.scrollTop = mensajes.scrollHeight;

  try {
    const saldo = await obtenerSaldo();
    const nombre = (datosPersonales && datosPersonales.nombres) ? datosPersonales.nombres : 'Usuario';

    const systemPrompt = `Eres ${CONFIG.ASISTENTE_NOMBRE}, la asistente virtual de NexusPay, un banco digital colombiano.
PERSONALIDAD: Te llamas ${CONFIG.ASISTENTE_NOMBRE}. Eres cálida, cercana y eficiente. Hablas en español y tuteas. Máximo 3 líneas.
CONTEXTO: Nombre: ${nombre}, Tipo: ${tipoUsuario}, Saldo: ${formatearDinero(saldo)}.
PRODUCTOS: NexusCredit, NexusPagos, NexusCard, NexusSave, NexusInvest, NexusShield, NexusBusiness, NexusAnalytics, NexusBox, CDT.`;

    const historialTexto = chatHistorial.slice(-6).map(m => (m.rol === 'user' ? 'Usuario: ' : 'Luci: ') + m.texto).join('\n');
    const promptCompleto = systemPrompt + '\n\n' + (historialTexto ? 'CONVERSACION:\n' + historialTexto + '\n\n' : '') + 'Usuario: ' + mensaje;

    const response = await fetch(CONFIG.URL_GEMINI + CONFIG.MODELO_GEMINI + ':generateContent?key=' + CONFIG.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 250 }
      }),
    });

    const result = await response.json();
    if (!result.candidates || !result.candidates[0]) throw new Error(result.error?.message || 'Error IA');

    const respuesta = result.candidates[0].content.parts[0].text;
    const loadingEl = document.getElementById('chatLoading');
    if (loadingEl) loadingEl.remove();

    chatHistorial.push({ rol: 'user', texto: mensaje });
    chatHistorial.push({ rol: 'bot', texto: respuesta });
    if (chatHistorial.length > 10) chatHistorial = chatHistorial.slice(-10);

    mensajes.innerHTML += '<div class="chat-message chat-bot">' + escapeHtml(respuesta) + '</div>';
    mensajes.scrollTop = mensajes.scrollHeight;

  } catch (e) {
    const loadingEl = document.getElementById('chatLoading');
    if (loadingEl) loadingEl.remove();
    mensajes.innerHTML += '<div class="chat-message chat-bot">Lo siento, hubo un error.</div>';
    mensajes.scrollTop = mensajes.scrollHeight;
    if (window.toast) toast.error('Error en chat', e.message);
  }
}
