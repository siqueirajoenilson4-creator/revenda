-- Revenda, Fase 1B: detalhes de cada venda e meta de lucro do mês.
-- Só mexe no schema "revenda": cria a tabela revenda.vendas e acrescenta uma
-- coluna em revenda.regras. Nada em public, auth ou storage.
-- Valor e data da venda continuam em revenda.itens (venda_valor, venda_data),
-- então as contas de caixa, lucro e giro não mudam. Vendas antigas ficam sem
-- linha aqui e aparecem como "Não informado".

begin;

create table revenda.vendas (
  item_id           uuid primary key references revenda.itens on delete cascade,
  user_id           uuid not null default auth.uid(),
  canal             text check (canal in ('marketplace', 'olx', 'grupos', 'whatsapp', 'indicacao', 'outro')),
  pagamento         text check (pagamento in ('pix', 'dinheiro', 'cartao', 'transferencia', 'troca', 'outro')),
  comprador_nome    text,
  comprador_contato text,
  cidade            text,
  entrega           text check (entrega in ('retirada', 'entreguei')),
  -- O custo da entrega vira um gasto do item; guardamos qual para desfazer junto.
  gasto_entrega_id  uuid references revenda.gastos on delete set null,
  obs               text,
  criado_em         timestamptz not null default now()
);

-- Meta de lucro do mês, editável em Regras. Padrão R$ 2.000 (em centavos).
alter table revenda.regras add column meta_lucro_mes bigint not null default 200000;

alter table revenda.vendas enable row level security;
create policy "dono" on revenda.vendas for all to authenticated
  using ((select revenda.sou_dono()) and user_id = (select auth.uid()))
  with check ((select revenda.sou_dono()) and user_id = (select auth.uid()));

grant select, insert, update, delete on revenda.vendas to authenticated;
grant all on revenda.vendas to service_role;

-- A API passa a enxergar a tabela nova sem esperar.
notify pgrst, 'reload schema';

commit;
