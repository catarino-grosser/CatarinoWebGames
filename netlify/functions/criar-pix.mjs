// POST /.netlify/functions/criar-pix   body: { "uid": "xxxx" }
// Cria uma cobrança PIX de R$1,00 no Mercado Pago (Checkout Transparente) e devolve
// o QR code + o código "copia e cola" pro frontend mostrar num modal.
//
// IMPORTANTE — testar antes de ir pra produção:
// Este código usa o endpoint clássico /v1/payments, que é o mais documentado e estável
// para Pix via Checkout Transparente. O Mercado Pago também tem uma API mais nova
// ("API Orders", /v1/orders) para a qual eles estão migrando aos poucos — vale conferir
// a documentação atual antes de lançar:
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
//
// Também não tenho 100% de certeza se o Mercado Pago vai exigir o CPF do pagador
// (campo payer.identification) pra liberar o Pix — em alguns fluxos é obrigatório.
// Teste com as credenciais de sandbox primeiro; se a API recusar por falta de CPF,
// dá pra pedir esse dado num campinho antes de gerar o QR code e incluir aqui embaixo.

import { paymentsStore } from "./_lib/store.mjs";
import crypto from "node:crypto";

const FICHAS_POR_COMPRA = 30;
const VALOR_REAIS = 1.0;

export default async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "corpo inválido" }), { status: 400 });
  }
  const { uid } = body;
  if (!uid) {
    return new Response(JSON.stringify({ error: "uid obrigatório" }), { status: 400 });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    console.error("criar-pix: variável de ambiente MP_ACCESS_TOKEN não foi encontrada em process.env");
    return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado nas variáveis de ambiente" }), { status: 500 });
  }

  const idempotencyKey = crypto.randomUUID();
  // uid vai no external_reference pra gente identificar o comprador quando o webhook chegar
  const externalReference = `${uid}:${idempotencyKey}`;

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  // domínio real do seu site, sem o "https://" — usado só pra montar um e-mail
  // com formato válido pro Mercado Pago aceitar (ele exige e-mail bem-formado).
  const siteDomain = siteUrl ? siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : "catarinowebgames.netlify.app";

  const payload = {
    transaction_amount: VALOR_REAIS,
    description: `${FICHAS_POR_COMPRA} fichas - Catarino Web Games`,
    payment_method_id: "pix",
    external_reference: externalReference,
    notification_url: siteUrl ? `${siteUrl}/.netlify/functions/webhook-mp` : undefined,
    payer: {
      email: `fichas+${uid}@${siteDomain}`,
      // Se o Mercado Pago exigir CPF, adicione algo assim (coletando do usuário antes):
      // identification: { type: "CPF", number: "00000000000" },
    },
  };

  let resp, data;
  try {
    resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    data = await resp.json();
  } catch (err) {
    console.error("criar-pix: falha de rede ao chamar o Mercado Pago:", err);
    return new Response(JSON.stringify({ error: "Falha de rede ao falar com o Mercado Pago" }), { status: 502 });
  }

  if (!resp.ok) {
    // Isso aparece nos logs da function no painel do Netlify (Functions > criar-pix > Logs)
    console.error("criar-pix: Mercado Pago recusou o pagamento. Status:", resp.status, "Resposta:", JSON.stringify(data));
    return new Response(JSON.stringify({ error: "Falha ao criar pagamento no Mercado Pago", details: data }), { status: 502 });
  }

  const txData = data.point_of_interaction && data.point_of_interaction.transaction_data;
  if (!txData) {
    console.error("criar-pix: resposta sem point_of_interaction.transaction_data:", JSON.stringify(data));
    return new Response(JSON.stringify({ error: "Resposta inesperada do Mercado Pago", details: data }), { status: 502 });
  }

  // guarda o pagamento como pendente pra o webhook saber quantas fichas creditar e pra quem
  await paymentsStore().setJSON(String(data.id), {
    uid,
    fichas: FICHAS_POR_COMPRA,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      paymentId: data.id,
      qrCode: txData.qr_code, // código "copia e cola"
      qrCodeBase64: txData.qr_code_base64, // imagem do QR code em base64
      ticketUrl: txData.ticket_url,
    }),
    { headers: { "content-type": "application/json" } }
  );
};
