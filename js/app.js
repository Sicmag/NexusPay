// ============================================================
// NexusPay - App Principal (SPA) - v28 (Crédito bancario para personas naturales)
// Alineado al Proyecto SENA
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

function reproducirSonido() {
  try {
    const audio = document.getElementById('sonidoApp');
    if (audio) { audio.currentTime = 0; audio.play(); }
  } catch (e) { console.log('Audio bloqueado por el navegador'); }
}

function seleccionarServicio(elemento, nombreServicio) {
  document.querySelectorAll('.servicio-item').forEach(el => el.classList.remove('selected'));
  elemento.classList.add('selected');
  document.getElementById('servicioNombre').value = nombreServicio;
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
  iniciarMenuMovil();

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

// ---- Menú lateral responsive (sidebar + overlay + bloqueo de scroll) ----

function obtenerSidebar() {
  return document.getElementById('appSidebar') || document.querySelector('.app-sidebar');
}

// Si el HTML no tiene la capa oscura, se crea sola
function obtenerOverlay() {
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function toggleMenu(open) {
  const sidebar = obtenerSidebar();
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  obtenerOverlay().classList.toggle('show', open);
  document.body.classList.toggle('no-scroll', open);
}

function toggleSidebar() {
  const sidebar = obtenerSidebar();
  if (sidebar) toggleMenu(!sidebar.classList.contains('open'));
}

function cerrarMenu() { toggleMenu(false); }

function iniciarMenuMovil() {
  obtenerOverlay().addEventListener('click', cerrarMenu);

  // Si el botón ya tiene onclick="toggleSidebar()" en el HTML, no se duplica el evento
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (menuBtn && !menuBtn.hasAttribute('onclick')) menuBtn.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.sidebar-link').forEach(l => l.addEventListener('click', cerrarMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1024) cerrarMenu(); });
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
  cerrarMenu();

  document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
  const linkActivo = document.querySelector('.sidebar-link[data-page="' + page + '"]');
  if (linkActivo) linkActivo.classList.add('active');

  const titulos = {
    dashboard: ['Inicio', 'Resumen de tu cuenta'],
    flowpay: ['Transactions', 'Transferencias y pagos'],
    flowcard: ['Credit Cards', 'Tu tarjeta digital'],
    flowsave: ['Savings', 'Ahorro programado'],
    flowinvest: tipoUsuario === 'natural' ? ['Investments', 'CDT'] : ['Investments', 'NexusInvest'],
    flowshield: ['Services', 'Seguros digitales'],
    flowbusiness: ['Services', 'Cuenta empresarial'],
    flowanalytics: ['Analytics', 'Análisis financiero'],
    nexusbox: ['Accounts', 'Cajitas con rendimiento'],
    activos: ['Activos Circulares', 'Economía circular para tu negocio'],
    creditos: tipoUsuario === 'natural' ? ['Crédito Personal', 'Libre inversión'] : ['FAMILIA NEXAR', 'Microcrédito, Leasing y Factoring'],
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
      case 'activos': await renderActivosCirculares(); break;
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

  // --- LÓGICA FIN-360 (PRESUPUESTO) ---
  const presupuestoGuardado = localStorage.getItem('nexus_presupuesto') || 2000000;
  const porcentajeGastado = presupuestoGuardado > 0 ? (totalEgresos / presupuestoGuardado) * 100 : 0;
  const colorBarra = porcentajeGastado > 90 ? '#EF4444' : (porcentajeGastado > 70 ? '#F59E0B' : '#10B981');

  const html = `
    <div class="dash-grid-2col">
      <div>
        <div class="section-heading">Mis Tarjetas <a href="#" onclick="navegarA('flowcard'); return false;">Ver todas</a></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          
          <div class="credit-card-horizontal blue">
            <div class="cc-top">
              <div>
                <div class="cc-balance-label">Balance <button class="eye-btn" onclick="togglePrivacidad()" style="color:white; font-size:16px; background:none; border:none;">${iconoOjo}</button></div>
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
        <div class="section-heading">Transacciones Recientes</div>
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

    <div class="app-section" style="background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%); border: 2px solid #2563EB; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 800; color: var(--dark);">FIN-360: Presupuesto Mensual</div>
        <button class="btn-secondary-sm" onclick="editarPresupuesto()">⚙️ Editar</button>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--text-light); margin-bottom: 8px;">
        <span>Gastado: <strong>${formatearDinero(totalEgresos)}</strong></span>
        <span>Límite: <strong>${formatearDinero(presupuestoGuardado)}</strong></span>
      </div>
      <div style="width: 100%; height: 12px; background: var(--bg-soft); border-radius: 100px; overflow: hidden;">
        <div style="height: 100%; width: ${Math.min(porcentajeGastado, 100)}%; background: ${colorBarra}; border-radius: 100px; transition: width 0.5s;"></div>
      </div>
      <div style="text-align: right; font-size: 12px; font-weight: 700; color: ${colorBarra}; margin-top: 6px;">${porcentajeGastado.toFixed(1)}% consumido</div>
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
      new Chart(ctxWeekly, {
        type: 'bar',
        data: {
          labels: diasSemana,
          datasets: [
            { label: 'Ingresos', data: ingresosPorDia, backgroundColor: '#CCB3E2', borderRadius: 4 }, // Lila
            { label: 'Egresos', data: egresosPorDia, backgroundColor: '#D1B474', borderRadius: 4 } // Dorado
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: document.body.classList.contains('dark-mode') ? '#E2E8F0' : '#1E293B' } } },
          scales: {
            y: { beginAtZero: true, grid: { display: false }, ticks: { color: document.body.classList.contains('dark-mode') ? '#94A3B8' : '#64748B' } },
            x: { grid: { display: false }, ticks: { color: document.body.classList.contains('dark-mode') ? '#94A3B8' : '#64748B' } }
          }
        }
      });
    }

    const ctxPie = document.getElementById('chartPie');
    if (ctxPie) {
      let gastosServicios = 0, gastosTarjeta = 0, gastosCreditos = 0, otros = 0;
      if (movimientos) {
        movimientos.forEach(m => {
          if (m.tipo === 'egreso') {
            const desc = (m.descripcion || '').toLowerCase();
            if (desc.includes('servicio') || desc.includes('claro') || desc.includes('netflix')) gastosServicios += Number(m.monto);
            else if (desc.includes('tarjeta')) gastosTarjeta += Number(m.monto);
            else if (desc.includes('credito') || desc.includes('cuota')) gastosCreditos += Number(m.monto);
            else otros += Number(m.monto);
          }
        });
      }
      new Chart(ctxPie.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Servicios', 'Tarjeta', 'Créditos', 'Otros'],
          datasets: [{
            data: [gastosServicios, gastosTarjeta, gastosCreditos, otros],
            backgroundColor: ['#D946EF', '#2563EB', '#F59E0B', '#334155'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } }
      });
    }
  }, 100);
}

// ============ FIN-360 (PRESUPUESTO) ============

function editarPresupuesto() {
  const actual = localStorage.getItem('nexus_presupuesto') || '2000000';
  const nuevo = prompt('Ingresa tu límite de gastos mensual (COP):', actual);
  if (nuevo && !isNaN(nuevo) && Number(nuevo) > 0) {
    localStorage.setItem('nexus_presupuesto', Number(nuevo));
    if (window.toast) toast.success('Presupuesto actualizado', 'Tu límite FIN-360 ha cambiado');
    renderDashboard();
  }
}

// ============ SIMULADOR ============

async function renderSimulador() {
  if (tipoUsuario === 'natural') return renderSimuladorNatural();
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
  if (tipoUsuario === 'natural') return calcularSimulacionNatural();
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
    { nombre: 'NEXO - CDT 90 dias', rendimiento: 10.5, desc: 'Plazo 90 dias · Tasa fija' },
    { nombre: 'NEXO - CDT 180 dias', rendimiento: 12.0, desc: 'Plazo 180 dias · Tasa fija' },
    { nombre: 'NEXO - CDT 360 dias', rendimiento: 15.5, desc: 'Plazo 360 dias · Tasa fija' },
  ];

  let totalInv = 0, totalAct = 0;
  if (inversiones) inversiones.forEach(i => { totalInv += Number(i.monto_invertido); totalAct += Number(i.valor_actual); });

  let html = `
    <div class="app-section" style="background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%); border: 2px solid #2563EB;">
      <div style="font-size: 18px; font-weight: 800; color: var(--dark); margin-bottom: 8px;">NEXO - Certificado de Deposito a Termino</div>
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
  const nombreProducto = 'NEXO - CDT ' + plazo + ' dias';

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
  reproducirSonido();
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
          <div class="label">Cuenta NEXA</div>
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
        ${otros.slice(0, 4).length > 0 ? `
          <label class="app-form-label">Contactos frecuentes</label>
          <div class="contactos-grid">
            ${otros.slice(0, 4).map(c => `
              <div class="contacto-item" onclick="document.getElementById('payReceptor').value='${c.email}'">
                <div class="contacto-avatar">${c.email.charAt(0).toUpperCase()}</div>
                <div class="contacto-nombre">${c.email.split('@')[0]}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
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
          <div class="table-wrap"><table class="app-table">
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
          </table></div>
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
    reproducirSonido();
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
    reproducirSonido();
    await actualizarSaldoSidebar();
    setTimeout(() => navegarA('flowpay'), 1500);
  } else {
    if (window.toast) toast.error('Error', (data ? data.message : 'No se pudo recargar'));
  }
}

async function pagarServicio() {
  const servicio = document.getElementById('servicioNombre').value;
  const monto = parseFloat(document.getElementById('servicioMonto').value);
  if (!servicio) { if (window.toast) toast.error('Falta servicio', 'Selecciona un servicio del grid'); return; }
  if (!monto || monto <= 0) { if (window.toast) toast.error('Monto invalido', 'Ingresa un monto mayor a 0'); return; }
  const { data } = await supabaseClient.rpc('pagar_servicio', { p_servicio: servicio, p_monto: monto });
  if (data && data.success) {
    await crearNotificacion(localStorage.getItem('user_id'), '💡 Pago exitoso', 'Pagaste ' + servicio + ' por ' + formatearDinero(monto), 'success');
    if (window.toast) toast.success('Pago exitoso', 'Pagaste ' + servicio + ' por ' + formatearDinero(monto));
    reproducirSonido();
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
    <div class="dash-grid-2col" style="grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); margin-bottom: 32px;">
      
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

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="mis-metas">Mis metas (VELA)</button><button class="app-tab" data-tab="nueva-meta">Nueva meta</button></div><div class="app-tab-content active" id="tab-mis-metas">';

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
  reproducirSonido();
  if (window.toast) toast.success('Aporte registrado', formatearDinero(monto) + ' guardados');
  navegarA('flowsave');
}

// ============ NEXUSINVEST (EMPRENDEDOR) ============

async function renderFlowInvest() {
  const userId = localStorage.getItem('user_id');
  const { data: inversiones } = await supabaseClient.from('inversiones').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const saldo = await obtenerSaldo();

  const productos = [
    { nombre: 'NEXO - CDT Digital', rendimiento: 10.5, desc: 'Bajo riesgo' },
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
  reproducirSonido();
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
  reproducirSonido();
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
  reproducirSonido();
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
    html += '<div class="table-wrap"><table class="app-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripcion</th><th style="text-align:right;">Monto</th></tr></thead><tbody>';
    movs.slice(0, 30).forEach(m => {
      const signo = m.tipo === 'ingreso' ? '+' : '-';
      const clase = m.tipo === 'ingreso' ? 'text-green' : 'text-red';
      html += '<tr><td>' + formatearFechaCorta(m.created_at) + '</td><td>' + (m.tipo === 'ingreso' ? '🟢' : '🔴') + '</td><td>' + m.descripcion + '</td><td class="' + clase + '" style="text-align:right;">' + signo + formatearDinero(m.monto) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  } else {
    html += '<p style="color:var(--text-light);">No hay movimientos.</p>';
  }

  html += '</div>';
  document.getElementById('pageContent').innerHTML = html;
}

// ============ FINNEX ACTIVOS CIRCULARES (ECONOMÍA CIRCULAR) ============

async function renderActivosCirculares() {
  const equipos = [
    { id: 1, nombre: 'Computador de Escritorio Core i5', estado: 'Reacondicionado', precio: 1200000, tipo: 'Venta', icono: '💻' },
    { id: 2, nombre: 'Impresora Multifuncional Láser', estado: 'Usado - Excelente', precio: 450000, tipo: 'Venta', icono: '🖨️' },
    { id: 3, nombre: 'Máquina de Coser Industrial', estado: 'Reacondicionada', precio: 150000, tipo: 'Alquiler (mes)', icono: '🧵' },
    { id: 4, nombre: 'Taladro Percutor Profesional', estado: 'Usado - Bueno', precio: 80000, tipo: 'Alquiler (semana)', icono: '🛠️' }
  ];

  let html = `
    <div class="app-section" style="background: linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%); border: 2px solid #10B981;">
      <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #2563EB); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">♻️</div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: var(--dark); margin-bottom: 4px;">FINNEX Activos Circulares</div>
          <div style="font-size: 14px; color: var(--text-light);">Accede a equipos productivos mediante reutilización, reacondicionamiento o alquiler. Una alternativa sostenible para tu negocio.</div>
        </div>
      </div>
    </div>

    <div class="app-tabs">
      <button class="app-tab active" data-tab="catalogo">Catálogo</button>
      <button class="app-tab" data-tab="mis-solicitudes">Mis Solicitudes</button>
    </div>

    <div class="app-tab-content active" id="tab-catalogo">
      <div class="cajitas-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
  `;

  equipos.forEach(eq => {
    html += `
      <div class="cajita-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <div style="font-size:32px;">${eq.icono}</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:var(--dark);">${eq.nombre}</div>
            <div style="font-size:12px; color:#10B981; font-weight:600;">${eq.estado}</div>
          </div>
        </div>
        <div style="font-size:24px; font-weight:800; color:var(--dark); margin-bottom:4px;">${formatearDinero(eq.precio)}</div>
        <div style="font-size:13px; color:var(--text-light); margin-bottom:16px;">Modalidad: ${eq.tipo}</div>
        <button class="btn-primary" style="width:100%; justify-content:center;" onclick="solicitarActivo(${eq.id}, '${eq.nombre}', ${eq.precio}, '${eq.tipo}')">Solicitar</button>
      </div>
    `;
  });

  html += `
      </div>
    </div>
    <div class="app-tab-content" id="tab-mis-solicitudes">
      <div class="app-section"><p style="color:var(--text-light);">Aún no has solicitado activos circulares.</p></div>
    </div>
  `;

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
}

async function solicitarActivo(id, nombre, precio, tipo) {
  if (!confirm(`¿Deseas solicitar el activo: ${nombre} por ${formatearDinero(precio)} (${tipo})?`)) return;
  
  if (window.toast) toast.info('Procesando...', 'Registrando tu solicitud de activo circular');
  
  const userId = localStorage.getItem('user_id');
  
  await supabaseClient.from('movimientos').insert({
    user_id: userId,
    tipo: 'egreso',
    monto: tipo.includes('Alquiler') ? precio : 0,
    descripcion: `Solicitud Activo Circular: ${nombre} (${tipo})`
  });

  await crearNotificacion(userId, '♻️ Solicitud Recibida', 'Tu solicitud para ' + nombre + ' está en revisión.', 'success');
  
  reproducirSonido();
  if (window.toast) toast.success('¡Solicitud Exitosa!', 'Pronto un asesor te contactará para coordinar la entrega.');
  
  navegarA('dashboard');
}

// ============ POLÍTICA DE CRÉDITO - PERSONAS NATURALES ============
// Lógica tipo banco para crédito de consumo / libre inversión (Colombia):
//  1. Reglas de exclusión: identidad verificada (KYC), ingreso mínimo, antigüedad, mora vigente.
//  2. Score de riesgo del cliente (0-1000) -> categoría A/B/C -> tasa E.A. (siempre por debajo de la usura).
//  3. Capacidad de pago: cuotas totales (nueva + obligaciones) <= 40% de los ingresos.
//  4. Cuota fija con sistema francés (amortización) + seguro de vida deudores.
//  5. Si pide más de lo que puede pagar -> contraoferta por el monto máximo aprobable.
// Los emprendedores NO usan este motor: conservan su lógica propia (Familia NEXAR).
const POLITICA_NATURAL = {
  SMMLV: 1750905,              // Salario mínimo 2026 (Decreto 1469 de 2025)
  TASA_USURA_EA: 28.59,        // Usura consumo y ordinario, octubre 2026 (Superfinanciera). CAMBIA CADA MES: actualizar
  MARGEN_USURA: 0.5,           // Puntos porcentuales por debajo de la usura (nunca se cobra el tope)
  INGRESO_MINIMO_SMMLV: 1,     // Ingreso mínimo para aplicar
  MONTO_MIN: 500000,
  MONTO_MAX: 30000000,
  LIMITE_ENDEUDAMIENTO: 0.40,  // (cuotas actuales + cuota nueva) / ingresos
  SEGURO_VIDA_MENSUAL: 0.0005, // 0,05% mensual sobre el monto desembolsado (seguro de vida deudores)
  SCORE_MINIMO: 500,
  CATEGORIAS: [                // Tasa E.A. por categoría de riesgo
    { nombre: 'A', scoreMin: 800, tasaEA: 21.5 },
    { nombre: 'B', scoreMin: 650, tasaEA: 24.5 },
    { nombre: 'C', scoreMin: 500, tasaEA: 27.5 }
  ]
};

// Contexto interno del cliente (se carga en renderCreditos)
let creditoNaturalCtx = { verificado: false, obligacionesInternas: 0, creditosPagados: 0 };

function formatearPesos(valor) {
  return '$' + Math.round(Number(valor) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function tasaMensualDesdeEA(tasaEA) {
  return Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
}

// Cuota fija mensual del sistema francés (sin seguro)
function cuotaFrancesa(monto, tasaMensual, n) {
  if (!n) return 0;
  if (tasaMensual === 0) return monto / n;
  return monto * tasaMensual / (1 - Math.pow(1 + tasaMensual, -n));
}

function tasaAplicablePorCategoria(cat) {
  const P = POLITICA_NATURAL;
  return Math.min(cat.tasaEA, P.TASA_USURA_EA - P.MARGEN_USURA);
}

function formatoFechaISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Tabla de amortización (sistema francés + seguro fijo mensual)
function generarPlanAmortizacion(monto, tasaMensual, n, seguroMensual) {
  const plan = [];
  let saldo = monto;
  const cuotaBase = Math.round(cuotaFrancesa(monto, tasaMensual, n));
  const hoy = new Date();
  const dia = Math.min(hoy.getDate(), 28);
  for (let k = 1; k <= n; k++) {
    const intereses = Math.round(saldo * tasaMensual);
    let capital = cuotaBase - intereses;
    if (k === n) capital = saldo; // la última cuota cierra el saldo exacto
    saldo -= capital;
    plan.push({
      numero: k,
      fecha_vencimiento: formatoFechaISO(new Date(hoy.getFullYear(), hoy.getMonth() + k, dia)),
      capital: capital,
      intereses: intereses,
      seguro: seguroMensual,
      valor: capital + intereses + seguroMensual
    });
  }
  return plan;
}

// Score de riesgo del cliente (0-1000). No depende del monto pedido: el monto se evalúa en la capacidad de pago.
function calcularScoreNatural(p) {
  const P = POLITICA_NATURAL;

  // 1. Historial crediticio (máx. 400)
  let historial = { 'Al dia': 400, 'Sin historial': 250, 'Mora ocasional resuelta': 120, 'Mora vigente': 0 }[p.historial];
  if (historial === undefined) historial = 250;
  if (p.historial === 'Sin historial') historial = Math.min(400, historial + Math.min(3, p.creditosPagados || 0) * 50);

  // 2. Estabilidad laboral (máx. 250), ajustada por antigüedad
  const baseEstab = { 'Indefinido': 250, 'Pensionado': 240, 'Fijo': 170, 'Independiente': 150 }[p.vinculacion];
  let factor = 1;
  if (p.vinculacion !== 'Pensionado') factor = p.antiguedadMeses >= 24 ? 1 : (p.antiguedadMeses >= 12 ? 0.8 : 0.6);
  const estabilidad = Math.round((baseEstab === undefined ? 150 : baseEstab) * factor);

  // 3. Nivel de ingresos en SMMLV (máx. 150)
  const smmlvs = p.ingresos / P.SMMLV;
  const ingresos = smmlvs >= 6 ? 150 : smmlvs >= 4 ? 120 : smmlvs >= 2 ? 80 : smmlvs >= 1 ? 40 : 0;

  // 4. Endeudamiento actual, antes del nuevo crédito (máx. 200)
  const endeudamientoActual = p.ingresos > 0 ? p.obligaciones / p.ingresos : 1;
  const endeudamiento = endeudamientoActual <= 0.10 ? 200 : endeudamientoActual <= 0.20 ? 160 : endeudamientoActual <= 0.30 ? 100 : endeudamientoActual <= 0.40 ? 40 : 0;

  return {
    score: historial + estabilidad + ingresos + endeudamiento,
    detalle: { historial, estabilidad, ingresos, endeudamiento },
    endeudamientoActual
  };
}

// Evaluación completa de la solicitud (función pura: no toca la base de datos ni el DOM)
function evaluarCreditoNatural(p) {
  const P = POLITICA_NATURAL;
  const motivos = [];
  const obligaciones = (p.obligacionesDeclaradas || 0) + (p.obligacionesInternas || 0);
  const n = p.plazoMeses;

  const r = {
    decision: 'RECHAZADO', contraoferta: false, motivos: motivos,
    score: 0, categoria: null, tasaEA: null, tasaMensual: null, plazoMeses: n,
    monto_aprobado: 0, montoMaximo: 0, cuotaMaxima: 0,
    cuotaPedida: 0, cuotaBase: 0, seguro: 0, cuotaTotal: 0, totalPagar: 0, totalIntereses: 0,
    endeudamientoPost: null, obligaciones: obligaciones
  };

  // --- Reglas de exclusión ---
  if (!p.verificado) motivos.push('Debes verificar tu identidad (KYC) en el menú Verificación antes de solicitar un crédito.');
  if (p.ingresos < P.INGRESO_MINIMO_SMMLV * P.SMMLV) {
    motivos.push('Tus ingresos mensuales deben ser de al menos ' + P.INGRESO_MINIMO_SMMLV + ' SMMLV (' + formatearPesos(P.INGRESO_MINIMO_SMMLV * P.SMMLV) + ').');
  }
  const antiguedadMinima = p.vinculacion === 'Independiente' ? 12 : (p.vinculacion === 'Pensionado' ? 0 : 6);
  if (p.antiguedadMeses < antiguedadMinima) {
    motivos.push('Necesitas al menos ' + antiguedadMinima + ' meses de antigüedad en tu actividad actual.');
  }
  if (p.historial === 'Mora vigente') motivos.push('Tienes obligaciones en mora. Ponte al día para poder aplicar.');
  if (p.monto < P.MONTO_MIN) motivos.push('El monto mínimo es ' + formatearPesos(P.MONTO_MIN) + '.');
  if (p.monto > P.MONTO_MAX) motivos.push('El monto máximo por solicitud es ' + formatearPesos(P.MONTO_MAX) + '.');

  // --- Score y categoría ---
  const sc = calcularScoreNatural({ ingresos: p.ingresos, obligaciones: obligaciones, historial: p.historial, vinculacion: p.vinculacion, antiguedadMeses: p.antiguedadMeses, creditosPagados: p.creditosPagados });
  r.score = sc.score;
  const cat = P.CATEGORIAS.find(c => sc.score >= c.scoreMin) || null;
  if (!cat) motivos.push('Tu perfil de riesgo (score ' + sc.score + ') no alcanza el mínimo de ' + P.SCORE_MINIMO + ' puntos.');
  const catRef = cat || P.CATEGORIAS[P.CATEGORIAS.length - 1];
  r.categoria = cat ? cat.nombre : null;
  r.tasaEA = tasaAplicablePorCategoria(catRef);
  r.tasaMensual = tasaMensualDesdeEA(r.tasaEA);

  // --- Capacidad de pago ---
  const factorCuota = cuotaFrancesa(1, r.tasaMensual, n) + P.SEGURO_VIDA_MENSUAL; // cuota total por cada peso prestado
  r.cuotaPedida = Math.round(p.monto * factorCuota);
  const cuotaMaxima = Math.max(0, p.ingresos * P.LIMITE_ENDEUDAMIENTO - obligaciones);
  r.cuotaMaxima = Math.round(cuotaMaxima);
  r.montoMaximo = Math.max(0, Math.min(P.MONTO_MAX, Math.floor(cuotaMaxima / factorCuota / 10000) * 10000));
  r.endeudamientoPost = p.ingresos > 0 ? (obligaciones + r.cuotaPedida) / p.ingresos : null;

  if (motivos.length === 0) {
    if (p.monto <= r.montoMaximo) {
      r.monto_aprobado = p.monto;
    } else if (r.montoMaximo >= P.MONTO_MIN) {
      r.monto_aprobado = r.montoMaximo;
      r.contraoferta = true;
    } else {
      motivos.push('Tus ingresos no alcanzan para asumir una nueva cuota: tus obligaciones ya usan ' + Math.round((obligaciones / p.ingresos) * 100) + '% de tus ingresos y el límite de endeudamiento es ' + Math.round(P.LIMITE_ENDEUDAMIENTO * 100) + '%.');
    }
  }
  if (motivos.length > 0) return r;

  // --- Condiciones finales del crédito aprobado ---
  const monto = r.monto_aprobado;
  r.cuotaBase = Math.round(monto * cuotaFrancesa(1, r.tasaMensual, n));
  r.seguro = Math.round(monto * P.SEGURO_VIDA_MENSUAL);
  r.cuotaTotal = r.cuotaBase + r.seguro;
  r.totalPagar = r.cuotaTotal * n;
  r.totalIntereses = Math.max(0, r.cuotaBase * n - monto);
  r.endeudamientoPost = (obligaciones + r.cuotaTotal) / p.ingresos;
  r.decision = 'APROBADO';
  return r;
}

function leerFormularioNatural() {
  const el = id => document.getElementById(id);
  if (!el('credMonto') || !el('credVinculacion')) return null;
  const num = id => parseFloat(el(id).value) || 0;
  return {
    ingresos: num('credIngresos'),
    obligacionesDeclaradas: num('credObligaciones'),
    obligacionesInternas: creditoNaturalCtx.obligacionesInternas,
    creditosPagados: creditoNaturalCtx.creditosPagados,
    verificado: creditoNaturalCtx.verificado,
    vinculacion: el('credVinculacion').value,
    antiguedadMeses: num('credAntiguedad'),
    historial: el('credHistorialNat').value,
    monto: num('credMonto'),
    plazoMeses: parseInt(el('credPlazo').value) || 12
  };
}

// Panel de preaprobación en vivo (transparencia de costos antes de solicitar)
function previsualizarCreditoNatural() {
  const box = document.getElementById('preapNatural');
  const p = leerFormularioNatural();
  if (!box || !p) return;
  const ev = evaluarCreditoNatural(p);
  const P = POLITICA_NATURAL;

  let clase, titulo;
  if (ev.decision === 'APROBADO' && !ev.contraoferta) {
    clase = 'alert-success'; titulo = '🟢 Preaprobado: la cuota cabe en tu presupuesto';
  } else if (ev.decision === 'APROBADO') {
    clase = 'alert-warning'; titulo = '🟡 Podemos aprobarte hasta ' + formatearPesos(ev.montoMaximo) + ' con tu capacidad de pago';
  } else {
    clase = 'alert-error'; titulo = '🔴 Con estos datos no podríamos aprobar el crédito';
  }

  const cuotaMostrada = ev.decision === 'APROBADO' ? ev.cuotaTotal : ev.cuotaPedida;
  const celda = (label, valor) => '<div><div style="font-size:12px;color:var(--text-light);">' + label + '</div><div style="font-weight:700;color:var(--text);">' + valor + '</div></div>';

  let html = '<div class="alert ' + clase + '" style="display:block;"><div style="font-weight:700;margin-bottom:8px;">' + titulo + '</div>';
  if (ev.motivos.length > 0) {
    html += '<ul style="margin:0 0 8px 18px;font-size:13px;">' + ev.motivos.map(m => '<li>' + m + '</li>').join('') + '</ul>';
  }
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">' +
    celda('Cuota mensual (incluye seguro)', formatearPesos(cuotaMostrada)) +
    celda('Tasa', ev.tasaEA.toFixed(2).replace('.', ',') + '% E.A. (' + (ev.tasaMensual * 100).toFixed(2).replace('.', ',') + '% mensual)') +
    celda('Plazo', ev.plazoMeses + ' cuotas mensuales') +
    celda('Total a pagar', ev.decision === 'APROBADO' ? formatearPesos(ev.totalPagar) : formatearPesos(ev.cuotaPedida * ev.plazoMeses)) +
    celda('Endeudamiento con este crédito', ev.endeudamientoPost === null ? '-' : Math.round(ev.endeudamientoPost * 100) + '% (límite ' + Math.round(P.LIMITE_ENDEUDAMIENTO * 100) + '%)') +
    celda('Categoría de riesgo / Score', (ev.categoria || 'No aplica') + ' / ' + ev.score) +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-light);margin-top:10px;">Tasa máxima legal (usura) vigente: ' + P.TASA_USURA_EA.toFixed(2).replace('.', ',') + '% E.A. (Superfinanciera, octubre 2026). La tasa que te ofrecemos siempre está por debajo. El seguro de vida deudores (' + (P.SEGURO_VIDA_MENSUAL * 100).toFixed(2).replace('.', ',') + '% mensual) está incluido en la cuota.</div></div>';
  box.innerHTML = html;
}

async function solicitarCreditoNatural() {
  const p = leerFormularioNatural();
  if (!p) return;
  const userId = localStorage.getItem('user_id');
  const tipo = document.getElementById('credTipo').value;

  if (!document.getElementById('credAutorizacion').checked) {
    if (window.toast) toast.error('Falta autorización', 'Debes autorizar la consulta en centrales de riesgo y el tratamiento de datos');
    return;
  }

  if (window.toast) toast.info('Analizando...', 'Evaluando tu perfil y tu capacidad de pago');
  await new Promise(r => setTimeout(r, 1200));

  const ev = evaluarCreditoNatural(p);
  const plazoDias = p.plazoMeses * 30;

  // --- Rechazo: se registra la solicitud y se explica el motivo ---
  if (ev.decision === 'RECHAZADO') {
    const { error: errRech } = await supabaseClient.from('solicitudes').insert({
      user_id: userId, monto_solicitado: p.monto, plazo_dias: plazoDias, tipo_negocio: tipo,
      ingresos_mensuales: p.ingresos, score: ev.score, decision: 'RECHAZADO',
      monto_aprobado: 0, tasa_sugerida: ev.tasaEA
    });
    if (errRech) console.error('No se pudo registrar la solicitud rechazada:', errRech.message);
    await crearNotificacion(userId, '❌ Solicitud de crédito no aprobada', ev.motivos[0] || 'No cumples la política de crédito.', 'warning');
    previsualizarCreditoNatural();
    const box = document.getElementById('preapNatural');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.toast) toast.error('Solicitud no aprobada', ev.motivos[0] || 'No cumples la política de crédito');
    return;
  }

  // --- Contraoferta: el cliente debe aceptar el monto ajustado ---
  if (ev.contraoferta) {
    const acepta = confirm(
      'Con tus ingresos y obligaciones, el monto máximo que podemos aprobarte es ' + formatearPesos(ev.monto_aprobado) + ' (pediste ' + formatearPesos(p.monto) + ').\n\n' +
      'Cuota mensual: ' + formatearPesos(ev.cuotaTotal) + ' x ' + ev.plazoMeses + ' meses\n' +
      'Tasa: ' + ev.tasaEA.toFixed(2).replace('.', ',') + '% E.A.\n\n¿Deseas continuar con este monto?'
    );
    if (!acepta) {
      if (window.toast) toast.info('Solicitud cancelada', 'Puedes ajustar el monto o el plazo y volver a intentarlo');
      return;
    }
  }

  // --- Aprobado: plan de pagos real (sistema francés) ---
  const plan = generarPlanAmortizacion(ev.monto_aprobado, ev.tasaMensual, ev.plazoMeses, ev.seguro);
  const totalPagar = plan.reduce((a, c) => a + c.valor, 0);
  const totalIntereses = plan.reduce((a, c) => a + c.intereses, 0);
  const valorCuota = plan[0].valor;

  // 1. Solicitud
  const { data: solicitud, error: errSol } = await supabaseClient.from('solicitudes').insert({
    user_id: userId, monto_solicitado: p.monto, plazo_dias: plazoDias, tipo_negocio: tipo,
    ingresos_mensuales: p.ingresos, score: ev.score, decision: 'APROBADO',
    monto_aprobado: ev.monto_aprobado, tasa_sugerida: ev.tasaEA
  }).select().single();
  if (errSol) { if (window.toast) toast.error('Error en solicitud', errSol.message); return; }

  // 2. Crédito
  const { data: credito, error: errCred } = await supabaseClient.from('creditos').insert({
    user_id: userId, solicitud_id: solicitud.id, monto_aprobado: ev.monto_aprobado,
    tasa_anual: ev.tasaEA, plazo_dias: plazoDias, num_cuotas: ev.plazoMeses,
    valor_cuota: valorCuota, total_intereses: totalIntereses, total_pagar: totalPagar,
    saldo_pendiente: totalPagar, estado: 'activo', cuotas_pagadas: 0
  }).select().single();
  if (errCred) { if (window.toast) toast.error('Error en crédito', errCred.message); return; }

  // 3. Plan de pagos (tabla 'cuotas'; si la tabla no existe el contrato calcula el plan al generarse)
  const filasCuotas = plan.map(c => ({
    credito_id: credito.id, numero: c.numero, fecha_vencimiento: c.fecha_vencimiento,
    valor: c.valor, capital: c.capital, intereses: c.intereses
  }));
  const { error: errPlan } = await supabaseClient.from('cuotas').insert(filasCuotas);
  if (errPlan) console.warn('No se pudo guardar el plan de pagos en la tabla cuotas:', errPlan.message);

  // 4. Desembolso (si falla se revierte el crédito)
  const { data: desembolso, error: errDes } = await supabaseClient.rpc('recargar_saldo', { p_monto: ev.monto_aprobado });
  if (errDes || (desembolso && desembolso.success === false)) {
    await supabaseClient.from('creditos').delete().eq('id', credito.id);
    if (window.toast) toast.error('Error en el desembolso', (errDes && errDes.message) || (desembolso && desembolso.message) || 'No se pudo desembolsar el crédito');
    return;
  }

  // 5. Movimiento y notificación
  await supabaseClient.from('movimientos').insert({
    user_id: userId, tipo: 'ingreso', monto: ev.monto_aprobado, descripcion: 'Desembolso: ' + tipo
  });
  await crearNotificacion(userId, '💸 Crédito Desembolsado',
    'Se consignaron ' + formatearPesos(ev.monto_aprobado) + '. Pagarás ' + ev.plazoMeses + ' cuotas de ' + formatearPesos(valorCuota) + ' a ' + ev.tasaEA.toFixed(2).replace('.', ',') + '% E.A.', 'success');

  reproducirSonido();
  if (window.toast) toast.success('¡Crédito Aprobado!', 'El dinero ya está en tu cuenta');
  navegarA('dashboard');
}

// ---- Simulador para personas naturales (usa el mismo motor: cuota y tasa coherentes con el crédito real) ----
async function renderSimuladorNatural() {
  const P = POLITICA_NATURAL;
  const html = `
    <div class="app-section">
      <div class="app-section-title">Simulador de Crédito de Libre Inversión</div>
      <div class="slider-container">
        <label class="app-form-label">Monto a solicitar: <span id="lblMonto" style="color:var(--primary); font-size:18px;">${formatearPesos(5000000)}</span></label>
        <input type="range" class="slider" id="simMonto" min="${P.MONTO_MIN}" max="${P.MONTO_MAX}" step="500000" value="5000000" oninput="calcularSimulacion()">
      </div>
      <div class="app-form-group">
        <label class="app-form-label">Plazo (meses)</label>
        <select class="app-form-select" id="simPlazo" onchange="calcularSimulacion()">
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
          <option value="24" selected>24 meses</option>
          <option value="36">36 meses</option>
          <option value="48">48 meses</option>
          <option value="60">60 meses</option>
        </select>
      </div>
      <div class="app-form-group">
        <label class="app-form-label">Tus ingresos mensuales (COP)</label>
        <input class="app-form-input" type="number" id="simIngresos" value="3000000" oninput="calcularSimulacion()">
      </div>
    </div>
    <div class="dash-grid-2col">
      <div class="widget-metric">
        <div class="widget-icon blue">💵</div>
        <div class="widget-info"><div class="label">Cuota mensual estimada</div><div class="value" id="lblCuota">$0</div></div>
      </div>
      <div class="widget-metric">
        <div class="widget-icon green">📈</div>
        <div class="widget-info"><div class="label">Tasa de referencia</div><div class="value" id="lblTasa">-</div></div>
      </div>
    </div>
    <div class="app-section" id="semaforoBox">
      <div class="app-section-title">Capacidad de pago</div>
      <div id="semaforoMsg" class="alert alert-success">🟢 Cuota saludable</div>
      <div style="font-size:12px;color:var(--text-light);margin-top:10px;">Valores de referencia (categoría B). La tasa final depende de tu perfil y siempre es menor a la usura (${P.TASA_USURA_EA.toFixed(2).replace('.', ',')}% E.A.). La cuota incluye seguro de vida deudores.</div>
    </div>
    <button class="btn-primary btn-large" onclick="navegarA('creditos')">Ir a solicitar crédito</button>
  `;
  document.getElementById('pageContent').innerHTML = html;
  calcularSimulacion();
}

function calcularSimulacionNatural() {
  const P = POLITICA_NATURAL;
  const montoEl = document.getElementById('simMonto');
  const plazoEl = document.getElementById('simPlazo');
  const ingresosEl = document.getElementById('simIngresos');
  if (!montoEl || !plazoEl || !ingresosEl) return;
  const monto = parseFloat(montoEl.value);
  const meses = parseInt(plazoEl.value);
  const ingresos = parseFloat(ingresosEl.value) || 0;
  document.getElementById('lblMonto').textContent = formatearPesos(monto);

  const tasaEA = tasaAplicablePorCategoria(P.CATEGORIAS[1]);
  const im = tasaMensualDesdeEA(tasaEA);
  const cuota = Math.round(monto * (cuotaFrancesa(1, im, meses) + P.SEGURO_VIDA_MENSUAL));
  document.getElementById('lblCuota').textContent = formatearPesos(cuota);
  document.getElementById('lblTasa').textContent = tasaEA.toFixed(2).replace('.', ',') + '% E.A.';

  const semaforoMsg = document.getElementById('semaforoMsg');
  const ratio = ingresos > 0 ? cuota / ingresos : 1;
  if (ratio > P.LIMITE_ENDEUDAMIENTO) {
    semaforoMsg.className = 'alert alert-error';
    semaforoMsg.textContent = '🔴 La cuota (' + Math.round(ratio * 100) + '% de tus ingresos) supera el límite de ' + Math.round(P.LIMITE_ENDEUDAMIENTO * 100) + '%.';
  } else if (ratio > 0.25) {
    semaforoMsg.className = 'alert alert-warning';
    semaforoMsg.textContent = '🟡 Cuota moderada (' + Math.round(ratio * 100) + '% de tus ingresos).';
  } else {
    semaforoMsg.className = 'alert alert-success';
    semaforoMsg.textContent = '🟢 Cuota saludable (' + Math.round(ratio * 100) + '% de tus ingresos).';
  }
}

// ============ NEXUSCREDIT ============

async function renderCreditos() {
  const userId = localStorage.getItem('user_id');
  const { data: solicitudes } = await supabaseClient.from('solicitudes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const { data: creditos } = await supabaseClient.from('creditos').select('*').eq('user_id', userId).order('created_at', { ascending: false });

  // =========================================================
  // LÓGICA DUAL: FORMULARIO DIFERENTE PARA NATURAL Y EMPRENDEDOR
  // =========================================================
  // Contexto interno del cliente natural (KYC + obligaciones y pagos con NexusPay) para el motor de evaluación
  if (tipoUsuario === 'natural') {
    const { data: perfilKyc } = await supabaseClient.from('profiles').select('verificado').eq('id', userId).single();
    creditoNaturalCtx = {
      verificado: !!(perfilKyc && perfilKyc.verificado),
      obligacionesInternas: (creditos || []).filter(c => c.estado === 'activo').reduce((a, c) => a + Number(c.valor_cuota || 0), 0),
      creditosPagados: (creditos || []).filter(c => c.estado === 'pagado').length
    };
  }

  let formularioHTML = '';

  if (tipoUsuario === 'natural') {
    formularioHTML = `
      <div class="app-section">
        <div class="app-section-title">Crédito de Libre Inversión</div>
        <p style="color:var(--text-light); font-size:14px; margin-bottom:16px;">Financia tus metas personales, viajes o emergencias. Evaluamos tu perfil y tu capacidad de pago: la tasa depende de tu categoría de riesgo y siempre está por debajo de la tasa de usura.</p>
        <div class="app-form-group">
          <label class="app-form-label">Destino del Crédito</label>
          <select class="app-form-select" id="credTipo">
            <option value="Libre Inversión">Libre Inversión</option>
            <option value="Consumo">Consumo (Compras)</option>
            <option value="Educación">Educación</option>
            <option value="Emergencia">Emergencia</option>
          </select>
        </div>
        <div class="app-form-group">
          <label class="app-form-label">Tipo de vinculación</label>
          <select class="app-form-select" id="credVinculacion" onchange="previsualizarCreditoNatural()">
            <option value="Indefinido">Empleado - contrato a término indefinido</option>
            <option value="Fijo">Empleado - contrato a término fijo</option>
            <option value="Independiente">Independiente</option>
            <option value="Pensionado">Pensionado</option>
          </select>
        </div>
        <div class="app-form-group"><label class="app-form-label">Antigüedad en tu empleo o actividad (meses)</label><input class="app-form-input" type="number" id="credAntiguedad" value="12" min="0" oninput="previsualizarCreditoNatural()"></div>
        <div class="app-form-group"><label class="app-form-label">Ingresos mensuales (COP)</label><input class="app-form-input" type="number" id="credIngresos" value="2500000" oninput="previsualizarCreditoNatural()"></div>
        <div class="app-form-group">
          <label class="app-form-label">Otras obligaciones mensuales (cuotas de créditos, tarjetas, arriendo financiero)</label>
          <input class="app-form-input" type="number" id="credObligaciones" value="0" min="0" oninput="previsualizarCreditoNatural()">
          <div style="font-size:12px;color:var(--text-light);margin-top:4px;">Las cuotas de tus créditos activos en NexusPay se suman automáticamente.</div>
        </div>
        <div class="app-form-group">
          <label class="app-form-label">Historial en centrales de riesgo (declarado)</label>
          <select class="app-form-select" id="credHistorialNat" onchange="previsualizarCreditoNatural()">
            <option value="Al dia">Al día en mis obligaciones</option>
            <option value="Sin historial">Sin historial crediticio</option>
            <option value="Mora ocasional resuelta">Mora ocasional ya resuelta</option>
            <option value="Mora vigente">Tengo obligaciones en mora</option>
          </select>
        </div>
        <div class="app-form-group"><label class="app-form-label">Monto (COP)</label><input class="app-form-input" type="number" id="credMonto" value="1000000" oninput="previsualizarCreditoNatural()"></div>
        <div class="app-form-group">
          <label class="app-form-label">Plazo (meses)</label>
          <select class="app-form-select" id="credPlazo" onchange="previsualizarCreditoNatural()">
            <option value="6">6 meses</option><option value="12">12 meses</option><option value="24" selected>24 meses</option><option value="36">36 meses</option><option value="48">48 meses</option><option value="60">60 meses</option>
          </select>
        </div>
        <div id="preapNatural" style="margin: 16px 0;"></div>
        <label style="display:flex; gap:10px; align-items:flex-start; font-size:13px; color:var(--text-light); margin-bottom:16px; cursor:pointer;">
          <input type="checkbox" id="credAutorizacion" style="margin-top:3px;">
          <span>Autorizo a NexusPay a consultar y reportar mi información en centrales de riesgo y a tratar mis datos personales conforme a la Ley 1266 de 2008 y la Ley 1581 de 2012.</span>
        </label>
        <button class="btn-primary btn-large" onclick="solicitarCredito()">Solicitar Crédito</button>
      </div>
    `;
  } else {
    // Formulario para Emprendedores (Documento SENA)
    formularioHTML = `
      <div class="app-section">
        <div class="app-section-title">Familia NEXAR (Financiación Productiva)</div>
        <div class="app-form-group">
          <label class="app-form-label">Producto</label>
          <select class="app-form-select" id="credTipo">
            <option value="Microcrédito Productivo">Microcrédito Productivo</option>
            <option value="Crédito Pequeños Negocios">Crédito Pequeños Negocios</option>
            <option value="Leasing Productivo">Leasing Productivo (Equipos)</option>
            <option value="Factoring Digital">Factoring Digital</option>
          </select>
        </div>
        <div class="app-form-group"><label class="app-form-label">Ingresos del negocio (COP)</label><input class="app-form-input" type="number" id="credIngresos" value="4000000"></div>
        <div class="app-form-group"><label class="app-form-label">Meses con el negocio</label><input class="app-form-input" type="number" id="credMeses" value="12"></div>
        <div class="app-form-group"><label class="app-form-label">Monto (COP)</label><input class="app-form-input" type="number" id="credMonto" value="2000000"></div>
        <div class="app-form-group">
          <label class="app-form-label">Plazo (días)</label>
          <select class="app-form-select" id="credPlazo">
            <option value="30">30 dias</option><option value="60">60 dias</option><option value="90" selected>90 dias</option><option value="120">120 dias</option><option value="180">180 dias</option>
          </select>
        </div>
        <div class="app-form-group"><label class="app-form-label">Historial</label><select class="app-form-select" id="credHistorial"><option>Sin historial</option><option>1 credito pagado</option><option>2-3 creditos pagados</option><option>Mas de 3 creditos</option></select></div>
        <button class="btn-primary btn-large" onclick="solicitarCredito()">Analizar con IA</button>
      </div>
    `;
  }

  let html = '<div class="app-tabs"><button class="app-tab active" data-tab="solicitar">Solicitar</button><button class="app-tab" data-tab="mis-creditos">Mis creditos</button><button class="app-tab" data-tab="historial-cred">Historial</button></div>';

  html += '<div class="app-tab-content active" id="tab-solicitar">' + formularioHTML + '</div>';

  // --- MIS CRÉDITOS ---
  html += '<div class="app-tab-content" id="tab-mis-creditos">';
  if (creditos && creditos.length > 0) {
    creditos.forEach(c => {
      const progreso = c.num_cuotas > 0 ? (c.cuotas_pagadas / c.num_cuotas) * 100 : 0;
      html += '<div class="app-section" style="padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:12px;"><div style="font-weight:700; color:var(--dark);">Credito #' + c.id + '</div><div class="badge ' + (c.estado === 'activo' ? 'badge-green' : 'badge-blue') + '">' + c.estado + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px; color:var(--text);">' +
        '<div><div style="font-size:12px;color:var(--text-light);">Monto</div><div style="font-weight:700;">' + formatearDinero(c.monto_aprobado) + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Tasa</div><div style="font-weight:700;">' + c.tasa_anual + '%</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Saldo Pendiente</div><div style="font-weight:700;">' + formatearDinero(c.saldo_pendiente) + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Cuotas</div><div style="font-weight:700;">' + c.cuotas_pagadas + '/' + c.num_cuotas + '</div></div>' +
        '<div><div style="font-size:12px;color:var(--text-light);">Valor Cuota</div><div style="font-weight:700;">' + formatearDinero(c.valor_cuota) + '</div></div>' +
        '</div><div style="width:100%; height:8px; background:var(--bg-soft); border-radius:100px; margin:16px 0;"><div style="height:100%; width:' + progreso + '%; background:var(--primary); border-radius:100px;"></div></div>' +
        (c.estado === 'activo' ? '<button class="btn-primary btn-large" onclick="pagarCuota(' + c.id + ', ' + c.valor_cuota + ')">💳 Pagar Cuota</button>' : '<p style="text-align:center; color:var(--green); font-weight:700;">🎉 Crédito Pagado</p>') +
        '<button class="btn-secondary-sm" onclick="generarContratoPDF(' + c.id + ')" style="margin-top:8px;">📄 Descargar contrato</button></div>';
    });
  } else { html += '<div class="app-section"><p style="color:var(--text-light);">No tienes creditos activos.</p></div>'; }
  html += '</div>';

  // --- HISTORIAL ---
  html += '<div class="app-tab-content" id="tab-historial-cred"><div class="app-section"><div class="app-section-title">Historial</div>';
  if (solicitudes && solicitudes.length > 0) {
    html += '<div class="table-wrap"><table class="app-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Score</th><th>Decision</th></tr></thead><tbody>';
    solicitudes.forEach(s => {
      html += '<tr><td>' + formatearFechaCorta(s.created_at) + '</td><td>' + (s.tipo_negocio || 'N/A') + '</td><td>' + formatearDinero(s.monto_solicitado) + '</td><td>' + (s.score || '-') + '</td><td><span class="badge ' + (s.decision === 'APROBADO' ? 'badge-green' : s.decision === 'RECHAZADO' ? 'badge-red' : 'badge-yellow') + '">' + (s.decision || '-') + '</span></td></tr>';
    });
    html += '</tbody></table></div>';
  } else { html += '<p style="color:var(--text-light);">No hay solicitudes.</p>'; }
  html += '</div></div>';

  document.getElementById('pageContent').innerHTML = html;
  activarTabs();
  if (tipoUsuario === 'natural') previsualizarCreditoNatural();
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
  reproducirSonido();
  if (window.toast) toast.success('Pago exitoso', 'Cuota pagada');
  if (nuevoEstado === 'pagado' && typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    if (window.toast) toast.success('¡Felicidades!', 'Has pagado tu crédito');
  }
  navegarA('creditos');
}

async function solicitarCredito() {
  // Personas naturales: motor de evaluación bancario. Emprendedores: lógica Familia NEXAR (abajo).
  if (tipoUsuario === 'natural') return solicitarCreditoNatural();

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
    descripcion: 'Desembolso: ' + tipo // Guardará "Desembolso: Leasing Productivo"
  });

  // 5. Notificamos
  await crearNotificacion(userId, '💸 Crédito Desembolsado', 'Se han consignado ' + formatearDinero(monto) + ' en tu cuenta.', 'success');

  reproducirSonido();
  if (window.toast) toast.success('¡Crédito Aprobado!', 'El dinero ya está en tu cuenta');

  navegarA('dashboard');
}
async function generarContratoPDF(creditoId) {
  if (window.toast) toast.info('Generando...', 'Preparando tu contrato PDF');
  const userId = localStorage.getItem('user_id');
  const { data: credito } = await supabaseClient.from('creditos').select('*').eq('id', creditoId).single();
  const { data: cuotas } = await supabaseClient.from('cuotas').select('*').eq('credito_id', creditoId).order('numero');
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
  if (!credito) { if (window.toast) toast.error('No encontrado', 'Credito no encontrado'); return; }

  try {
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
      // Plan de pagos real guardado en la tabla 'cuotas'
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
    } else {
      // Plan de pagos calculado cuando el crédito no tiene filas en 'cuotas'
      const totalCuotas = credito.num_cuotas || 1;
      const capitalPorCuota = credito.monto_aprobado / totalCuotas;
      const interesPorCuota = (credito.total_intereses || 0) / totalCuotas;
      const hoy = new Date();

      for (let i = 1; i <= totalCuotas; i++) {
        const fechaVenc = new Date(hoy.getTime() + (i * 30 * 24 * 60 * 60 * 1000));
        doc.rect(20, y, 15, 6);
        doc.rect(35, y, 35, 6);
        doc.rect(70, y, 35, 6);
        doc.rect(105, y, 35, 6);
        doc.rect(140, y, 35, 6);
        doc.text(String(i), 27, y + 4, { align: 'center' });
        doc.text(fechaVenc.toLocaleDateString('es-CO'), 52, y + 4, { align: 'center' });
        doc.text(formatearDinero(credito.valor_cuota), 87, y + 4, { align: 'center' });
        doc.text(formatearDinero(capitalPorCuota), 122, y + 4, { align: 'center' });
        doc.text(formatearDinero(interesPorCuota), 157, y + 4, { align: 'center' });
        y += 6;
        if (y > 260) { doc.addPage(); y = 20; }
      }
    }

    doc.save('contrato_nexuspay_' + creditoId + '.pdf');
    if (window.toast) toast.success('PDF descargado', 'Contrato #' + creditoId);
  } catch (error) {
    console.error(error);
    if (window.toast) toast.error('Error', 'No se pudo generar el PDF');
  }
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
    reproducirSonido();
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
        ${movimientos && movimientos.length > 0 ? `<div class="table-wrap"><table class="app-table"><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${movimientos.map(m => { const icono = m.tipo === 'ingreso' ? '📥' : m.tipo === 'retiro' ? '📤' : '💰'; const clase = m.tipo === 'retiro' ? 'text-red' : 'text-green'; const signo = m.tipo === 'retiro' ? '-' : '+'; return '<tr><td>' + formatearFechaCorta(m.created_at) + '</td><td>' + icono + ' ' + (m.descripcion || m.tipo) + '</td><td class="' + clase + '" style="text-align:right;">' + signo + formatearDinero(m.monto) + '</td></tr>'; }).join('')}</tbody></table></div>` : '<p style="color:var(--text-light);">No hay movimientos.</p>'}
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
    reproducirSonido();
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
    reproducirSonido();
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
    { q: '¿Cuánto demora un crédito?', a: 'La IA analiza tu perfil en segundos y se consigna de inmediato si es aprobado.' },
    { q: '¿Qué es FINNEX?', a: 'Es nuestro módulo de economía circular para alquilar o comprar equipos reacondicionados.' }
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
PRODUCTOS: NexusCredit (Microcrédito, Leasing, Factoring), NexusPagos (cuenta de ahorros NEXA), NexusCard, NexusSave (VELA: bolsillos y metas de ahorro; NEXT: ahorro programado), NexusInvest, NEXO (CDT), NexusShield, NexusBusiness, NexusAnalytics, NexusBox, FINNEX (activos circulares: alquiler/compra de equipos reacondicionados).`;

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