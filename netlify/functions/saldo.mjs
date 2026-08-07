// GET /.netlify/functions/saldo?uid=xxxx
// Retorna o saldo atual de fichas do usuário. Cria o usuário (com as 10 fichas grátis)
// se for o primeiro acesso dele.

import { getOrCreateUser } from "./_lib/store.mjs";

export default async (req) => {
  const uid = new URL(req.url).searchParams.get("uid");
  if (!uid) {
    return new Response(JSON.stringify({ error: "uid obrigatório" }), { status: 400 });
  }
  const user = await getOrCreateUser(uid);
  return new Response(JSON.stringify({ balance: user.balance }), {
    headers: { "content-type": "application/json" },
  });
};
