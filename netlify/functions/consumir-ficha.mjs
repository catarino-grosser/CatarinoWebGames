// POST /.netlify/functions/consumir-ficha   body: { "uid": "xxxx" }
// Desconta 1 ficha do saldo, se houver saldo disponível.
// Chamada pelo hub sempre que o usuário clica em "Jogar".
//
// Observação: a leitura+escrita aqui não é uma transação atômica de banco de dados
// de verdade. Para o volume esperado (uma pessoa, um clique de cada vez) isso é
// seguro na prática, mas se no futuro o tráfego crescer bastante vale migrar para
// o Netlify Database (Postgres) e usar uma transação com "UPDATE ... WHERE balance > 0".

import { getOrCreateUser, saveUser } from "./_lib/store.mjs";

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

  const user = await getOrCreateUser(uid);
  if (user.balance <= 0) {
    return new Response(JSON.stringify({ ok: false, balance: user.balance, error: "saldo insuficiente" }), {
      status: 402,
      headers: { "content-type": "application/json" },
    });
  }

  user.balance -= 1;
  user.history = [...(user.history || []), { type: "consume", amount: -1, at: new Date().toISOString() }].slice(-50);
  await saveUser(uid, user);

  return new Response(JSON.stringify({ ok: true, balance: user.balance }), {
    headers: { "content-type": "application/json" },
  });
};
