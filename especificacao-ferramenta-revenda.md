# Ferramenta de Revenda: especificação para construir

> Cole este arquivo no Claude Code (VS Code) e peça: "Leia a especificação e construa a Fase 1. Me pergunte antes de criar contas pagas ou gastar dinheiro."

## 1. O que é

Uma ferramenta web, que funciona no celular e no computador, onde o Joenilson toca o negócio de compra e venda de usados na região de Londrina (Cambé, Cornélio Procópio até Curiúva). Ela é a base do negócio:

1. **Antes de comprar**: diz quanto ele pode pagar no máximo por um item sem perder a margem.
2. **Estoque**: cada item com compra, gastos do trato, anúncio, venda, lucro e dias parado.
3. **Anúncios**: criar, editar e publicar o anúncio de cada item na OLX e no Facebook Marketplace a partir de um lugar só.
4. **Conversas**: ver e responder os interessados num lugar só, ligados ao item.
5. **Caixa e giro**: dinheiro livre, dinheiro empatado, lucro, margem e giro.

Um usuário só (o dono) por enquanto. Idioma da interface: português do Brasil. Moeda: R$.

## 2. O que dá e o que não dá para conectar (pesquisado em 21/10/2026)

| Canal | Publicar/editar anúncio | Conversas | Como fazer |
|---|---|---|---|
| **OLX** | **Sim, oficial.** API de Integração de Anúncios (autoupload) com login OAuth. | **Provável.** A autenticação da OLX lista o escopo `chat`. Confirmar com a OLX se é liberado para a conta dele. | Cadastrar a ferramenta como integrador na OLX e pedir os escopos `autoupload`, `basic_user_info` e `chat`. Pode exigir conta profissional; confirmar. |
| **Facebook Marketplace** | **Não para pessoa física.** A Meta só abre API de Marketplace para parceiros comerciais aprovados (Marketplace Partnership Program). | **Não.** As conversas do Marketplace de perfil pessoal não têm API. | Modo assistido: a ferramenta monta o anúncio pronto e ele publica no app do Facebook em 1 minuto. Conversas ficam no Messenger, e ele registra o interessado na ferramenta. |

**Regra de segurança (obrigatória):** nada de robô, extensão que clica sozinha, raspagem (scraping) ou login automático no Facebook. Isso vai contra os termos de uso e pode bloquear a conta dele, que é o principal canal de venda. Nunca guardar senha do Facebook ou da OLX; a OLX usa OAuth (token), o Facebook fica fora.

Fontes:
- OLX, documentação da API de anúncios: https://developers.olx.com.br/anuncio/api/home.html
- OLX, autenticação OAuth e escopos: https://developers.olx.com.br/anuncio/api/oauth.html
- OLX, anúncios publicados: https://developers.olx.com.br/anuncio/api/published_ads.html
- OLX, status do anúncio: https://developers.olx.com.br/anuncio/api/published_ads_status.html
- OLX, como cadastrar integrador: https://ajuda.olx.com.br/s/article/como-cadastrar-integrador (contato: suporteintegrador@olxbr.com)
- Meta, Marketplace Partnerships: https://developers.secure.facebook.com/docs/marketplace/partnerships/

Algumas páginas da OLX têm alguns anos. Antes de programar a Fase 3, conferir os endpoints atuais na documentação.

## 3. Tecnologia sugerida

Pode trocar se tiver motivo, mas mantenha simples e de custo zero no começo:

- **Next.js (App Router) + TypeScript + Tailwind**: uma base só para celular e computador.
- **Supabase** (plano grátis): banco Postgres, login do dono e armazenamento das fotos.
- **Vercel** (plano grátis): hospedagem com endereço https, necessário para o retorno do login OAuth da OLX.
- **PWA**: dá para "instalar" no celular como app (ícone na tela inicial).
- Valores em centavos (inteiros) no banco. Datas em `America/Sao_Paulo`.

Peça autorização antes de criar qualquer conta paga, domínio ou serviço com cobrança.

## 4. Telas

