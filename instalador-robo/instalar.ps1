# Instala ou atualiza a extensão Robô da Revenda neste computador (Chrome e/ou Edge), sem precisar de administrador.
# Roda pelo Instalar.bat, de dentro da pasta extraída do .zip gerado por gerar-instalador.ps1.
# O único passo que o navegador não deixa automatizar é o clique em "Carregar sem compactação" (1ª vez): o instalador
# abre a página, deixa o caminho copiado e vigia o perfil do navegador até a extensão aparecer, e então avisa.
# Parâmetros opcionais (o Instalar.bat não passa nenhum): -Navegador chrome|edge|ambos pula a pergunta; -SemJanela não
# mostra o aviso final do Windows (para rodar sem ninguém olhando).
# -UmClique (o Instalar-Robo-Revenda.exe passa): na 1ª instalação com Chrome e Edge, não pergunta: vai no que estiver aberto.
# -Saida (o .exe passa): sem janelas próprias; manda ao .exe, pela saída padrão, linhas "##STATUS texto",
# "##MANUAL texto" (passos para fazer na mão) e "##FIM ok|erro|texto" (\n = quebra de linha). A janela é do .exe.
param([ValidateSet('', 'chrome', 'edge', 'ambos')][string]$Navegador = '', [switch]$SemJanela, [switch]$UmClique, [switch]$Saida)
$ErrorActionPreference = 'Stop'
if ($Saida) { try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding $false } catch { } }
else { $Host.UI.RawUI.WindowTitle = 'Instalador Robô da Revenda' }
Add-Type -AssemblyName System.Windows.Forms

function ParaExe($tipo, $t) { [Console]::Out.WriteLine("##$tipo " + ($t -replace "`r?`n", '\n')); [Console]::Out.Flush() }
function Titulo($t) { if ($Saida) { ParaExe 'STATUS' $t }; Write-Host ''; Write-Host "  $t" -ForegroundColor Cyan; Write-Host '' }
function Passo($n, $t) { Write-Host "   $n. " -NoNewline -ForegroundColor Yellow; Write-Host $t }
function Avisar($t, $erro) {
  # $erro: $false = deu certo, 'aviso' = deu certo em parte, $true = não deu
  if ($Saida) { ParaExe 'FIM' ($(if ($erro -eq 'aviso') { 'aviso|' } elseif ($erro) { 'erro|' } else { 'ok|' }) + $t); return }
  if ($SemJanela) { return }
  $icone = if ($erro) { 'Warning' } else { 'Information' }
  # dono invisível "sempre na frente": o aviso não fica escondido atrás do Chrome
  $dono = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }
  [System.Windows.Forms.MessageBox]::Show($dono, $t, 'Robô da Revenda', 'OK', $icone) | Out-Null
  $dono.Dispose()
}

# --- Robô: faz os cliques da página de Extensões pelo UI Automation do Windows (acha os botões pelo nome, como um
# leitor de tela; não usa posição do mouse). Selenium/Playwright não servem: o Chrome 136+ não deixa controlar o perfil
# normal, e é nele (onde o Facebook está logado) que a extensão tem que entrar. Devolve 'ok' ou o passo que falhou.
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
$Escopo = [System.Windows.Automation.TreeScope]

# Repete $achar até devolver algo ou acabar o tempo (a página e a acessibilidade do navegador demoram a aparecer).
function Esperar([scriptblock]$achar, [int]$segundos) {
  $fim = (Get-Date).AddSeconds($segundos)
  do {
    try { $r = & $achar; if ($r) { return $r } } catch { }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $fim)
  return $null
}

function JanelasDe($classe) {
  $AE::RootElement.FindAll($Escopo::Children, (New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, $classe)))
}

