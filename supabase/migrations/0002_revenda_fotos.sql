-- Fotos da revenda: bucket privado "revenda-fotos".
-- ATENÇÃO: este é o único arquivo que toca fora do schema "revenda", porque o
-- Supabase guarda buckets e as regras de acesso aos arquivos no schema "storage".
-- Ele só ADICIONA: 1 bucket novo e 1 política que vale apenas para bucket_id = 'revenda-fotos'.
-- Não altera nem apaga buckets, arquivos ou políticas existentes. Políticas no Postgres
-- se somam (OR), então esta não restringe nem amplia o acesso aos outros buckets.

insert into storage.buckets (id, name, public)
values ('revenda-fotos', 'revenda-fotos', false);

-- Só o dono (revenda.donos) mexe, e só dentro da pasta com o próprio user id.
create policy "revenda-fotos: só o dono" on storage.objects for all to authenticated
  using (
    bucket_id = 'revenda-fotos'
    and (select revenda.sou_dono())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'revenda-fotos'
    and (select revenda.sou_dono())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
