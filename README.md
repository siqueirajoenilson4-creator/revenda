# Revenda

Ferramenta do negócio de compra e venda de usados (Londrina e região). Especificação completa em
[especificacao-ferramenta-revenda.md](especificacao-ferramenta-revenda.md).

**Fase 1 (pronta):** login do dono, Calcular, Estoque, Gastos, Vendi, Caixa e giro, Regras, fotos dos itens,
backup/importação em JSON e CSV, PWA (instala no celular).

**Fase 1B (pronta):** Visão geral como tela inicial, área de Vendas (canal, pagamento, comprador, entrega),
meta de lucro do mês, Caixa com extrato.

**Fase 2 (pronta):** Anúncios com gerador de texto, fotos em ordem, Facebook Marketplace assistido (copiar,
baixar/compartilhar fotos, abrir o Marketplace, colar o link), situação por canal, lembrete de renovar a cada
7 dias, histórico de preço, Interessados com respostas prontas e aviso de quem espera resposta há mais de 2 horas.

**Robô do Marketplace:** extensão do Chrome em [extensao-robo/](extensao-robo/LEIA-ME.md) que publica o anúncio
no Facebook do dono e devolve o link ao sistema (botão "Publicar com o robô" na tela do anúncio). Decisão do dono
em 22/10/2026, ciente de que automatizar o Facebook vai contra os termos de uso.

**Fase 3 e 4 (OLX):** dependem do cadastro de integrador aprovado pela OLX. Até lá a OLX funciona como canal
manual (copiar o texto e colar o link).

**Assistente com IA:** responde sobre os números, ajuda a decidir compras e escreve anúncios (só leitura).

Next.js 16 + TypeScript + Tailwind · Supabase (banco, login e fotos) · Vercel (hospedagem). Tudo no plano grátis.

## Configurar o Supabase (uma vez)

O projeto Supabase é **compartilhado** com outro sistema. Tudo da revenda fica no schema `revenda`
e no bucket `revenda-fotos`; nada do schema `public` nem de `auth` é alterado.

1. **SQL Editor:** rode [supabase/migrations/0001_revenda_schema.sql](supabase/migrations/0001_revenda_schema.sql)
   (só cria objetos dentro de `revenda`).
2. **SQL Editor:** rode [supabase/migrations/0002_revenda_fotos.sql](supabase/migrations/0002_revenda_fotos.sql)
   (cria o bucket privado `revenda-fotos` e uma política que só vale para ele).
   Depois, na ordem, [0003_revenda_vendas.sql](supabase/migrations/0003_revenda_vendas.sql) (vendas e meta do mês)
   e [0004_revenda_anuncios.sql](supabase/migrations/0004_revenda_anuncios.sql) (anúncios, interessados e respostas
   prontas). As duas só mexem no schema `revenda` e rodam dentro de uma transação.
3. **Authentication → Users:** garanta que sua conta existe (pode ser a mesma do outro sistema).
4. **SQL Editor:** rode [supabase/cadastrar-dono.sql](supabase/cadastrar-dono.sql) com o seu e-mail.
   Só quem está em `revenda.donos` enxerga os dados; qualquer outra conta recebe "sem acesso".
5. **Project Settings → Data API → Exposed schemas:** adicione `revenda` **mantendo** `public`
   (e `graphql_public`, se estiver lá). Salve.
6. **Project Settings → API Keys:** copie a **URL do projeto** e a **Publishable key** para o `.env.local`
   (modelo em `.env.example`).

No primeiro login o app cria as regras padrão e cadastra a **Honda CB300R** (capital próprio).

## Rodar no computador

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes das fórmulas (seção 5 da especificação)
```

Para abrir no celular na mesma rede Wi-Fi: `npm run dev -- -H 0.0.0.0` e acesse `http://IP-DO-PC:3000`.

## Publicar na Vercel (grátis)

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, **Add New → Project**, importe o repositório (plano **Hobby**, grátis).
3. Em **Environment Variables**, coloque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. No celular, abra o endereço `https://…vercel.app` e use **Adicionar à tela inicial**.

## Importar do Caderno de Revenda

Em **Regras → Importar itens**, envie um JSON assim (valores em reais, datas AAAA-MM-DD ou DD/MM/AAAA):

```json
{
  "itens": [
    {
      "nome": "Bicicleta Caloi aro 29",
      "categoria": "Bicicleta",
      "tipo": "revenda",
      "compra_valor": 300,
      "compra_data": "2026-10-01",
      "compra_local": "Cambé",
      "preco_alvo": 600,
      "venda_valor": 550,
      "venda_data": "2026-10-11",
      "nota": "",
      "gastos": [{ "descricao": "Pneu traseiro", "valor": 48.5, "data": "2026-10-02" }]
    }
  ]
}
```

Só `nome` é obrigatório. `tipo` é `revenda` ou `capital`; `situacao` (`comprado`, `anunciado`, `vendido`)
é deduzida se faltar. A importação **adiciona** itens; não apaga nem substitui. Não importe a CB300R de novo,
ela já é criada no primeiro acesso.

O botão **Exportar JSON** gera esse mesmo formato (serve de backup e pode ser importado de volta).

## Organização do código

- `src/lib/calculo.ts`: todas as fórmulas (pague no máximo, veredito, limite do caixa, lucro, giro…), com testes.
- `src/lib/formato.ts`: reais ↔ centavos, datas em `America/Sao_Paulo`.
- `src/lib/dados.ts`: leitura do banco (só no servidor). `src/app/acoes.ts`: todas as gravações.
- `src/app/(app)/…`: telas. `src/proxy.ts`: exige login em todas as páginas.
- Dinheiro sempre em centavos (inteiros) no banco. Cada linha tem `user_id`; o RLS exige estar em `revenda.donos` e ser o dono da linha.
- Fotos: bucket privado `revenda-fotos`, reduzidas no celular antes de enviar (máx. 1600 px).