Layout: no celular, abas fixas embaixo; no computador, menu lateral e listas em tabela. Nenhuma tela pode rolar para o lado no celular.

### 4.1 Calcular (antes de comprar)
Campos: o que é, vende por (R$), trato/peças (R$), km ida e volta, outros gastos (R$), o vendedor pede (R$, opcional).
Mostra:
- **Pague no máximo** (arredondado para baixo de 10 em 10).
- Limite do caixa: "não passe de R$ X num item só".
- Veredito se o preço pedido foi preenchido: **Bom negócio** (verde), **Apertado** (amarelo), **Prejuízo** (vermelho), com o lucro esperado.
- "Ver a conta" com cada linha do cálculo.
- Botão **Comprei, registrar no estoque**, que cria o item já com o gasto de deslocamento.

### 4.2 Estoque
Lista com filtro (Parados, Anunciados, Vendidos, Todos) e busca. Cada item mostra: foto, nome, situação, custo total, preço de anúncio, lucro previsto ou realizado, dias parado (destacar em amarelo depois de 15 dias e vermelho depois de 30).
Ações: + Gasto, Anunciar, Vendi, Editar, Apagar (com confirmação na própria tela).

### 4.3 Anúncios
Para cada item, um anúncio com: título, descrição, preço, categoria, fotos (ordem arrastável, a primeira é a capa), cidade/bairro, estado de conservação, aceita troca, entrega.
- **Gerador de texto**: botão que monta título e descrição a partir dos dados do item (ponto forte, estado, o que foi feito no trato, retirada/entrega na região).
- **Por canal**, uma linha com a situação: rascunho, publicado, pausado, vendido, com link do anúncio e data.
- **OLX** (Fase 3): botões Publicar, Atualizar, Remover via API; situação lida da API.
- **Facebook** (modo assistido): botão "Copiar título", "Copiar descrição", "Baixar fotos", link para abrir o Marketplace, e campo para colar o link do anúncio publicado. Lembrete para renovar o anúncio a cada 7 dias.
- Histórico de preço: toda baixa de preço fica registrada com data.

### 4.4 Conversas
Caixa de entrada única, ligada a cada item.
- **OLX** (Fase 4, se o escopo `chat` for liberado): mensagens chegam e são respondidas pela ferramenta.
- **Facebook e WhatsApp**: registro manual rápido do interessado (nome, canal, oferta, próximo passo, data de retorno).
- Respostas prontas (editáveis): "Ainda disponível", "Menor preço", "Onde retirar", "Aceito Pix".
- Lembrete de quem está esperando resposta há mais de 2 horas.

### 4.5 Caixa e giro
Cartões: caixa livre, empatado em estoque (valor e quantidade), lucro realizado, margem média, giro médio em dias, quantidade vendida, capital da moto. Gráfico simples de lucro por mês. Filtro por período.

### 4.6 Regras
Editar: margem mínima (% da venda), lucro mínimo por item (R$), pechincha do comprador (%), taxa do anúncio (%), custo por km (R$), saldo inicial do caixa (R$), reserva intocável (% do caixa), máximo num item (% do caixa).

## 5. Regras de cálculo (iguais ao Caderno de Revenda atual)

```
recebe       = venda − venda × pechincha% − (venda − pechincha) × taxa%
deslocamento = km × custo_por_km
custos       = trato + deslocamento + outros
margem_min   = lucro mínimo em % sobre o custo total (compra + custos)
pague_no_max = min(recebe ÷ (1 + margem_min%) − custos,
                   recebe − custos − lucro_min)       (se ≤ 0: "Não compensa")

lucro_esperado (com preço pedido) = recebe − custos − pedido
lucro_alvo   = max((pedido + custos) × margem_min%, lucro_min)
  ≥ lucro_alvo → Bom negócio | > 0 → Apertado | ≤ 0 → Prejuízo

limite_por_item = min(caixa × (1 − reserva%), caixa × max_item%)
  (se caixa ≤ 0: "Caixa zerado: venda a moto antes de comprar")

custo_item  = compra (zero se tipo = capital) + soma dos gastos
lucro_item  = venda − custo_item          (só quando vendido)
caixa_livre = saldo_inicial + vendas − compras de revenda − todos os gastos
empatado    = soma de custo_item dos não vendidos
giro        = média de dias entre compra e venda (só revenda)
margem_média = lucro realizado ÷ vendas de revenda
```

