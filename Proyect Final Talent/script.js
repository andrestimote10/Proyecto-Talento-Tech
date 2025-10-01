/* script.js
   Lógica para:
   - Validación de login (cliente, demo)
   - Manejo de sesión con localStorage
   - Render de tabla de logs y búsqueda/filtrado
   - Selección de fila para ver detalle
*/

/* --------- Configuración: credenciales demo (NO USAR EN PRODUCCIÓN) --------- */
// Credenciales demo (puedes cambiarlas)
const DEMO_USER = 'admin';
const DEMO_PASS = 'Password123!'; // ejemplo

/* --------- Datos de ejemplo de logs (simulados) --------- */
const sampleLogs = [
  { id:1, timestamp:'2025-09-30 10:21:32', device:'Firewall', event:'ACL denied - intento desde VLAN Invitados', source:'10.6.30.14', severity:'Media', detail:'ACL_ADMIN_IN denied tcp from 10.6.30.14 to 192.168.10.1 port 22' },
  { id:2, timestamp:'2025-09-30 10:25:10', device:'VPN', event:'Conexión establecida - usuario admin01', source:'200.45.12.86', severity:'Informativo', detail:'ISAKMP phase 1 completed. IPSec SA created.' },
  { id:3, timestamp:'2025-09-30 11:02:05', device:'Servidor Syslog', event:'Multiple failed auth attempts', source:'200.45.12.86', severity:'Alta', detail:'Auth fail x5 from 200.45.12.86 to vpn service' },
  { id:4, timestamp:'2025-09-30 11:12:45', device:'Switch', event:'Port security - MAC blocked', source:'10.6.20.47', severity:'Media', detail:'MAC 00:1A:2B:3C:4D:5E blocked on Gi0/3' },
  { id:5, timestamp:'2025-09-30 11:45:00', device:'Firewall', event:'Escaneo de puertos detectado', source:'198.51.100.22', severity:'Alta', detail:'TCP SYN scan detected from external network' }
];

/* ----------------- Funciones compartidas ----------------- */
function isLogged(){
  return !!localStorage.getItem('soc_user');
}
function saveSession(user){
  localStorage.setItem('soc_user', user);
}
function clearSession(){
  localStorage.removeItem('soc_user');
}

/* ----------------- Lógica del login (index.html) ----------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Si estamos en index.html
  if (document.getElementById('loginForm')){
    // Si ya hay sesión, redirigir al dashboard
    if (isLogged()){
      window.location.href = 'dashboard.html';
      return;
    }

    const form = document.getElementById('loginForm');
    const userInput = document.getElementById('username');
    const passInput = document.getElementById('password');
    const uMsg = document.getElementById('u-msg');
    const pMsg = document.getElementById('p-msg');

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      // Limpia mensajes
      uMsg.textContent = '';
      pMsg.textContent = '';

      const u = userInput.value.trim();
      const p = passInput.value;

      // Validaciones simples
      let ok = true;
      if (!u){
        uMsg.textContent = 'El usuario es requerido.';
        ok = false;
      }
      if (!p){
        pMsg.textContent = 'La contraseña es requerida.';
        ok = false;
      }
      if (!ok) return;

      // Validación de credenciales demo (cliente)
      if (u === DEMO_USER && p === DEMO_PASS){
        saveSession(u);
        // Redirige a dashboard
        window.location.href = 'dashboard.html';
      } else {
        pMsg.textContent = 'Credenciales incorrectas.';
      }
    });

    // Permite Enter para navegar
    userInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') passInput.focus();
    });
  }

  /* ----------------- Lógica del dashboard (dashboard.html) ----------------- */
  if (document.getElementById('logsTable')){
    // Si no hay sesión, volver al login
    if (!isLogged()){
      window.location.href = 'index.html';
      return;
    }

    const loggedUserSpan = document.getElementById('loggedUser');
    const username = localStorage.getItem('soc_user') || '---';
    loggedUserSpan.textContent = `Usuario: ${username}`;

    // Elementos
    const tbody = document.querySelector('#logsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const filterDevice = document.getElementById('filterDevice');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnLogout = document.getElementById('btnLogout');
    const logDetail = document.getElementById('logDetail');

    // Estado
    let logs = [...sampleLogs];
    let activeSort = { key: 'timestamp', dir: 'desc' };

    function renderTable(data){
      tbody.innerHTML = '';
      if (!data.length){
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="padding:18px;color:var(--muted)">No hay eventos.</td>`;
        tbody.appendChild(tr);
        return;
      }
      data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        tr.innerHTML = `
          <td>${row.timestamp}</td>
          <td>${row.device}</td>
          <td>${row.event}</td>
          <td>${row.source}</td>
          <td>${row.severity}</td>
        `;
        tr.addEventListener('click', () => {
          // Marcar seleccionado
          tbody.querySelectorAll('tr').forEach(r=>r.classList.remove('selected'));
          tr.classList.add('selected');
          logDetail.textContent = JSON.stringify(row, null, 2);
        });
        tbody.appendChild(tr);
      });
    }

    function applyFilters(){
      const q = searchInput.value.trim().toLowerCase();
      const device = filterDevice.value;
      let res = logs.filter(l=>{
        const matchQ = !q || (l.device.toLowerCase().includes(q) || l.event.toLowerCase().includes(q) || l.source.includes(q));
        const matchDevice = !device || l.device === device;
        return matchQ && matchDevice;
      });

      // Sort
      res.sort((a,b)=>{
        if (activeSort.key === 'timestamp'){
          // fecha lexicográfica OK en formato YYYY-MM-DD HH:MM:SS
          return activeSort.dir === 'asc' ? a.timestamp.localeCompare(b.timestamp) : b.timestamp.localeCompare(a.timestamp);
        }
        // fallback
        return 0;
      });

      renderTable(res);
    }

    // Buscador
    searchInput.addEventListener('input', ()=> applyFilters());
    filterDevice.addEventListener('change', ()=> applyFilters());
    btnRefresh.addEventListener('click', ()=> {
      // Simula refresco: añadir un log aleatorio de ejemplo
      const now = new Date();
      const stamp = now.toISOString().slice(0,19).replace('T',' ');
      const newLog = {
        id: logs.length + 1,
        timestamp: stamp,
        device: ['Firewall','VPN','Servidor Syslog','Switch'][Math.floor(Math.random()*4)],
        event: 'Evento simulado - refresco',
        source: `10.6.${Math.floor(Math.random()*100)}.${Math.floor(Math.random()*250)}`,
        severity: ['Informativo','Media','Alta'][Math.floor(Math.random()*3)],
        detail: 'Este es un evento simulado tras pulsar Refrescar.'
      };
      logs.unshift(newLog);
      applyFilters();
    });

    // Logout
    btnLogout.addEventListener('click', ()=>{
      clearSession();
      window.location.href = 'index.html';
    });

    // Click en encabezados para ordenar
    document.querySelectorAll('#logsTable thead th').forEach(th=>{
      th.style.cursor = 'pointer';
      th.addEventListener('click', ()=>{
        const key = th.dataset.key;
        if (!key) return;
        if (activeSort.key === key) activeSort.dir = activeSort.dir === 'asc' ? 'desc' : 'asc';
        else { activeSort.key = key; activeSort.dir = 'desc'; }
        applyFilters();
      });
    });

    // Render inicial
    applyFilters();
  }
});
