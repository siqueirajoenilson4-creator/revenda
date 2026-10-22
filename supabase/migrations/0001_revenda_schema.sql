-- Revenda, Fase 1: tudo dentro do schema "revenda".
-- Este arquivo só CRIA objetos dentro de "revenda". Não altera, apaga nem cria
-- trigger em nada fora dele. Sem chave estrangeira para auth.users (isso criaria
-- triggers internos lá); o user_id é só uma coluna uuid.
-- Dinheiro em centavos (bigint). Percentuais como número (30 = 30%).

create schema revenda;

-- Quem pode usar a revenda. Só os user_id listados aqui enxergam qualquer dado.
create table revenda.donos (
  user_id uuid primary key
);

-- true se quem está logado é dono. security definer para a checagem não depender
-- das políticas da própria tabela donos.
create function revenda.sou_dono() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from revenda.donos where user_id = (select auth.uid()));
$$;

create table revenda.regras (
  user_id        uuid primary key default auth.uid(),
  margem_min_pct numeric not null default 30,
  lucro_min      bigint  not null default 8000,
  pechincha_pct  numeric not null default 10,
  taxa_pct       numeric not null default 0,
  custo_km       bigint  not null default 30,
  saldo_inicial  bigint  not null default 0,
  reserva_pct    numeric not null default 20,
  max_item_pct   numeric not null default 30
);

create table revenda.itens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  nome          text not null,
  categoria     text,
  tipo          text not null default 'revenda' check (tipo in ('revenda', 'capital')),
  situacao      text not null default 'comprado' check (situacao in ('comprado', 'anunciado', 'vendido')),
  compra_valor  bigint not null default 0,
  compra_data   date,
  compra_local  text,
  preco_alvo    bigint,
  venda_valor   bigint,
  venda_data    date,
  nota          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index itens_user_idx on revenda.itens (user_id, situacao);

create table revenda.gastos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid(),
  item_id   uuid not null references revenda.itens on delete cascade,
  descricao text not null,
  valor     bigint not null,
  data      date not null default (now() at time zone 'America/Sao_Paulo')::date
);
create index gastos_item_idx on revenda.gastos (item_id);

create table revenda.fotos (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  item_id uuid not null references revenda.itens on delete cascade,
  url     text not null, -- caminho no bucket "revenda-fotos"
  ordem   int not null default 0
);
create index fotos_item_idx on revenda.fotos (item_id, ordem);

-- atualizado_em automático (trigger só na tabela revenda.itens)
create function revenda.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger itens_atualizado_em before update on revenda.itens
  for each row execute function revenda.tocar_atualizado_em();

-- Segurança por linha: precisa estar logado, estar em revenda.donos E ser o dono da linha.
alter table revenda.donos  enable row level security;
alter table revenda.regras enable row level security;
alter table revenda.itens  enable row level security;
alter table revenda.gastos enable row level security;
alter table revenda.fotos  enable row level security;

create policy "ver a si mesmo" on revenda.donos for select to authenticated
  using (user_id = (select auth.uid()));

create policy "dono" on revenda.regras for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.itens for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.gastos for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.fotos for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));

-- Permissões da API: só usuários logados (nada para anon). O RLS acima filtra o resto.
grant usage on schema revenda to authenticated, service_role;
grant select on revenda.donos to authenticated;
grant select, insert, update, delete on revenda.regras, revenda.itens, revenda.gastos, revenda.fotos to authenticated;
grant all on all tables in schema revenda to service_role;
revoke execute on function revenda.sou_dono() from public, anon;
grant execute on function revenda.sou_dono() to authenticated, service_role;
