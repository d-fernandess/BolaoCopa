const BASE = process.env.REACT_APP_API_URL || '';

function token() { return localStorage.getItem('bolao_token'); }

async function req(path, opts = {}) {
  const res = await fetch(BASE + '/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro');
  return data;
}

export const api = {
  // Auth
  register:    (b)    => req('/auth/register',   { method:'POST', body:b }),
  login:       (b)    => req('/auth/login',       { method:'POST', body:b }),
  me:          ()     => req('/auth/me'),
  getInvite:   (tok)  => req(`/auth/invite/${tok}`),

  // Bolões
  getBoloes:   ()     => req('/boloes'),
  getBolao:    (id)   => req(`/boloes/${id}`),
  createBolao: (b)    => req('/boloes',           { method:'POST', body:b }),
  updateBolao: (id,b) => req(`/boloes/${id}`,     { method:'PATCH', body:b }),
  deleteBolao: (id)   => req(`/boloes/${id}`,     { method:'DELETE' }),
  newToken:    (id)   => req(`/boloes/${id}/new-token`, { method:'POST' }),
  getPending:  (id)   => req(`/boloes/${id}/pending`),
  approveMember: (bid,uid) => req(`/boloes/${bid}/members/${uid}/approve`, { method:'PATCH' }),
  removeMember:  (bid,uid) => req(`/boloes/${bid}/members/${uid}`,         { method:'DELETE' }),
  getRanking:  (id)   => req(`/boloes/${id}/ranking`),

  // Matches
  getMatches:  ()     => req('/matches'),
  getPhases:   ()     => req('/matches/phases'),
  addMatch:    (b)    => req('/matches',          { method:'POST', body:b }),
  setResult:   (id,b) => req(`/matches/${id}/result`, { method:'PATCH', body:b }),
  deleteMatch: (id)   => req(`/matches/${id}`,    { method:'DELETE' }),

  // Palpites
  getMine:     ()     => req('/palpites/mine'),
  saveBatch:   (p)    => req('/palpites/batch',   { method:'POST', body:{ palpites:p } }),
  getBonus:    ()     => req('/palpites/bonus'),
  saveBonus:   (b)    => req('/palpites/bonus',   { method:'POST', body:b }),
  getBonusCfg: ()     => req('/palpites/bonus-config'),
  saveBonusCfg:(b)    => req('/palpites/bonus-config', { method:'POST', body:b }),
  getUsers:    ()     => req('/palpites/admin/users'),
};