# Primeiro elemento dentro de $raiz cujo nome casa com $regex e que aceita o padrão (clicar, ligar/desligar...).
function AcharControle($raiz, $regex, $padrao) {
  foreach ($e in $raiz.FindAll($Escopo::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
    if ($e.Current.Name -match $regex) {
      $p = $null
      if ($e.TryGetCurrentPattern($padrao, [ref]$p)) { return , $p }
    }
  }
  return $null
}

Add-Type -Namespace RoboRevenda -Name Win -MemberDefinition @'
[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, string l);
[DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, int m, IntPtr w, IntPtr l);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint de, uint para, bool ligar);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
// O Windows só deixa trazer janela para a frente quem está em primeiro plano: "emprega" a fila de entrada de quem está.
public static bool Trazer(IntPtr h) {
  if (IsIconic(h)) ShowWindow(h, 9);
  IntPtr frente = GetForegroundWindow();
  uint eu = GetCurrentThreadId();
  uint dele = frente == IntPtr.Zero ? 0 : GetWindowThreadProcessId(frente, IntPtr.Zero);
  bool ligou = dele != 0 && dele != eu && AttachThreadInput(eu, dele, true);
  try { BringWindowToTop(h); return SetForegroundWindow(h); }
  finally { if (ligou) AttachThreadInput(eu, dele, false); }
}
[DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int data, int extra);
'@

# Handle do Windows do controle com esse id e classe dentro de $raiz (ou $null). A classe evita confundir o botão
# "Selecionar pasta" (id 1) com o 1º arquivo da lista, que também tem id 1.
function PorHandle($raiz, $id, $classe) {
  $cond = New-Object System.Windows.Automation.AndCondition(
    (New-Object System.Windows.Automation.PropertyCondition($AE::AutomationIdProperty, $id)),
    (New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, $classe)))
  $e = $raiz.FindFirst($Escopo::Descendants, $cond)
  if (-not $e -or -not $e.Current.NativeWindowHandle) { return $null }
  return [IntPtr]$e.Current.NativeWindowHandle
}

# Digitar na barra de endereço com SendKeys sai embaralhado em alguns PCs (letras trocadas): cola o endereço e dá Enter.
# Janela do navegador a usar: a da frente se for dele; senão uma visível; senão uma minimizada (é restaurada). O nome termina
# com "Google Chrome" / "Edge": ignora as janelas escondidas do Chrome, que também têm "Chrome" no nome.
function EscolherJanela($n) {
  $terminaCom = if ($n.Marca -eq 'Edge') { 'Edge$' } else { 'Google Chrome$' }
  $j = Esperar {
    $h = [RoboRevenda.Win]::GetForegroundWindow()
    # janela com barra de endereço (a tela de "escolher perfil" é uma janela do Chrome sem ela: não serve)
    $condBarra = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
    $todas = @(JanelasDe 'Chrome_WidgetWin_1' | Where-Object {
      $_.Current.Name -match $terminaCom -and $_.Current.NativeWindowHandle -and
      @($_.FindAll($Escopo::Descendants, $condBarra) | Where-Object { $_.Current.Name -match 'endere|address' }).Count -gt 0 })
    $vis = @($todas | Where-Object { -not $_.Current.IsOffscreen -and $_.Current.BoundingRectangle.Width -gt 300 })
    $frente = $vis | Where-Object { [IntPtr]$_.Current.NativeWindowHandle -eq $h } | Select-Object -First 1
    if ($frente) { $frente } elseif ($vis.Count) { $vis[0] } elseif ($todas.Count) { $todas[0] }
  } 40
  if ($j -and [RoboRevenda.Win]::IsIconic([IntPtr]$j.Current.NativeWindowHandle)) {
    [void][RoboRevenda.Win]::Trazer([IntPtr]$j.Current.NativeWindowHandle)
    Start-Sleep -Milliseconds 1000
  }
  return $j
}

# Só manda teclas se a janela do navegador for mesmo a da frente (senão o teclado cairia em outro programa da pessoa).
function NaFrente($janela) {
  if (-not $janela -or -not $janela.Current.NativeWindowHandle) { return $false }
  $h = [IntPtr]$janela.Current.NativeWindowHandle
  for ($t = 0; $t -lt 6; $t++) {
    if ([RoboRevenda.Win]::GetForegroundWindow() -eq $h) { return $true }
    try { [void][RoboRevenda.Win]::Trazer($h) } catch { }
    Start-Sleep -Milliseconds 400
  }
  return ([RoboRevenda.Win]::GetForegroundWindow() -eq $h)
}

