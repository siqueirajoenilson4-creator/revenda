# Robô da Revenda (extensão do Chrome)

Publica no Facebook Marketplace os anúncios do sistema, no seu próprio Chrome, já logado no Facebook.
Não guarda senha e não manda nada para servidor de fora.

## Instalar (uma vez, no computador)

No sistema, abra um anúncio e toque em **Baixar o instalador do robô** (ou rode `public/Instalar-Robo-Revenda.exe`).
O instalador copia a extensão para `%LOCALAPPDATA%\Robo-Revenda\extensao`, abre o Chrome e faz sozinho os cliques
de "Modo do desenvolvedor" e "Carregar sem compactação". Se algum clique falhar, ele mostra o passo para fazer à mão.
Abrir o instalador de novo atualiza a extensão para a versão nova.

Para gerar o instalador depois de mudar a extensão (suba a `version` do manifest.json):
`powershell -ExecutionPolicy Bypass -File instalador-robo\gerar-instalador.ps1` e publique o site.

## Usar

1. No sistema, abra **Anúncios**, escolha o item e salve o anúncio (título, preço, categoria, estado e fotos).
2. Toque em **Publicar com o robô**.
3. O robô abre o Marketplace numa aba nova, sobe as fotos, preenche, escolhe a categoria e a condição e publica.
   O andamento aparece no canto da tela do Facebook e no sistema.
4. Depois de publicar, ele abre "Seus anúncios", pega o link e salva no sistema sozinho.

Se ele não achar algum campo, para e avisa. Termine à mão e publique: ele percebe e pega o link do mesmo jeito.
O botão **Parar o robô**, no canto da tela, para tudo na hora.

## Cuidado

Robô no Facebook vai contra os termos de uso. Para reduzir o risco ao perfil, ele só age quando você manda,
um anúncio por vez, com pausas de gente. Evite publicar muitos anúncios seguidos.
