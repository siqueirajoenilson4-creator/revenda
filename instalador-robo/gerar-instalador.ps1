# Gera public\Instalar-Robo-Revenda.exe (baixado pelo botão do sistema): arquivo único. Abriu,
# já instala ou atualiza, com um cartão pequeno no canto da tela e o aviso final com OK (Instalador.cs).
# O .zip (a extensão, só o que ela usa, + Instalar.bat e instalar.ps1) é montado numa pasta temporária e vai dentro do
# .exe; não fica no dist, para não confundir. Compila com o csc do .NET Framework 4, que já vem no Windows.
# Uso: powershell -ExecutionPolicy Bypass -File instalador\gerar-instalador.ps1
$ErrorActionPreference = 'Stop'
$projeto = Split-Path $PSScriptRoot -Parent
$raiz = Join-Path $projeto 'extensao-robo'
$versao = (Get-Content (Join-Path $raiz 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$dist = Join-Path $projeto 'public'
$temp = Join-Path $env:TEMP ('gerar-Robo-Revenda-' + [guid]::NewGuid())
$pasta = Join-Path $temp "Robo-Revenda-v$versao"
$zip = Join-Path $temp 'pacote.zip'
$ext = Join-Path $pasta 'extensao'
New-Item -ItemType Directory -Force $ext, $dist | Out-Null

try {
  foreach ($item in 'manifest.json', 'background.js', 'revenda.js', 'facebook.js', 'recarregar.html', 'recarregar.js', 'icons') {
    Copy-Item -Recurse (Join-Path $raiz $item) $ext
  }
  Copy-Item (Join-Path $PSScriptRoot 'Instalar.bat'), (Join-Path $PSScriptRoot 'instalar.ps1') $pasta

  # Caminhos dentro do zip com '/', que qualquer descompactador entende (o PowerShell 5.1 sozinho grava com '\')
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  $arquivo = [IO.Compression.ZipFile]::Open($zip, 'Create')
  try {
    foreach ($f in Get-ChildItem $pasta -Recurse -File) {
      $nome = $f.FullName.Substring($pasta.Length + 1).Replace('\', '/')
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($arquivo, $f.FullName, $nome) | Out-Null
    }
  } finally { $arquivo.Dispose() }

  # Ícone do .exe: o PNG de 128 px da extensão dentro de um .ico (o Windows aceita PNG dentro do .ico)
  $png = [IO.File]::ReadAllBytes((Join-Path $raiz 'icons\icon128.png'))
  $ico = Join-Path $temp 'icone.ico'
  $w = New-Object IO.BinaryWriter([IO.File]::Create($ico))
  try {
    $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]1)          # cabeçalho: ícone, 1 imagem
    $w.Write([byte]128); $w.Write([byte]128); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$png.Length); $w.Write([uint32]22)
    $w.Write($png)
  } finally { $w.Close() }

  # versão no "Detalhes" das propriedades do .exe
  $info = Join-Path $temp 'Versao.cs'
  Set-Content $info "[assembly: System.Reflection.AssemblyVersion(`"$versao.0`")] [assembly: System.Reflection.AssemblyFileVersion(`"$versao.0`")]" -Encoding UTF8

  $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
  $net = Split-Path $csc
  $exe = Join-Path $dist "Instalar-Robo-Revenda.exe"
  & $csc /nologo /target:winexe /optimize+ /codepage:65001 "/out:$exe" "/win32icon:$ico" "/resource:$zip,pacote.zip" `
    "/r:$net\System.IO.Compression.dll" "/r:$net\System.IO.Compression.FileSystem.dll" /r:System.Windows.Forms.dll /r:System.Drawing.dll `
    (Join-Path $PSScriptRoot 'Instalador.cs') $info
  if ($LASTEXITCODE -ne 0) { throw "O csc não compilou o Instalador.cs (código $LASTEXITCODE)." }
  Write-Host "Gerado: $exe (publique o site para o botão baixar a versão nova)"
} finally {
  Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
}
