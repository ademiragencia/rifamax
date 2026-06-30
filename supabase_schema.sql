-- RifaMax - schema Supabase
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid references auth.users(id) on delete cascade,
  nome varchar(255) not null,
  email varchar(255) unique not null,
  cpf varchar(14),
  telefone varchar(20),
  id_admin boolean default false,
  ativo boolean default true,
  data_criacao timestamptz default now(),
  data_atualizacao timestamptz default now(),
  unique(id_usuario)
);

create table if not exists rifas (
  id uuid primary key default gen_random_uuid(),
  nome varchar(255) not null,
  descricao text,
  imagem text,
  preco numeric(10, 2) not null check (preco > 0),
  total_numeros integer not null check (total_numeros > 0),
  premio_descricao text not null,
  criador_id uuid references auth.users(id) on delete cascade,
  ativa boolean default true,
  data_termino date,
  data_criacao timestamptz default now(),
  data_atualizacao timestamptz default now()
);

create table if not exists numeros_rifa (
  id uuid primary key default gen_random_uuid(),
  rifa_id uuid references rifas(id) on delete cascade not null,
  numero integer not null,
  vendido boolean default false,
  comprador_id uuid references auth.users(id),
  data_venda timestamptz,
  unique(rifa_id, numero)
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  rifa_id uuid references rifas(id) on delete cascade not null,
  comprador_id uuid references auth.users(id) on delete cascade not null,
  valor_total numeric(10, 2) not null check (valor_total >= 0),
  quantidade_numeros integer not null check (quantidade_numeros > 0),
  status_pagamento varchar(50) default 'pendente',
  metodo_pagamento varchar(50) default 'simulado',
  referencia_externa varchar(120) unique,
  id_transacao_mp varchar(255),
  observacoes text,
  data_compra timestamptz default now(),
  data_confirmacao timestamptz,
  data_atualizacao timestamptz default now()
);

alter table compras add column if not exists referencia_externa varchar(120);

create table if not exists compra_numeros (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid references compras(id) on delete cascade not null,
  numero integer not null,
  rifa_id uuid references rifas(id) on delete cascade not null,
  unique(rifa_id, numero)
);

create table if not exists sorteios (
  id uuid primary key default gen_random_uuid(),
  rifa_id uuid references rifas(id) on delete cascade not null,
  numero_ganhador integer not null,
  data_sorteio timestamptz default now(),
  ganhador_id uuid references auth.users(id),
  premio_entregue boolean default false,
  data_entrega timestamptz,
  observacoes text
);

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete cascade not null,
  tipo varchar(50) not null,
  titulo varchar(255) not null,
  mensagem text,
  lida boolean default false,
  data_criacao timestamptz default now()
);

create index if not exists idx_usuarios_email on usuarios(email);
create index if not exists idx_usuarios_id_usuario on usuarios(id_usuario);
create index if not exists idx_rifas_criador on rifas(criador_id);
create index if not exists idx_rifas_ativa on rifas(ativa);
create index if not exists idx_numeros_rifa_id on numeros_rifa(rifa_id);
create index if not exists idx_numeros_comprador on numeros_rifa(comprador_id);
create index if not exists idx_compras_comprador on compras(comprador_id);
create index if not exists idx_compras_rifa on compras(rifa_id);
create index if not exists idx_compras_referencia_externa on compras(referencia_externa);
create index if not exists idx_compra_numeros_compra on compra_numeros(compra_id);

alter table usuarios enable row level security;
alter table rifas enable row level security;
alter table numeros_rifa enable row level security;
alter table compras enable row level security;
alter table compra_numeros enable row level security;
alter table sorteios enable row level security;
alter table notificacoes enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuarios
    where id_usuario = auth.uid()
      and id_admin = true
      and ativo = true
  );
$$;

create or replace function atualizar_data_atualizacao()
returns trigger
language plpgsql
as $$
begin
  new.data_atualizacao = now();
  return new;
end;
$$;

drop trigger if exists trigger_usuarios_atualizacao on usuarios;
create trigger trigger_usuarios_atualizacao
before update on usuarios
for each row execute function atualizar_data_atualizacao();

drop trigger if exists trigger_rifas_atualizacao on rifas;
create trigger trigger_rifas_atualizacao
before update on rifas
for each row execute function atualizar_data_atualizacao();

