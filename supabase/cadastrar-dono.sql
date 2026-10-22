-- Rodar DEPOIS das migrations, uma vez. Troque o e-mail pelo da sua conta.
-- Só LÊ auth.users (para achar o seu id) e grava em revenda.donos.
insert into revenda.donos (user_id)
select id from auth.users where lower(email) = lower('SEU-EMAIL-AQUI')
on conflict do nothing
returning user_id;  -- tem que devolver 1 linha; se vier vazio, o e-mail não existe no projeto
