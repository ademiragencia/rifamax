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
  with check (auth.uid() = comprador_id or is_admin());
