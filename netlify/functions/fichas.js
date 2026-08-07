// fichas.js — cliente das funções de fichas. Inclua este arquivo em toda página
// que precisa saber o saldo do usuário (o hub, e futuramente cada jogo, se vocês
// quiserem proteger o acesso direto ao arquivo do jogo também).

(function () {
  const API = "/.netlify/functions";
  const UID_KEY = "cwg_uid";

  function getUid() {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("uid_" + Date.now() + "_" + Math.random().toString(16).slice(2));
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  async function getSaldo() {
    const r = await fetch(`${API}/saldo?uid=${encodeURIComponent(getUid())}`);
    const d = await r.json();
    return d.balance;
  }

  async function consumirFicha() {
    const r = await fetch(`${API}/consumir-ficha`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: getUid() }),
    });
    return r.json(); // { ok:true, balance } ou { ok:false, error, balance }
  }

  async function criarPix() {
    const r = await fetch(`${API}/criar-pix`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: getUid() }),
    });
    if (!r.ok) throw new Error("Falha ao gerar o PIX");
    return r.json(); // { paymentId, qrCode, qrCodeBase64, ticketUrl }
  }

  async function statusPix(paymentId) {
    const r = await fetch(`${API}/status-pix?paymentId=${encodeURIComponent(paymentId)}`);
    return r.json(); // { credited: boolean }
  }

  window.Fichas = { getUid, getSaldo, consumirFicha, criarPix, statusPix };
})();
