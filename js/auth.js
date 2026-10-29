// Manejo de login y registro con Supabase

document.addEventListener('DOMContentLoaded', function () {
  // 1. Control de las Pestañas (Login / Registro)
  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.auth-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById('form' + (target === 'login' ? 'Login' : 'Registro')).classList.add('active');
    });
  });

  // 2. Mostrar campos de emprendedor si se selecciona ese rol
  const radioEmprendedor = document.querySelector('input[name="tipoUsuario"][value="emprendedor"]');
  const radioNatural = document.querySelector('input[name="tipoUsuario"][value="natural"]');
  const camposEmprendedor = document.getElementById('camposEmprendedor');
  
  if (radioEmprendedor && radioNatural && camposEmprendedor) {
    radioEmprendedor.addEventListener('change', function() {
      camposEmprendedor.style.display = 'block';
    });
    radioNatural.addEventListener('change', function() {
      camposEmprendedor.style.display = 'none';
    });
  }

  // 3. LOGIN
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const msg = document.getElementById('loginMessage');

      msg.className = 'form-message';
      msg.textContent = '';

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        localStorage.setItem('sb_access_token', data.session.access_token);
        localStorage.setItem('sb_refresh_token', data.session.refresh_token);
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('user_email', data.user.email);

        msg.className = 'form-message success';
        msg.textContent = 'Ingresando a FINNEX...';

        setTimeout(function () { window.location.href = 'app.html'; }, 800);
      } catch (error) {
        msg.className = 'form-message error';
        msg.textContent = 'Error: ' + (error.message || 'No se pudo iniciar sesion');
      }
    });
  }

  // 4. REGISTRO
  const formRegistro = document.getElementById('formRegistro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', async function (e) {
      e.preventDefault();
      const nombres = document.getElementById('regNombres').value.trim();
      const apellidos = document.getElementById('regApellidos').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const tipoUsuario = document.querySelector('input[name="tipoUsuario"]:checked')?.value || 'natural';
      const msg = document.getElementById('registroMessage');

      msg.className = 'form-message';
      msg.textContent = '';

      // Si es emprendedor, validamos el NIT
      let nombreNegocio = null, nit = null;
      if (tipoUsuario === 'emprendedor') {
        nombreNegocio = document.getElementById('regNombreNegocio').value.trim();
        nit = document.getElementById('regNit').value.trim();
        if (!nombreNegocio || !nit) {
          msg.className = 'form-message error';
          msg.textContent = 'Para ser emprendedor, debes llenar el Nombre del Negocio y el NIT.';
          return;
        }
      }

      try {
        // Creamos el usuario en Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              nombres: nombres,
              apellidos: apellidos,
              tipo_usuario: tipoUsuario,
              nombre_negocio: nombreNegocio,
              nit: nit
            }
          }
        });

        if (error) throw error;

        // Actualizamos la tabla profiles con los datos adicionales
        if (data.user) {
          await supabaseClient.from('profiles').update({
            tipo_usuario: tipoUsuario,
            nombre_negocio: nombreNegocio,
            nit: nit
          }).eq('id', data.user.id);
        }

        msg.className = 'form-message success';
        msg.textContent = 'Cuenta creada con éxito. Revisa tu correo para confirmar.';
        formRegistro.reset();
        if (camposEmprendedor) camposEmprendedor.style.display = 'none';
      } catch (error) {
        msg.className = 'form-message error';
        msg.textContent = 'Error: ' + (error.message || 'No se pudo crear la cuenta');
      }
    });
  }
});

async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
  window.location.href = 'login.html';
}

async function verificarSesion() {
  const accessToken = localStorage.getItem('sb_access_token');
  const refreshToken = localStorage.getItem('sb_refresh_token');

  if (!accessToken || !refreshToken) {
    window.location.href = 'login.html';
    return null;
  }

  const { data, error } = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    localStorage.clear();
    window.location.href = 'login.html';
    return null;
  }

  return data.session;
}

async function obtenerDatosUsuario() {
  const userId = localStorage.getItem('user_id');
  if (!userId) return null;
  const { data } = await supabaseClient.from('profiles').select('nombres, apellidos, cedula, telefono').eq('id', userId).single();
  return data;
}