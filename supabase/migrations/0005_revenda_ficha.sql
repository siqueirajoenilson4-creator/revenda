-- Revenda: ficha do anúncio por tipo de produto (moto, carro, celular...).
-- Só ACRESCENTA duas colunas em revenda.anuncios. Nada em public, auth ou storage.
-- tipo: id de lib/detalhes.ts (TIPOS); detalhes: { campo: valor } do tipo.

begin;

alter table revenda.anuncios
  add column tipo text,
  add column detalhes jsonb not null default '{}'::jsonb;

-- A API passa a enxergar as colunas novas sem esperar.
notify pgrst, 'reload schema';

commit;
