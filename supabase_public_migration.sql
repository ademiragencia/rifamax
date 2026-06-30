-- RifaMax - migracao para uso publico
-- Execute no SQL Editor do Supabase se voce ja rodou o schema inicial.

alter table compras add column if not exists referencia_externa varchar(120);
alter table compras add column if not exists preference_id varchar(255);
alter table rifas add column if not exists status_aprovacao varchar(20) default 'aprovada';

update rifas
set status_aprovacao = 'aprovada'
where status_aprovacao is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rifas_status_aprovacao_check'
  ) then
    alter table rifas
      add constraint rifas_status_aprovacao_check
      check (status_aprovacao in ('pendente', 'aprovada', 'reprovada'));
  end if;
end;
$$;

create unique index if not exists idx_compras_referencia_externa_unique
  on compras(referencia_externa)
  where referencia_externa is not null;

create index if not exists idx_compras_referencia_externa on compras(referencia_externa);

alter table compra_numeros drop constraint if exists compra_numeros_rifa_id_numero_key;
create index if not exists idx_compra_numeros_rifa_numero on compra_numeros(rifa_id, numero);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "compras_owner_insert" on compras;
create policy "compras_owner_insert"
  on compras for insert
  with check (auth.uid() = comprador_id);

drop policy if exists "compras_owner_or_admin_update" on compras;
create policy "compras_owner_or_admin_update"
  on compras for update
  using (auth.uid() = comprador_id or is_admin())
  with check (auth.uid() = comprador_id or is_admin());

drop policy if exists "compra_numeros_owner_insert" on compra_numeros;
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

drop policy if exists "numeros_buyer_or_admin_update" on numeros_rifa;
create policy "numeros_buyer_or_admin_update"
  on numeros_rifa for update
  using (comprador_id is null or auth.uid() = comprador_id or is_admin())
  with check (comprador_id is null or auth.uid() = comprador_id or is_admin());

drop policy if exists "rifas_public_select" on rifas;
create policy "rifas_public_select"
  on rifas for select
  using (
    (ativa = true and status_aprovacao = 'aprovada')
    or auth.uid() = criador_id
    or is_admin()
  );

drop policy if exists "rifas_creator_or_admin_update" on rifas;
create policy "rifas_creator_or_admin_update"
  on rifas for update
  using (is_admin() or (auth.uid() = criador_id and status_aprovacao = 'pendente'))
  with check (is_admin() or (auth.uid() = criador_id and status_aprovacao = 'pendente' and ativa = false));
-- RifaMax - migracao para uso publico
-- Execute no SQL Editor do Supabase se voce ja rodou o schema inicial.

alter table compras add column if not exists referencia_externa varchar(120);
alter table compras add column if not exists preference_id varchar(255);

create unique index if not exists idx_compras_referencia_externa_unique
  on compras(referencia_externa)
  where referencia_externa is not null;

create index if not exists idx_compras_referencia_externa on compras(referencia_externa);

alter table compra_numeros drop constraint if exists compra_numeros_rifa_id_numero_key;
create index if not exists idx_compra_numeros_rifa_numero on compra_numeros(rifa_id, numero);

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

drop policy if exists "compras_owner_insert" on compras;
create policy "compras_owner_insert"
  on compras for insert
  with check (auth.uid() = comprador_id);

drop policy if exists "compras_owner_or_admin_update" on compras;
create policy "compras_owner_or_admin_update"
  on compras for update
  using (auth.uid() = comprador_id or is_admin())
  with check (auth.uid() = comprador_id or is_admin());

drop policy if exists "compra_numeros_owner_insert" on compra_numeros;
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

drop policy if exists "numeros_buyer_or_admin_update" on numeros_rifa;
create policy "numeros_buyer_or_admin_update"
  on numeros_rifa for update
  using (comprador_id is null or auth.uid() = comprador_id or is_admin())
  with check (comprador_id is null or auth.uid() = comprador_id or is_admin());
-- RifaMax - migracao para uso publico
-- Execute no SQL Editor do Supabase se voce ja rodou o schema inicial.

alter table compras add column if not exists referencia_externa varchar(120);
create unique index if not exists idx_compras_referencia_externa_unique
  on compras(referencia_externa)
  where referencia_externa is not null;

create index if not exists idx_compras_referencia_externa on compras(referencia_externa);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "compras_owner_insert" on compras;
create policy "compras_owner_insert"
  on compras for insert
  with check (auth.uid() = comprador_id);

drop policy if exists "compras_owner_or_admin_update" on compras;
create policy "compras_owner_or_admin_update"
  on compras for update
  using (auth.uid() = comprador_id or is_admin())
  with check (auth.uid() = comprador_id or is_admin());

drop policy if exists "compra_numeros_owner_insert" on compra_numeros;
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

drop policy if exists "numeros_buyer_or_admin_update" on numeros_rifa;
create policy "numeros_buyer_or_admin_update"
  on numeros_rifa for update
  using (comprador_id is null or auth.uid() = comprador_id or is_admin())
  with check (comprador_id is null or auth.uid() = comprador_id or is_admin());
