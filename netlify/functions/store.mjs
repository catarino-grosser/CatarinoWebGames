// Helper compartilhado: guarda o saldo de fichas de cada usuário usando Netlify Blobs.
// Netlify Blobs já vem incluso no seu plano — não precisa contratar nenhum banco de dados externo.
// Requer o pacote "@netlify/blobs" instalado no projeto (npm install @netlify/blobs).

import { getStore } from "@netlify/blobs";

export const FICHAS_GRATIS_INICIAIS = 10;

// Store com os saldos dos usuários (uma entrada por uid, formato JSON)
export function usersStore() {
  return getStore({ name: "fichas-users", consistency: "strong" });
}

// Store com o registro de cada pagamento PIX criado (pra saber a quem creditar quando o webhook chegar)
export function paymentsStore() {
  return getStore({ name: "fichas-pagamentos", consistency: "strong" });
}

export async function getOrCreateUser(uid) {
  const store = usersStore();
  let user = await store.get(uid, { type: "json" });
  if (!user) {
    const now = new Date().toISOString();
    user = {
      balance: FICHAS_GRATIS_INICIAIS,
      createdAt: now,
      history: [{ type: "bonus_inicial", amount: FICHAS_GRATIS_INICIAIS, at: now }],
    };
    await store.setJSON(uid, user);
  }
  return user;
}

export async function saveUser(uid, user) {
  await usersStore().setJSON(uid, user);
}
