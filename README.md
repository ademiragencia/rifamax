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
3. Se voce ja executou o schema inicial, execute tambem `supabase_public_migration.sql`.
4. Copie `.env.example` para `.env.local`.
5. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Para liberar acesso administrativo, rode no SQL Editor:

```sql
update usuarios
set id_admin = true
where email = 'seu-email@dominio.com';
```

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

## Publicar na Vercel

1. Importe o repositorio `ademiragencia/rifamax`.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Cadastre todas as variaveis do `.env.example`.
6. Configure `APP_URL` com a URL final do deploy.
7. No Mercado Pago, configure o webhook para:

```text
https://seu-dominio.vercel.app/api/mercadopago/webhook
```

Com as credenciais preenchidas, o app usa Supabase como fonte de dados publica. Sem credenciais, ele cai no modo demo local.