# Abre uma aba NOVA do navegador (não mexe na aba que a pessoa está usando) e vai para $endereco. Devolve $null se deu
# certo, ou o motivo. Caminho principal: pelo UI Automation (botão "Nova guia", valor da barra de endereço) e Enter enviado
# direto à janela do navegador: não depende de qual janela está na frente e não pode cair em outro programa. Plano B:
# teclado (Ctrl+T, Ctrl+L, Ctrl+V), só com a janela do navegador mesmo na frente.
function IrPara($janela, $endereco) {
  $ehNova = { $janela.Current.Name -match 'Nova guia|Novo separador|New tab|Extens' }
  $tipoBotao = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
  $tipoEdit = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)

  # 1) aba nova
  if (-not (& $ehNova)) {
    $botao = $janela.FindAll($Escopo::Descendants, $tipoBotao) | Where-Object { $_.Current.Name -match '^(Nova guia|Novo separador|New tab)' } | Select-Object -First 1
    $p = $null
    if ($botao -and $botao.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { try { $p.Invoke() } catch { } }
    if (-not (Esperar { if (& $ehNova) { $true } } 4)) {
      if (-not (NaFrente $janela)) { return "não consegui abrir uma aba nova (janela: $($janela.Current.Name))" }
      [System.Windows.Forms.SendKeys]::SendWait('^t')
      if (-not (Esperar { if (& $ehNova) { $true } } 4)) { return "não consegui abrir uma aba nova (janela: $($janela.Current.Name))" }
    }
  }

  # 2) endereço na barra
  $barra = Esperar { $janela.FindAll($Escopo::Descendants, $tipoEdit) | Where-Object { $_.Current.Name -match 'endere|address' } | Select-Object -First 1 } 10
  if (-not $barra) { return 'não achei a barra de endereço' }
  $valor = $null
  if ($barra.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valor)) {
    try { $barra.SetFocus() } catch { }
    $valor.SetValue($endereco)
    Start-Sleep -Milliseconds 400
    if ($valor.Current.Value -eq $endereco) {
      # Enter direto na janela do navegador (VK_RETURN); se a aba não sair de "Nova guia", tenta de novo e depois pelo teclado
      $h = [IntPtr]$janela.Current.NativeWindowHandle
      $navegou = { Esperar { if ($janela.Current.Name -notmatch 'Nova guia|Novo separador|New tab') { $true } } 3 }
      [void][RoboRevenda.Win]::PostMessage($h, 0x0100, [IntPtr]13, [IntPtr]0x001C0001)
      Start-Sleep -Milliseconds 80
      [void][RoboRevenda.Win]::PostMessage($h, 0x0101, [IntPtr]13, [IntPtr]0xC01C0001)
      if (& $navegou) { return $null }
      # o campo pode ter perdido o valor ou o foco: põe de novo, foca e manda Enter outra vez
      try { $barra.SetFocus() } catch { }
      $valor.SetValue($endereco)
      Start-Sleep -Milliseconds 300
      [void][RoboRevenda.Win]::PostMessage($h, 0x0100, [IntPtr]13, [IntPtr]0x001C0001)
      Start-Sleep -Milliseconds 80
      [void][RoboRevenda.Win]::PostMessage($h, 0x0101, [IntPtr]13, [IntPtr]0xC01C0001)
      if (& $navegou) { return $null }
      # último recurso: Enter pelo teclado, só com a janela do navegador na frente
      if (NaFrente $janela) {
        try { $barra.SetFocus() } catch { }
        [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
        if (& $navegou) { return $null }
      }
      Registrar @("IrPara: Enter não navegou. Janela: $($janela.Current.Name) | barra: $($valor.Current.Value) | na frente: $([RoboRevenda.Win]::GetForegroundWindow() -eq [IntPtr]$janela.Current.NativeWindowHandle)")
      return "escrevi o endereço mas o navegador não abriu a página (janela: $($janela.Current.Name))"
    }
  }
  # plano B: colar com o teclado
  if (-not (NaFrente $janela)) { return 'não consegui escrever na barra de endereço e o navegador não veio para a frente (não digitei nada)' }
  [System.Windows.Forms.SendKeys]::SendWait('^l')
  Start-Sleep -Milliseconds 300
  Set-Clipboard -Value $endereco
  if (-not (NaFrente $janela)) { return 'o navegador saiu da frente (não digitei mais nada)' }
  [System.Windows.Forms.SendKeys]::SendWait('^v')
  Start-Sleep -Milliseconds 400
  if (-not (NaFrente $janela)) { return 'o navegador saiu da frente (não digitei mais nada)' }
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  return $null
}

function Registrar($linhas) {
  try {
    $f = Join-Path $env:LOCALAPPDATA 'Robo-Revenda\instalador.log'
    Add-Content -Path $f -Value (@("{0} o robô viu na página:" -f (Get-Date -Format 's')) + @($linhas)) -Encoding UTF8
  } catch { }
}