Padrões iniciais: margem 30%, lucro mínimo R$ 80, pechincha 10%, taxa 0%, R$ 0,30/km, reserva 20%, máximo 30% do caixa num item, saldo inicial R$ 0.

**Tipo "capital próprio"**: item que ele já tinha (a CB300R). Não tem custo de compra; os gastos (documento, transferência) saem do caixa e a venda entra no caixa, mas não conta como lucro nem entra na margem e no giro.

## 6. Dados

```
itens:      id, nome, categoria, tipo (revenda|capital), situacao (comprado|anunciado|vendido),
            compra_valor, compra_data, compra_local, preco_alvo, venda_valor, venda_data,
            nota, criado_em, atualizado_em
gastos:     id, item_id, descricao, valor, data
fotos:      id, item_id, url, ordem
anuncios:   id, item_id, titulo, descricao, preco, categoria, cidade, estado_conservacao,
            aceita_troca, entrega
publicacoes: id, anuncio_id, canal (olx|facebook|whatsapp|outro), situacao, id_externo,
            link, publicado_em, renovar_em
precos:     id, anuncio_id, preco, data            (histórico)
contatos:   id, item_id, canal, nome, oferta, situacao (novo|negociando|agendado|perdido|comprou),
            proximo_passo, retorno_em
mensagens:  id, contato_id, direcao (entrada|saida), texto, enviada_em, id_externo
regras:     uma linha com os campos da seção 4.6
integracoes: canal, access_token (criptografado), refresh_token, expira_em, escopos
```

Item inicial para cadastrar: **Honda CB300R**, tipo capital, situação comprado, nota "Documento atrasado e transferência pendente". Preço de anúncio vem da avaliação de mercado.

Importar os dados que já estiverem no Caderno de Revenda (https://claude.ai/artifact/WMSvBpPsYW1XxSEWZ9gnSt) quando a Fase 1 estiver pronta: o Joenilson pede ao Claude do projeto um JSON dos itens.

## 7. Fases

Construir e testar uma fase de cada vez.

**Fase 1: base** (sem integração)
Login do dono, Calcular, Estoque, Gastos, Vendi, Caixa e giro, Regras, fotos dos itens, PWA. Funciona bem no celular e no computador.
Pronto quando: ele consegue simular uma compra, registrar, lançar gasto, marcar vendido e ver o lucro e o caixa certos.

**Fase 2: anúncios e Facebook assistido**
Tela de anúncios, gerador de texto, fotos ordenadas, botões de copiar, link do anúncio por canal, lembrete de renovar, histórico de preço, registro manual de interessados e respostas prontas.
Pronto quando: ele publica a CB300R no Marketplace usando só os botões de copiar e o link fica salvo no item.

**Fase 3: OLX conectada** (depende do cadastro de integrador aprovado pela OLX)
Login OAuth com a OLX, publicar, atualizar e remover anúncio, ler situação e lista de anúncios publicados. Tokens guardados criptografados no servidor, nunca no navegador.
Pronto quando: um anúncio criado na ferramenta aparece na OLX e a situação volta para a ferramenta.

**Fase 4: conversas da OLX** (depende do escopo `chat` liberado)
Mensagens da OLX entram na caixa única ligadas ao item, e ele responde por ali.

## 8. Cuidados

- Nunca automatizar o Facebook (sem robô, extensão de clique, scraping ou login guardado).
- Nunca guardar senhas de marketplace.
- Nenhuma ação de dinheiro ou publicação sem o dono tocar no botão.
- Backup: botão para exportar tudo em JSON e CSV.
- Testes automáticos para as fórmulas da seção 5.
