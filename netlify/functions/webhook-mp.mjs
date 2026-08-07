// POST /.netlify/functions/webhook-mp
// O Mercado Pago chama essa URL sozinho quando o status de um pagamento muda
// (configurada no campo "notification_url" ao criar o PIX em criar-pix.mjs).
// Aqui a gente confirma o pagamento direto na API do Mercado Pago (nunca confia
// só no que vem no corpo do webhook) e credita as fichas pro usuário certo.

import { paymentsStore, getOrCreateUser, saveUser } from "./_lib/store.mjs";

export default async (req) => {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("ok"); // sempre responde 200 pro Mercado Pago não ficar re-tentando à toa
  }

  const paymentId = payload && payload.data && payload.data.id;
  if (!paymentId) return new Response("ok");

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return new Response("ok");

  // busca o pagamento de verdade na API (não confia no conteúdo do webhook em si)
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return new Response("ok");
  const payment = await resp.json();

  if (payment.status !== "approved") return new Response("ok");

  const store = paymentsStore();
  const record = await store.get(String(paymentId), { type: "json" });
  if (!record) return new Response("ok"); // pagamento que não foi criado por essa função
  if (record.status === "credited") return new Response("ok"); // idempotência: evita creditar 2x

  const user = await getOrCreateUser(record.uid);
  user.balance += record.fichas;
  user.history = [
    ...(user.history || []),
    { type: "purchase", amount: record.fichas, at: new Date().toISOString(), paymentId: String(paymentId) },
  ].slice(-50);
  await saveUser(record.uid, user);

  record.status = "credited";
  record.creditedAt = new Date().toISOString();
  await store.setJSON(String(paymentId), record);

  return new Response("ok");
};
