// GET /.netlify/functions/status-pix?paymentId=xxxx
// Usada pelo botão "Já paguei" no modal do PIX: deixa o frontend perguntar se
// aquele pagamento específico já foi creditado, sem precisar esperar só o webhook.

import { paymentsStore } from "./_lib/store.mjs";

export default async (req) => {
  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) {
    return new Response(JSON.stringify({ error: "paymentId obrigatório" }), { status: 400 });
  }
  const record = await paymentsStore().get(String(paymentId), { type: "json" });
  return new Response(JSON.stringify({ credited: !!record && record.status === "credited" }), {
    headers: { "content-type": "application/json" },
  });
};