# Pasta do perfil que a pessoa usou por último neste navegador ("Default", "Profile 1"...), ou $null.
function PerfilEmUso($n) {
  try {
    $f = Join-Path (Join-Path $env:LOCALAPPDATA $n.Dados) 'Local State'
    if (-not (Test-Path $f)) { return $null }
    $js = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $js.MaxJsonLength = [int]::MaxValue
    $config = $js.DeserializeObject([IO.File]::ReadAllText($f))
    $p = "$($config['profile']['last_used'])"
    if ($p -and (Test-Path (Join-Path (Join-Path $env:LOCALAPPDATA $n.Dados) $p))) { return $p }
  } catch { }
  return $null
}

function CarregarPeloRobo($n, $pasta) {
  try {
    # o navegador recém-aberto ignora o chrome://extensions da linha de comando (abre "Nova guia"): digita na barra
    $janela = EscolherJanela $n
    if (-not $janela) { return "o $($n.Nome) não abriu" }
    try { $janela.SetFocus() } catch { }
    if ($janela.Current.Name -notmatch 'Extens') {
      $motivo = IrPara $janela $n.Pagina
      if ($motivo) { return $motivo }
      # a janela passa a ter a aba de Extensões na frente: pega a janela do navegador que está na frente de novo
      if (-not (Esperar { if ($janela.Current.Name -match 'Extens') { $true } } 15)) { return "a página de Extensões não abriu (janela: $($janela.Current.Name))" }
    }

    $regexCarregar = 'sem compacta|sem pacote|descompactad|descomprimid|expandid|comprimid|comprimir|load unpacked'
    $padraoInvoke = [System.Windows.Automation.InvokePattern]::Pattern
    # Se o Modo do desenvolvedor já está ligado, o botão "Carregar sem compactação" já existe: não mexe na chave.
    $carregar = Esperar { AcharControle $janela $regexCarregar $padraoInvoke } 4
    if (-not $carregar) {
      $chave = Esperar { AcharControle $janela 'desenvolvedor|programador|developer mode' ([System.Windows.Automation.TogglePattern]::Pattern) } 20
      if ($chave) {
        if ($chave.Current.ToggleState -ne [System.Windows.Automation.ToggleState]::On) { $chave.Toggle() }
      } else {
        # a chave existe mas não aceita "ligar/desligar" pelo UI Automation: clica nela com o mouse
        $el = Esperar { $janela.FindAll($Escopo::Descendants, [System.Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -match 'desenvolvedor|programador|developer mode' -and -not $_.Current.IsOffscreen -and $_.Current.BoundingRectangle.Width -gt 0 } | Select-Object -First 1 } 5
        if (-not $el) {
          Registrar (@("janela escolhida: $($janela.Current.Name)") + @(JanelasDe 'Chrome_WidgetWin_1' | ForEach-Object { "janela: $($_.Current.Name) | fora da tela: $($_.Current.IsOffscreen)" }) + @($janela.FindAll($Escopo::Descendants, [System.Windows.Automation.Condition]::TrueCondition) | Select-Object -First 80 | ForEach-Object { "$($_.Current.ControlType.ProgrammaticName):$($_.Current.Name)" }))
          return 'não achei a chave "Modo do desenvolvedor"'
        }
        $r = $el.Current.BoundingRectangle
        [RoboRevenda.Win]::SetCursorPos([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)) | Out-Null
        Start-Sleep -Milliseconds 200
        [RoboRevenda.Win]::mouse_event(2, 0, 0, 0, 0); [RoboRevenda.Win]::mouse_event(4, 0, 0, 0, 0)  # botão esquerdo: apertar e soltar
      }
      $carregar = Esperar { AcharControle $janela $regexCarregar $padraoInvoke } 15
    }
    if (-not $carregar) { return 'não achei o botão "Carregar sem compactação"' }
    $carregar.Invoke()

    # janela de escolher pasta do Windows (fica dentro da janela do navegador): campo "Pasta" (id 1152) e botão
    # "Selecionar pasta" (id 1). Ali o UI Automation acha os controles mas não age neles, então vai por mensagem do Windows.
    # Pega a janela e os dois controles de uma vez (a janela muda rápido: buscar de novo depois devolvia vazio).
    $script:hCampo = $null; $script:hBotao = $null
    $dialogo = Esperar {
      foreach ($j in @(JanelasDe 'Chrome_WidgetWin_1') + @($AE::RootElement)) {
        $d = $j.FindFirst($Escopo::Children, (New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, '#32770')))
        if ($d) {
          $c = PorHandle $d '1152' 'Edit'; $b = PorHandle $d '1' 'Button'
          if ($c -and $b) { $script:hCampo = $c; $script:hBotao = $b; return $d }
        }
      }
    } 15
    if (-not $dialogo) { return 'a janela de escolher pasta não abriu' }
    if (-not $script:hCampo -or -not $script:hBotao) { return 'a janela de escolher pasta mudou antes de eu usar (campo/botão sumiram)' }
    $enviou = $false
    try {
      [void][RoboRevenda.Win]::SendMessage($script:hCampo, 0x000C, [IntPtr]::Zero, $pasta)  # WM_SETTEXT
      Start-Sleep -Milliseconds 300
      [void][RoboRevenda.Win]::SendMessage($script:hBotao, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)  # BM_CLICK
      $enviou = $true
    } catch {
      Registrar @("janela de pastas: mensagem do Windows falhou: $($_.Exception.Message)")
    }
    if (-not $enviou) {
      # plano B pelo teclado, só se a janela de pastas for mesmo a da frente: o campo "Pasta" já vem com o foco
      $hd = [IntPtr]$dialogo.Current.NativeWindowHandle
      if (-not $hd -or $hd -eq [IntPtr]::Zero) { return 'a janela de escolher pasta sumiu' }
      for ($t = 0; $t -lt 6 -and [RoboRevenda.Win]::GetForegroundWindow() -ne $hd; $t++) { try { [void][RoboRevenda.Win]::Trazer($hd) } catch { }; Start-Sleep -Milliseconds 400 }
      if ([RoboRevenda.Win]::GetForegroundWindow() -ne $hd) { return 'a janela de escolher pasta não veio para a frente (não digitei nada)' }
      Set-Clipboard -Value $pasta
      [System.Windows.Forms.SendKeys]::SendWait('^v')
      Start-Sleep -Milliseconds 400
      if ([RoboRevenda.Win]::GetForegroundWindow() -ne $hd) { return 'a janela de escolher pasta mudou (não digitei mais nada)' }
      [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    }
    return 'ok'
  } catch {
    Registrar @("ERRO em CarregarPeloRobo: $($_.Exception.Message)", "linha $($_.InvocationInfo.ScriptLineNumber): $($_.InvocationInfo.Line.Trim())", "$($_.ScriptStackTrace)")
    return "$($_.Exception.Message) [linha $($_.InvocationInfo.ScriptLineNumber)]"
  }
}

# Id da extensão carregada da pasta $pasta neste navegador (está nas preferências do perfil), ou $null.
Add-Type -AssemblyName System.Web.Extensions
function IdDaExtensao($n, $pasta) {
  $js = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  $js.MaxJsonLength = [int]::MaxValue
  foreach ($perfil in Get-ChildItem (Join-Path $env:LOCALAPPDATA $n.Dados) -Directory) {
    foreach ($arq in 'Secure Preferences', 'Preferences') {
      $f = Join-Path $perfil.FullName $arq
      if (-not (Test-Path $f)) { continue }
      try {
        $config = $js.DeserializeObject([IO.File]::ReadAllText($f))
        foreach ($ext in $config['extensions']['settings'].GetEnumerator()) {
          if ("$($ext.Value['path'])" -eq $pasta) { return $ext.Key }
        }
      } catch { }
    }
  }
  return $null
}

# Atualização com o navegador aberto: numa aba nova, abre a página recarregar.html da própria extensão, que chama
# chrome.runtime.reload() (lê de novo os arquivos novos) e some ao recarregar. Não usa botão da página de Extensões:
# no Edge não existe o "Atualizar" do Chrome, e um botão com esse nome lá é o de recarregar a página.
# Devolve 'ok', 'fechado' (navegador não está aberto: a versão nova vale quando abrir) ou o passo que falhou.
function RecarregarPeloRobo($n, $pasta) {
  try {
    if (-not (Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($n.Exe)) -ErrorAction SilentlyContinue)) { return 'fechado' }
    $id = IdDaExtensao $n $pasta
    if (-not $id) { return 'não achei a extensão nas preferências do navegador' }
    $janela = EscolherJanela $n
    if (-not $janela) { return 'não achei a janela do navegador' }
    $motivo = IrPara $janela "$($n.Esquema)://$id/recarregar.html"
    if ($motivo) { return $motivo }
    # a página carregou (título "Robô da Revenda - atualizando") = o recarregar foi pedido
    # (a página some em 0,3 s: confere a cada 0,1 s; vale o título "atualizando" ou a aba ter saído de "Nova guia")
    $fimEspera = (Get-Date).AddSeconds(10); $abriu = $false
    while ((Get-Date) -lt $fimEspera) {
      $nome = $janela.Current.Name
      if ($nome -match 'atualizando|recarregar' -or $nome -notmatch 'Nova guia|Novo separador|New tab') { $abriu = $true; break }
      Start-Sleep -Milliseconds 100
    }
    if (-not $abriu) { return "a página de atualizar não abriu (janela: $($janela.Current.Name))" }
    # ao recarregar, o navegador fecha a aba; se ela ficar, fecha só se for mesmo ela a da frente (Ctrl+W noutra fecharia outra aba)
    if (-not (Esperar { if ($janela.Current.Name -notmatch 'atualizando') { $true } } 8)) {
      if ([RoboRevenda.Win]::GetForegroundWindow() -eq [IntPtr]$janela.Current.NativeWindowHandle -and $janela.Current.Name -match 'atualizando') {
        [System.Windows.Forms.SendKeys]::SendWait('^w')
      }
    }
    return 'ok'
  } catch {
    Registrar @("ERRO em RecarregarPeloRobo: $($_.Exception.Message)", "linha $($_.InvocationInfo.ScriptLineNumber): $($_.InvocationInfo.Line.Trim())", "$($_.ScriptStackTrace)")
    return "$($_.Exception.Message) [linha $($_.InvocationInfo.ScriptLineNumber)]"
  }
}