drop trigger if exists trigger_compras_atualizacao on compras;
create trigger trigger_compras_atualizacao
before update on compras
for each row execute function atualizar_data_atualizacao();

create policy "usuarios_select_owner_or_admin"
  on usuarios for select
  using (auth.uid() = id_usuario or is_admin());

create policy "usuarios_insert_own_profile"
  on usuarios for insert
  with check (auth.uid() = id_usuario);

create policy "usuarios_update_owner_or_admin"
  on usuarios for update
  using (auth.uid() = id_usuario or is_admin())
  with check (auth.uid() = id_usuario or is_admin());

create policy "rifas_public_select"
  on rifas for select
  using (true);

create policy "rifas_admin_insert"
  on rifas for insert
  with check (is_admin());

create policy "rifas_creator_or_admin_update"
  on rifas for update
  using (auth.uid() = criador_id or is_admin())
  with check (auth.uid() = criador_id or is_admin());

create policy "numeros_public_select"
  on numeros_rifa for select
  using (true);

create policy "numeros_admin_insert"
  on numeros_rifa for insert
  with check (is_admin());

create policy "numeros_buyer_or_admin_update"
  on numeros_rifa for update
  using (auth.uid() = comprador_id or comprador_id is null or is_admin())
  with check (auth.uid() = comprador_id or is_admin());

create policy "compras_owner_or_admin_select"
  on compras for select
  using (auth.uid() = comprador_id or is_admin());

create policy "compras_owner_insert"
  on compras for insert
  with check (auth.uid() = comprador_id);

create policy "compras_owner_or_admin_update"
  on compras for update
  using (auth.uid() = comprador_id or is_admin())
  with check (auth.uid() = comprador_id or is_admin());

create policy "compra_numeros_owner_or_admin_select"
  on compra_numeros for select
  using (
    exists (
      select 1
      from compras c
      where c.id = compra_id
        and (c.comprador_id = auth.uid() or is_admin())
    )
  );

create policy "compra_numeros_owner_insert"
  on compra_numeros for insert
  with check (
    exists (
      select 1
      from compras c
      where c.id = compra_id
        and c.comprador_id = auth.uid()
    )
  );

create policy "sorteios_public_select"
  on sorteios for select
  using (true);

create policy "sorteios_admin_write"
  on sorteios for all
  using (is_admin())
  with check (is_admin());

create policy "notificacoes_owner_select"
  on notificacoes for select
  using (auth.uid() = usuario_id or is_admin());

create policy "notificacoes_admin_insert"
  on notificacoes for insert
  with check (is_admin());

create policy "notificacoes_owner_update"
  on notificacoes for update
  using (auth.uid() = usuario_id or is_admin())
  with check (auth.uid() = usuario_id or is_admin());

create or replace view vw_estatisticas_rifa as
select
  r.id,
  r.nome,
  r.ativa,
  r.preco,
  r.total_numeros,
  count(distinct n.id) filter (where n.vendido = true) as numeros_vendidos,
  count(distinct c.id) as total_compras,
  coalesce(sum(c.valor_total) filter (where c.status_pagamento = 'confirmado'), 0) as faturamento_total,
  round(
    (count(distinct n.id) filter (where n.vendido = true)::numeric / greatest(r.total_numeros, 1)) * 100,
    2
  ) as percentual_vendido
from rifas r
left join numeros_rifa n on r.id = n.rifa_id
left join compras c on r.id = c.rifa_id
group by r.id, r.nome, r.ativa, r.preco, r.total_numeros;

create or replace view vw_compras_detalhes as
select
  c.id,
  c.rifa_id,
  r.nome as rifa_nome,
  u.nome as comprador_nome,
  u.email as comprador_email,
  c.valor_total,
  c.quantidade_numeros,
  c.status_pagamento,
  c.data_compra,
  string_agg(cn.numero::text, ', ' order by cn.numero) as numeros_comprados
from compras c
join rifas r on c.rifa_id = r.id
join usuarios u on c.comprador_id = u.id_usuario
left join compra_numeros cn on c.id = cn.compra_id
group by c.id, c.rifa_id, r.nome, u.nome, u.email, c.valor_total, c.quantidade_numeros, c.status_pagamento, c.data_compra;
