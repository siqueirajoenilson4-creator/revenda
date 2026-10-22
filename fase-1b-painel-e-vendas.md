# Fase 1B: painel novo e área de Vendas

> Cole no Claude Code junto com a especificação principal (`especificacao-ferramenta-revenda.md`). Peça: "Leia e faça a Fase 1B. Mostre a migration antes de rodar."
> Prévia visual: https://claude.ai/artifact/TKrdz48R1tzGUcvKCMTHhy (os números nela são de exemplo).

## 1. Objetivo

Deixar o app com cara de sistema de loja ou de garagem de carros: uma tela inicial **Visão geral**, com números grandes, gráfico, últimas vendas, o "pátio" com fotos e uma lista do que precisa de atenção. E criar a área **Vendas**, que hoje não existe.

As regras de cálculo da seção 5 da especificação principal não mudam.

## 2. Visual

- **Fontes** (Google Fonts): `Barlow` (400/500/600/700) para textos e `Barlow Condensed` (600/700) para números grandes e títulos. Todos os números usam `font-variant-numeric: tabular-nums`.
- **Cores**:
  - menu/topo `#141B23`, item ativo do menu `#222D39`, texto do menu `#C9D2DC`, texto fraco do menu `#8C99A7`
  - fundo `#EEF0F3`, cartões `#FFFFFF`, bordas `#DDE1E7`, texto `#1A222C`, texto secundário `#5A6675`
  - destaque (botão principal, barra de meta, aba ativa) `#F2A900` com texto `#141B23`
  - lucro/positivo `#17763F`, alerta `#A14B00`, crítico `#B42318`, gráfico de lucro `#1F6FB2`, faturamento `#C9D0D9`
  - selos de canal: Marketplace `#E3EEF8`/`#17507F`, OLX `#FCE6DF`/`#9A3412`, Grupos `#E8EBEF`/`#3B4654`, WhatsApp `#E2F3E7`/`#17643A`
- Bordas arredondadas de 10 a 12 px, sem sombras pesadas e sem gradientes.
- Tema escuro é opcional: faça depois, com as mesmas variáveis.

## 3. Layout

**Computador (≥ 900 px):** menu lateral escuro fixo à esquerda, com o nome da loja, os itens (Visão geral, Calcular compra, Pátio/Estoque, Vendas, Anúncios, Interessados, Caixa, Regras) com contador e a barra da **meta do mês** embaixo.

**Celular:** topo escuro com o lucro do mês, a barra da meta e o ícone de interessados com contador. Abas fixas embaixo: Início, Pátio, Vendas, Conversas, Caixa (Calcular e Regras ficam no menu "mais" ou como atalho). Botões com no mínimo 44 px de altura.

## 4. Tela "Visão geral" (nova tela inicial)

Filtro de período: Semana, Mês (padrão), Ano. Botões: **Calcular compra** e **+ Registrar venda**.

1. **Indicadores** (6 cartões): Faturamento, Lucro (com % da meta), Vendas (com ticket médio), Margem média sobre o custo (com a meta da regra), Caixa livre (com a reserva guardada) e Empatado no pátio (com quantos estão há mais de 30 dias). Cada um mostra a comparação com o período anterior quando houver dados.
2. **Gráfico de vendas e lucro** por semana (barras lado a lado, eixo em R$). No filtro Ano, por mês.
3. **De onde vêm as vendas**: barras por canal, com quantidade e valor, e o tempo médio até vender.
4. **Últimas vendas**: tabela com data, item, canal, pagamento, custo, vendeu, lucro, margem e dias. No celular vira lista de cartões.
5. **No pátio**: cartões com foto (capa), selo de situação, selo de dias (amarelo depois de 15 e vermelho depois de 30), custo, preço de anúncio e lucro previsto. No celular, carrossel horizontal.
6. **Precisa de você**: lista gerada dos dados:
   - item com mais de 30 dias: "baixar 10%". Com 45 dias ou mais: "vender a preço de custo" (regras do Plano do negócio).
   - item capital ou de revenda sem gastos lançados e com nota pendente.
   - (Fase 2) interessados esperando resposta e anúncios para renovar. Esconder o que ainda não existe.

Quando não há dados, cada bloco mostra um estado vazio que explica como começar ("Nenhuma venda ainda. Toque em + Registrar venda.").

## 5. Área "Vendas" (nova)

### Dados
Migration `0003_revenda_vendas.sql`, que **só mexe no schema `revenda`**. Adicionar a `revenda.itens` (ou criar `revenda.vendas` com `item_id` único, o que ficar mais limpo):

- `venda_canal` (marketplace | olx | grupos | whatsapp | indicacao | outro)
- `venda_pagamento` (pix | dinheiro | cartao | transferencia | troca | outro)
- `comprador_nome`, `comprador_contato` (opcionais)
- `venda_cidade` (opcional)
- `venda_entrega` (retirada | entreguei), `venda_custo_entrega` (vira gasto do item)
- `venda_obs`

Na tabela de regras, adicionar `meta_lucro_mes` (padrão R$ 2.000; editável em Regras).

Vendas antigas sem canal aparecem como "Não informado".

### Registrar venda
Botão **+ Registrar venda** (no topo e no item): escolher o item do estoque (busca), valor recebido, data (hoje), canal, pagamento, entrega e comprador. Mostrar ao vivo o lucro, a margem sobre o custo e o desconto dado em relação ao preço anunciado. A venda da CB300R (tipo capital) mostra "Entra no caixa" no lugar do lucro.

### Tela Vendas
- Filtros: período, canal, pagamento e busca por item ou comprador.
- Totais do filtro: faturamento, lucro, quantidade, ticket médio, margem média e desconto médio dado.
- Lista/tabela com as colunas da seção 4.4, ordenável. Tocar abre o item.
- **Desfazer venda** continua no detalhe do item.
- Exportar o filtro em CSV.

## 6. Pronto quando

- Visão geral é a tela inicial, igual à prévia no computador e no celular, sem rolagem para o lado em 390 px.
- Registrar uma venda com canal e pagamento atualiza na hora os indicadores, o gráfico, os canais e a lista.
- Testes novos: totais por canal, ticket médio, desconto médio, meta do mês e as regras de 30 e 45 dias.
- A migration não altera nada fora do schema `revenda`.
