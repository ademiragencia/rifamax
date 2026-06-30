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
  status_aprovacao varchar(20) default 'aprovada' check (status_aprovacao in ('pendente', 'aprovada', 'reprovada')),
  data_termino date,
  data_criacao timestamptz default now(),
  data_atualizacao timestamptz default now()
);

alter table rifas add column if not exists status_aprovacao varchar(20) default 'aprovada';

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
  preference_id varchar(255),
  id_transacao_mp varchar(255),
  observacoes text,
  data_compra timestamptz default now(),
  data_confirmacao timestamptz,
  data_atualizacao timestamptz default now()
);

alter table compras add column if not exists referencia_externa varchar(120);
alter table compras add column if not exists preference_id varchar(255);

create table if not exists compra_numeros (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid references compras(id) on delete cascade not null,
  numero integer not null,
  rifa_id uuid references rifas(id) on delete cascade not null
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
create index if not exists idx_compra_numeros_rifa_numero on compra_numeros(rifa_id, numero);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id_usuario, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email
  )
  on conflict (id_usuario) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    data_atualizacao = now();

  return new;
end;
$$;

create or replace function public.criar_rifa_publica(
  p_nome varchar,
  p_descricao text,
  p_imagem text,
  p_preco numeric,
  p_total_numeros integer,
  p_premio_descricao text,
  p_data_termino date
)
returns rifas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rifa rifas;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome da rifa.';
  end if;

  if coalesce(trim(p_premio_descricao), '') = '' then
    raise exception 'Informe a descricao do premio.';
  end if;

  if p_preco is null or p_preco <= 0 then
    raise exception 'Informe um preco valido.';
  end if;

  if p_total_numeros < 10 or p_total_numeros > 500 then
    raise exception 'Use entre 10 e 500 numeros.';
  end if;

  v_is_admin := is_admin();

  insert into rifas (
    nome,
    descricao,
    imagem,
    preco,
    total_numeros,
    premio_descricao,
    criador_id,
    ativa,
    status_aprovacao,
    data_termino
  )
  values (
    trim(p_nome),
    trim(p_descricao),
    trim(p_imagem),
    p_preco,
    p_total_numeros,
    trim(p_premio_descricao),
    auth.uid(),
    v_is_admin,
    case when v_is_admin then 'aprovada' else 'pendente' end,
    p_data_termino
  )
  returning * into v_rifa;

  insert into numeros_rifa (rifa_id, numero, vendido)
  select v_rifa.id, numero, false
  from generate_series(1, p_total_numeros) as numero;

  return v_rifa;
end;
$$;

grant execute on function public.criar_rifa_publica(varchar, text, text, numeric, integer, text, date) to authenticated;

create or replace function public.criar_compra_mercado_pago(
  p_rifa_id uuid,
  p_numeros integer[],
  p_valor_total numeric,
  p_referencia_externa varchar,
  p_preference_id varchar default null
)
returns compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra compras;
  v_total_numeros integer;
  v_preco numeric;
  v_ativa boolean;
  v_updated integer;
  v_numero integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_numeros is null or array_length(p_numeros, 1) is null then
    raise exception 'Selecione pelo menos um numero.';
  end if;

  if exists (
    select 1
    from unnest(p_numeros) as numero
    group by numero
    having count(*) > 1
  ) then
    raise exception 'Existem numeros repetidos na compra.';
  end if;

  v_total_numeros := array_length(p_numeros, 1);

  select preco, ativa
    into v_preco, v_ativa
  from rifas
  where id = p_rifa_id;

  if not found then
    raise exception 'Rifa nao encontrada.';
  end if;

  if v_ativa is not true then
    raise exception 'Esta rifa nao esta ativa.';
  end if;

  if abs(p_valor_total - round(v_preco * v_total_numeros, 2)) > 0.01 then
    raise exception 'Valor total da compra nao confere.';
  end if;

  update numeros_rifa
  set
    vendido = true,
    comprador_id = auth.uid(),
    data_venda = now()
  where rifa_id = p_rifa_id
    and numero = any(p_numeros)
    and vendido = false
    and comprador_id is null;

  get diagnostics v_updated = row_count;

  if v_updated <> v_total_numeros then
    raise exception 'Um ou mais numeros ja foram reservados.';
  end if;

  insert into compras (
    rifa_id,
    comprador_id,
    valor_total,
    quantidade_numeros,
    status_pagamento,
    metodo_pagamento,
    referencia_externa,
    preference_id
  )
  values (
    p_rifa_id,
    auth.uid(),
    p_valor_total,
    v_total_numeros,
    'pendente',
    'mercado_pago',
    p_referencia_externa,
    p_preference_id
  )
  returning * into v_compra;

  foreach v_numero in array p_numeros loop
    insert into compra_numeros (compra_id, rifa_id, numero)
    values (v_compra.id, p_rifa_id, v_numero);
  end loop;

  return v_compra;
exception
  when unique_violation then
    raise exception 'Esta compra ou algum numero ja foi reservado.';
end;
$$;

grant execute on function public.criar_compra_mercado_pago(uuid, integer[], numeric, varchar, varchar) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
  with check (auth.uid() = id_usuario and id_admin = false);

create policy "usuarios_update_own_profile"
  on usuarios for update
  using (auth.uid() = id_usuario and id_admin = false)
  with check (auth.uid() = id_usuario and id_admin = false);

create policy "usuarios_admin_update"
  on usuarios for update
  using (is_admin())
  with check (is_admin());

create policy "rifas_public_select"
  on rifas for select
  using (
    (ativa = true and status_aprovacao = 'aprovada')
    or auth.uid() = criador_id
    or is_admin()
  );

create policy "rifas_admin_insert"
  on rifas for insert
  with check (is_admin());

create policy "rifas_creator_or_admin_update"
  on rifas for update
  using (is_admin() or (auth.uid() = criador_id and status_aprovacao = 'pendente'))
  with check (is_admin() or (auth.uid() = criador_id and status_aprovacao = 'pendente' and ativa = false));

create policy "numeros_public_select"
  on numeros_rifa for select
  using (true);

create policy "numeros_admin_insert"
  on numeros_rifa for insert
  with check (is_admin());

create policy "numeros_buyer_or_admin_update"
  on numeros_rifa for update
  using (auth.uid() = comprador_id or comprador_id is null or is_admin())
  with check (auth.uid() = comprador_id or comprador_id is null or is_admin());

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
