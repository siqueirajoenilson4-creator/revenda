-- Revenda, Fase 2: anúncios, publicação por canal, histórico de preço,
-- interessados, mensagens e respostas prontas.
-- Só CRIA objetos dentro do schema "revenda". Nada em public, auth ou storage.
-- As fotos do anúncio são as próprias fotos do item (revenda.fotos, pela ordem).

begin;

-- Um anúncio por item.
create table revenda.anuncios (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid(),
  item_id            uuid not null unique references revenda.itens on delete cascade,
  titulo             text not null default '',
  descricao          text not null default '',
  preco              bigint,
  categoria          text,
  cidade             text,
  -- As mesmas opções do Marketplace, para copiar sem traduzir.
  estado_conservacao text check (estado_conservacao in ('novo', 'como_novo', 'bom', 'razoavel')),
  aceita_troca       boolean not null default false,
  entrega            text check (entrega in ('retirada', 'entrego', 'ambos')),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

-- Uma linha por canal em cada anúncio (situação, link e lembrete de renovar).
create table revenda.publicacoes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  anuncio_id   uuid not null references revenda.anuncios on delete cascade,
  canal        text not null check (canal in ('marketplace', 'olx', 'grupos', 'whatsapp', 'outro')),
  situacao     text not null default 'rascunho' check (situacao in ('rascunho', 'publicado', 'pausado', 'vendido')),
  id_externo   text,
  link         text,
  publicado_em timestamptz,
  renovar_em   date,
  unique (anuncio_id, canal)
);

-- Histórico de preço do anúncio: cada mudança fica registrada com a data.
create table revenda.precos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  anuncio_id uuid not null references revenda.anuncios on delete cascade,
  preco      bigint not null,
  data       date not null default (now() at time zone 'America/Sao_Paulo')::date,
  criado_em  timestamptz not null default now()
);
create index precos_anuncio_idx on revenda.precos (anuncio_id, criado_em);

-- Interessados (registro manual por enquanto; a OLX entra aqui na Fase 4).
create table revenda.contatos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  item_id          uuid references revenda.itens on delete cascade,
  canal            text not null check (canal in ('marketplace', 'olx', 'grupos', 'whatsapp', 'indicacao', 'outro')),
  nome             text not null,
  telefone         text,
  oferta           bigint,
  situacao         text not null default 'novo' check (situacao in ('novo', 'negociando', 'agendado', 'perdido', 'comprou')),
  proximo_passo    text,
  retorno_em       timestamptz,
  -- Preenchido quando a pessoa mandou mensagem e ainda não foi respondida.
  aguardando_desde timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index contatos_user_idx on revenda.contatos (user_id, situacao);
create index contatos_item_idx on revenda.contatos (item_id);

create table revenda.mensagens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  contato_id uuid not null references revenda.contatos on delete cascade,
  direcao    text not null check (direcao in ('entrada', 'saida')),
  texto      text not null,
  enviada_em timestamptz not null default now(),
  id_externo text
);
create index mensagens_contato_idx on revenda.mensagens (contato_id, enviada_em);

-- Respostas prontas, editáveis.
create table revenda.respostas (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  titulo  text not null,
  texto   text not null,
  ordem   int not null default 0
);

-- atualizado_em automático (mesma função da Fase 1, só em tabelas do schema revenda)
create trigger anuncios_atualizado_em before update on revenda.anuncios
  for each row execute function revenda.tocar_atualizado_em();
create trigger contatos_atualizado_em before update on revenda.contatos
  for each row execute function revenda.tocar_atualizado_em();

-- Segurança por linha: igual às tabelas da Fase 1.
alter table revenda.anuncios    enable row level security;
alter table revenda.publicacoes enable row level security;
alter table revenda.precos      enable row level security;
alter table revenda.contatos    enable row level security;
alter table revenda.mensagens   enable row level security;
alter table revenda.respostas   enable row level security;

create policy "dono" on revenda.anuncios for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.publicacoes for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.precos for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.contatos for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.mensagens for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));
create policy "dono" on revenda.respostas for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));

grant select, insert, update, delete on
  revenda.anuncios, revenda.publicacoes, revenda.precos,
  revenda.contatos, revenda.mensagens, revenda.respostas
  to authenticated;
grant all on
  revenda.anuncios, revenda.publicacoes, revenda.precos,
  revenda.contatos, revenda.mensagens, revenda.respostas
  to service_role;

notify pgrst, 'reload schema';

commit;
