# RifaMax

Aplicacao React concluida a partir dos arquivos do ZIP. Ela roda localmente com dados de demonstracao e ja deixa a configuracao do Supabase separada para quando voce quiser conectar um banco real.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite.

## Acessos de teste

- Admin: `admin@rifamax.com` / `admin123`
- Cliente: `cliente@rifamax.com` / `cliente123`

## O que foi finalizado

- Projeto Vite/React executavel.
- Tela de rifas com busca, imagens, progresso e metricas.
- Login, cadastro e sessao local.
- Painel administrativo com estatisticas, criacao de rifas e ativar/inativar.
- Compra de numeros com grade interativa, bloqueio de numeros vendidos e historico.
- Persistencia em `localStorage` para testar sem backend.
- `.env.example` e cliente Supabase opcional em `src/lib/supabaseClient.js`.
- `supabase_schema.sql` atualizado com RLS habilitado e policies de insert/update.

## Conectar Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase_schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Conectar Mercado Pago

O checkout usa uma rota serverless para manter o `Access Token` fora do frontend:

- `api/mercadopago/create-preference.js`: cria a preferencia do Checkout Pro.
- `api/mercadopago/webhook.js`: recebe notificacoes de pagamento.

Variaveis necessarias:

```env
VITE_MERCADO_PAGO_PUBLIC_KEY=sua-public-key
MERCADO_PAGO_ACCESS_TOKEN=seu-access-token
APP_URL=https://seu-dominio.com
```

Variaveis recomendadas em producao:

```env
MERCADO_PAGO_WEBHOOK_SECRET=seu-webhook-secret
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

No Vercel, cadastre essas variaveis em Project Settings > Environment Variables. Nunca publique `.env.local`.

O app atual usa o modo local para demonstracao. O cliente Supabase ja esta preparado no projeto para trocar a camada de dados sem deixar credenciais fixas no codigo.
