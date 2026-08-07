# Sistema de fichas — como colocar no ar

## 1. Onde colocar os arquivos
Coloque a pasta `netlify/functions/` na raiz do seu repositório (do mesmo jeito que já
está aqui). O `fichas.js` vai na mesma pasta onde está o `index.html` e os jogos.

```
seu-repositorio/
├── index.html
├── fichas.js
├── dusk-runner.html
├── ...outros jogos...
└── netlify/
    └── functions/
        ├── _lib/store.mjs
        ├── saldo.mjs
        ├── consumir-ficha.mjs
        ├── criar-pix.mjs
        ├── webhook-mp.mjs
        └── status-pix.mjs
```

## 2. Instalar a dependência do Netlify Blobs
No terminal, dentro do repositório:
```
npm install @netlify/blobs
```
(o Netlify Blobs já vem incluso no seu plano — isso só instala a bibliotequinha que
as funções usam pra falar com ele. Não precisa criar conta em nenhum outro serviço.)

## 3. Configurar a variável de ambiente
No painel do Netlify: **Site settings → Environment variables**, adicione:
- `MP_ACCESS_TOKEN` = o Access Token da sua conta do Mercado Pago (comece testando
  com o **token de teste/sandbox**, disponível em *Suas integrações → Credenciais de teste*)

## 4. Configurar o webhook no Mercado Pago
No painel de desenvolvedores do Mercado Pago, configure a notification URL como:
```
https://SEUSITE.netlify.app/.netlify/functions/webhook-mp
```
(o código já envia essa URL automaticamente ao criar o PIX, mas registrar também no
painel do Mercado Pago é recomendado como redundância.)

## 5. Testar antes de cobrar de verdade
Use as credenciais de sandbox do Mercado Pago e faça uma compra de teste completa:
gerar o PIX → pagar com o app de testes do Mercado Pago → conferir se o saldo
atualiza sozinho. Só troque para o Access Token de produção depois disso funcionar.

## Pontos de atenção (leia antes de lançar)
- **CPF do pagador**: o Mercado Pago às vezes exige `payer.identification` (CPF) pra
  liberar um Pix. Se o teste em sandbox der erro por causa disso, adicione um campo
  pedindo o CPF antes de gerar o QR code — o lugar certo pra incluir isso já está
  comentado dentro de `criar-pix.mjs`.
- **API em transição**: este código usa o endpoint clássico `/v1/payments`, que é o
  mais estável e documentado hoje. O Mercado Pago está migrando aos poucos para uma
  API mais nova ("API Orders"). Vale checar a documentação atual deles de vez em
  quando: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- **Proteção só no hub**: hoje o desconto de ficha acontece quando a pessoa clica em
  "Jogar" na página inicial. Isso cobre o uso normal, mas alguém que souber a URL
  direta de um jogo (ex: digitar `seusite.com/dusk-runner.html` direto) ainda
  consegue abrir sem gastar ficha. Se isso for um problema real, dá pra adicionar
  uma verificação parecida dentro de cada arquivo de jogo — é só avisar que eu ajudo.
- **CNPJ/MEI e LGPD**: não sou advogado nem contador. Pra cobrar de verdade vale
  confirmar com um contador se precisa de CNPJ/MEI, e ter uma política de privacidade
  simples no site já que vocês vão guardar um identificador do usuário e dados de
  pagamento.