try {
  $origem =Join-Path $PSScriptRoot 'extensao'
  if (-not (Test-Path (Join-Path $origem 'manifest.json'))) {
    throw 'Falta a pasta "extensao" ao lado do instalador. Extraia o .zip inteiro (botão direito > Extrair tudo) e rode o Instalar.bat de dentro da pasta extraída.'
  }

  # Pasta fixa: o navegador identifica a extensão sem compactação pelo caminho, então ela tem que ser sempre a mesma
  # (mudar de pasta = extensão nova).
  $destino = Join-Path $env:LOCALAPPDATA 'Robo-Revenda\extensao'
  Titulo 'Copiando a extensão...'
  New-Item -ItemType Directory -Force $destino | Out-Null
  robocopy $origem $destino /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Não consegui copiar os arquivos para $destino (robocopy $LASTEXITCODE)." }
  $versao = (Get-Content (Join-Path $destino 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version

  function Achar($relativo) {
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
      if ($base) { $p = Join-Path $base $relativo; if (Test-Path $p) { return $p } }
    }
    return $null
  }
  $navegadores = @()
  $chrome = Achar 'Google\Chrome\Application\chrome.exe'
  $edge = Achar 'Microsoft\Edge\Application\msedge.exe'
  if ($chrome) { $navegadores += [pscustomobject]@{ Nome = 'Google Chrome'; Marca = 'Chrome'; Exe = $chrome; Pagina = 'chrome://extensions'; Esquema = 'chrome-extension'; Dados = 'Google\Chrome\User Data' } }
  if ($edge) { $navegadores += [pscustomobject]@{ Nome = 'Microsoft Edge'; Marca = 'Edge'; Exe = $edge; Pagina = 'edge://extensions'; Esquema = 'extension'; Dados = 'Microsoft\Edge\User Data' } }
  if (-not $navegadores.Count) { throw 'Não achei o Google Chrome nem o Microsoft Edge neste computador.' }

  # A extensão já foi carregada desta pasta em algum perfil do navegador? (o caminho fica gravado nas preferências)
  $caminhoJson = $destino.Replace('\', '\\')
  function Carregada($n) {
    $dados = Join-Path $env:LOCALAPPDATA $n.Dados
    if (-not (Test-Path $dados)) { return $false }
    foreach ($perfil in Get-ChildItem $dados -Directory) {
      foreach ($arq in 'Secure Preferences', 'Preferences') {
        $f = Join-Path $perfil.FullName $arq
        if ((Test-Path $f) -and (Select-String -Path $f -SimpleMatch $caminhoJson -Quiet)) { return $true }
      }
    }
    return $false
  }

  # Cópia antiga carregada de OUTRA pasta (ex.: instalada à mão): acha pelo nome no manifest e atualiza por cima dela.
  Add-Type -AssemblyName System.Web.Extensions
  function PastaAntiga($n) {
    $js = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $js.MaxJsonLength = [int]::MaxValue
    $dados = Join-Path $env:LOCALAPPDATA $n.Dados
    if (-not (Test-Path $dados)) { return $null }
    foreach ($perfil in Get-ChildItem $dados -Directory) {
      foreach ($arq in 'Secure Preferences', 'Preferences') {
        $f = Join-Path $perfil.FullName $arq
        if (-not (Test-Path $f)) { continue }
        try {
          $config = $js.DeserializeObject([IO.File]::ReadAllText($f))
          foreach ($ext in $config['extensions']['settings'].GetEnumerator()) {
            $caminho = "$($ext.Value['path'])"
            if (-not $caminho -or $caminho -eq $destino -or -not (Test-Path (Join-Path $caminho 'manifest.json'))) { continue }
            $nome = (Get-Content (Join-Path $caminho 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).name
            if ($nome -like 'Robô da Revenda*') { return $caminho }
          }
        } catch { }
      }
    }
    return $null
  }
  $pastaDe = @{}
  foreach ($n in $navegadores) {
    if (Carregada $n) { $pastaDe[$n.Marca] = $destino; continue }
    $antiga = PastaAntiga $n
    if ($antiga) {
      Titulo "Atualizando o Robô da Revenda que já estava no $($n.Nome)..."
      robocopy $origem $antiga /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
      if ($LASTEXITCODE -lt 8) { $pastaDe[$n.Marca] = $antiga }
    }
  }

  # Já instalada: os arquivos novos já foram copiados, é só avisar. Com -Navegador, instala nos escolhidos que não têm.
  $jaTem = @($navegadores | Where-Object { $pastaDe.ContainsKey($_.Marca) })
  $escolhidos = $navegadores
  if ($Navegador -eq 'chrome' -or $Navegador -eq 'edge') {
    $escolhidos = @($navegadores | Where-Object { $_.Marca -eq $Navegador })
    if (-not $escolhidos.Count) { throw "O $Navegador não está instalado neste computador." }
  }
  $marcasJaTem = @($jaTem | ForEach-Object { $_.Marca })
  if ($jaTem.Count) {
    if ($Navegador) { $escolhidos = @($escolhidos | Where-Object { $marcasJaTem -notcontains $_.Marca }) } else { $escolhidos = @() }
  }
  if ($jaTem.Count -and -not $escolhidos.Count) {
    $onde = ($jaTem | ForEach-Object { $_.Nome }) -join ' e '
    Titulo "Recarregando o Robô da Revenda $versao ($onde): não mexa no navegador..."
    $falhas = @()
    foreach ($n in $jaTem) {
      $r = RecarregarPeloRobo $n $pastaDe[$n.Marca]
      if ($r -ne 'ok' -and $r -ne 'fechado') { $falhas += "$($n.Nome): $r" }
    }
    if ($falhas.Count) {
      Write-Host "  O robô não conseguiu recarregar ($($falhas -join '; '))." -ForegroundColor Yellow
      if ($Saida) { Avisar "Quase pronto`nFeche e abra o navegador para usar a versão nova." 'aviso' }
      else { Avisar "Robô da Revenda $versao copiado, mas não consegui recarregar sozinho.`n`nFeche e abra o navegador para usar a versão nova." $true }
    } else {
      Titulo "Robô da Revenda atualizado para a versão $versao ($onde)."
      Avisar "Robô da Revenda instalado com sucesso!`nVersão $versao. Já pode usar." $false
    }
    exit 0
  }

  if ($UmClique -and -not $Navegador -and $navegadores.Count -gt 1) {
    # o que estiver aberto (a pessoa usa esse); os dois ou nenhum aberto: o Chrome, que vem primeiro na lista
    $abertos = @($navegadores | Where-Object { Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($_.Exe)) -ErrorAction SilentlyContinue })
    $escolhidos = if ($abertos.Count -eq 1) { $abertos } else { @($navegadores[0]) }
  } elseif (-not $Navegador -and $navegadores.Count -gt 1) {
    Titulo 'Em qual navegador instalar?'
    Passo 1 'Google Chrome'
    Passo 2 'Microsoft Edge'
    Passo 3 'Nos dois'
    Write-Host ''
    $r = Read-Host '  Digite 1, 2 ou 3 e aperte Enter (só Enter = Chrome)'
    if ($r -eq '2') { $escolhidos = @($navegadores[1]) }
    elseif ($r -ne '3') { $escolhidos = @($navegadores[0]) }
  }

  $prontos = @()
  foreach ($n in $escolhidos) {
    Set-Clipboard -Value $destino
    # Sem o perfil na linha de comando, o navegador fechado mostra a tela "quem está usando?" e o robô não tem como escolher.
    $perfil = PerfilEmUso $n
    $argumentos = @(); if ($perfil) { $argumentos += "--profile-directory=`"$perfil`"" }; $argumentos += $n.Pagina
    Start-Process -FilePath $n.Exe -ArgumentList $argumentos
    Titulo "Instalando no $($n.Nome): fazendo os cliques sozinho, não mexa no navegador..."
    $robo = CarregarPeloRobo $n $destino
    Set-Clipboard -Value $destino  # o robô usou a área de transferência; o caminho volta para ela (caso precise colar à mão)
    try { Add-Content -Path (Join-Path $env:LOCALAPPDATA 'Robo-Revenda\instalador.log') -Value ("{0} {1}: robô = {2}" -f (Get-Date -Format 's'), $n.Nome, $robo) -Encoding UTF8 } catch { }
    if ($robo -eq 'ok') {
      Write-Host '  Cliques feitos.' -ForegroundColor Green
    } else {
      Write-Host "  O robô não conseguiu ($robo). Faça você, na página de Extensões que abriu:" -ForegroundColor Yellow
      Write-Host ''
      Passo 1 'Ligue o "Modo do desenvolvedor" (chave no canto superior direito; no Edge fica no menu à esquerda).'
      Passo 2 'Clique em "Carregar sem compactação" (no Edge: "Carregar sem pacote").'
      Passo 3 'Na janela de pastas, clique na barra de endereço lá em cima, aperte Ctrl+V e Enter.'
      Passo 4 'Clique em "Selecionar pasta".'
      Write-Host ''
      Write-Host "   O caminho já está copiado: $destino" -ForegroundColor DarkGray
      if ($Saida) {
        ParaExe 'MANUAL' ("O robô parou em: $robo`nNa página de Extensões que abriu (o caminho já está copiado):`n1. Ligue o Modo do desenvolvedor.`n2. Clique em Carregar sem compactação (no Edge: Carregar sem pacote; em português de Portugal: Carregar expandida).`n" +
          "3. Na janela de pastas, clique na barra de endereço, aperte Ctrl+V e Enter.`n4. Clique em Selecionar pasta.`nQuando a extensão aparecer, este aviso muda sozinho.")
      }
    }
    Titulo 'Esperando a extensão aparecer no navegador...'
    Write-Host ''
    Write-Host '  Esperando a extensão aparecer no navegador' -NoNewline
    $limite = (Get-Date).AddMinutes(10)
    $ok = $false
    while ((Get-Date) -lt $limite) {
      Start-Sleep -Seconds 2
      Write-Host '.' -NoNewline
      if (Carregada $n) { $ok = $true; break }
    }
    Write-Host ''
    if ($ok) {
      Write-Host "  Instalada no $($n.Nome)." -ForegroundColor Green
      $prontos += $n.Nome
    } else {
      Write-Host "  Não vi a extensão no $($n.Nome) em 10 minutos. Abra o instalador de novo para tentar." -ForegroundColor Red
    }
  }

  if ($prontos.Count) {
    $onde = $prontos -join ' e '
    Titulo "Pronto: Robô da Revenda $versao instalado no $onde."
    Avisar "Robô da Revenda instalado com sucesso!`nRecarregue o sistema da Revenda (F5) e use o botão “Publicar com o robô”." $false
  } else {
    Avisar "Não foi instalado`nAbra o instalador de novo para tentar." $true
    exit 1
  }
} catch {
  Write-Host ''
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
  Avisar "Não deu para instalar`n$($_.Exception.Message)" $true
  exit 1
}
