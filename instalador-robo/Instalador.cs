// Instalar-Robo-Revenda.exe: arquivo único que vai para os outros PCs (ex.: pelo WhatsApp). Abriu, já instala ou atualiza.
// Leva dentro (recurso "pacote.zip") a extensão + instalar.ps1. Extrai numa pasta temporária, roda o instalar.ps1
// escondido (-UmClique -Saida) e mostra um cartão pequeno no canto da tela: andamento, passos manuais se o robô
// falhar e o resultado com o botão OK. O cartão não rouba o foco: o robô digita no navegador enquanto ele aparece.
// Compilado por gerar-instalador.ps1 com o csc do .NET Framework 4 (C# 5: sem $"" nem =>).
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("Robô da Revenda")]
[assembly: AssemblyProduct("Robô da Revenda")]

class Cartao : Form {
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("gdi32.dll")] static extern IntPtr CreateRoundRectRgn(int x1, int y1, int x2, int y2, int w, int h);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);

  static readonly Color Fundo = Color.White;
  static readonly Color Texto = Color.FromArgb(28, 28, 30);
  static readonly Color Suave = Color.FromArgb(110, 110, 118);
  static readonly Color Azul = Color.FromArgb(37, 99, 235);
  static readonly Color Verde = Color.FromArgb(22, 163, 74);
  static readonly Color Ambar = Color.FromArgb(217, 119, 6);
  static readonly Color Vermelho = Color.FromArgb(220, 38, 38);

  float esc;               // escala do monitor (100% = 1)
  string estado = "rodando"; // rodando | ok | aviso | erro
  float giro;              // ângulo do círculo girando
  Label titulo, detalhe;
  Button botaoOk;
  Timer animacao;
  string pastaTemp;
  bool podeAtivar;
  bool manual;             // mostrando os passos manuais: ignora ##STATUS e deixa o botão Fechar

  int S(float v) { return (int)Math.Round(v * esc); }

  [STAThread]
  static void Main() {
    try { SetProcessDPIAware(); } catch { }
    Application.EnableVisualStyles();
    Application.Run(new Cartao());
  }

  Cartao() {
    using (Graphics g = CreateGraphics()) esc = g.DpiX / 96f;
    Text = "Robô da Revenda";
    FormBorderStyle = FormBorderStyle.None;
    StartPosition = FormStartPosition.Manual;
    ShowInTaskbar = true;
    TopMost = true;
    BackColor = Fundo;
    DoubleBuffered = true;
    Font = new Font("Segoe UI", 9f);
    try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
    ClientSize = new Size(S(380), S(96));

    titulo = new Label();
    titulo.AutoSize = false;
    titulo.Font = new Font("Segoe UI Semibold", 11f);
    titulo.ForeColor = Texto;
    titulo.Text = "Instalando o Robô da Revenda…";
    Controls.Add(titulo);

    detalhe = new Label();
    detalhe.AutoSize = false;
    detalhe.ForeColor = Suave;
    detalhe.Text = "Preparando…";
    Controls.Add(detalhe);

    botaoOk = new Button();
    botaoOk.Text = "OK";
    botaoOk.FlatStyle = FlatStyle.Flat;
    botaoOk.FlatAppearance.BorderSize = 0;
    botaoOk.BackColor = Texto;
    botaoOk.ForeColor = Color.White;
    botaoOk.Font = new Font("Segoe UI Semibold", 9f);
    botaoOk.Cursor = Cursors.Hand;
    botaoOk.Visible = false;
    botaoOk.Click += delegate { Close(); };
    Controls.Add(botaoOk);
    AcceptButton = botaoOk;

    animacao = new Timer();
    animacao.Interval = 16;
    animacao.Tick += delegate { giro = (giro + 6) % 360; Invalidate(new Rectangle(0, 0, S(64), Height)); };
    animacao.Start();

    Arrumar();
    Shown += delegate { Iniciar(); };
  }

  // não pega o foco ao aparecer (o robô digita no navegador nessa hora)
  protected override bool ShowWithoutActivation { get { return !podeAtivar; } }
  protected override CreateParams CreateParams {
    get { CreateParams cp = base.CreateParams; cp.ExStyle |= 0x08000000 /* WS_EX_NOACTIVATE */; return cp; }
  }

  // tamanho do texto → altura do cartão; cartão no canto inferior direito, acima da barra de tarefas
  void Arrumar() {
    int esquerda = S(64), largura = S(380) - esquerda - S(20);
    Size medT = TextRenderer.MeasureText(titulo.Text, titulo.Font, new Size(largura, 2000), TextFormatFlags.WordBreak);
    titulo.SetBounds(esquerda, S(18), largura, medT.Height + S(2));
    Size med = TextRenderer.MeasureText(detalhe.Text, detalhe.Font, new Size(largura, 2000), TextFormatFlags.WordBreak);
    detalhe.SetBounds(esquerda, titulo.Bottom + S(4), largura, med.Height + S(18));
    int altura = detalhe.Bottom + S(18);
    if (botaoOk.Visible) {
      botaoOk.SetBounds(S(380) - S(20) - S(84), altura - S(4), S(84), S(32));
      altura = botaoOk.Bottom + S(16);
    }
    ClientSize = new Size(S(380), Math.Max(altura, S(96)));
    Rectangle area = Screen.PrimaryScreen.WorkingArea;
    Location = new Point(area.Right - Width - S(16), area.Bottom - Height - S(16));
    Region = Region.FromHrgn(CreateRoundRectRgn(0, 0, Width + 1, Height + 1, S(16), S(16)));
    Invalidate();
  }

  protected override void OnPaint(PaintEventArgs e) {
    Graphics g = e.Graphics;
    g.SmoothingMode = SmoothingMode.AntiAlias;
    using (Pen borda = new Pen(Color.FromArgb(225, 225, 230))) g.DrawRectangle(borda, 0, 0, Width - 1, Height - 1);
    Rectangle c = new Rectangle(S(20), S(20), S(30), S(30));
    if (estado == "rodando") {
      using (Pen trilho = new Pen(Color.FromArgb(229, 231, 235), S(3))) g.DrawEllipse(trilho, c);
      using (Pen arco = new Pen(Azul, S(3))) { arco.StartCap = LineCap.Round; arco.EndCap = LineCap.Round; g.DrawArc(arco, c, giro, 100); }
      return;
    }
    Color cor = estado == "ok" ? Verde : estado == "aviso" ? Ambar : Vermelho;
    using (Brush b = new SolidBrush(cor)) g.FillEllipse(b, c);
    using (Pen p = new Pen(Color.White, S(2.6f))) {
      p.StartCap = LineCap.Round; p.EndCap = LineCap.Round; p.LineJoin = LineJoin.Round;
      float x = c.X, y = c.Y, t = c.Width;
      if (estado == "ok") {
        g.DrawLines(p, new PointF[] { new PointF(x + t * 0.28f, y + t * 0.52f), new PointF(x + t * 0.44f, y + t * 0.67f), new PointF(x + t * 0.73f, y + t * 0.36f) });
      } else {
        g.DrawLine(p, x + t / 2, y + t * 0.27f, x + t / 2, y + t * 0.56f);
        using (Brush w = new SolidBrush(Color.White)) g.FillEllipse(w, x + t / 2 - S(1.8f), y + t * 0.70f - S(1.8f), S(3.6f), S(3.6f));
      }
    }
  }

  // arrastar o cartão pelo fundo
  protected override void OnMouseDown(MouseEventArgs e) {
    base.OnMouseDown(e);
    if (e.Button == MouseButtons.Left) { Capture = false; Message m = Message.Create(Handle, 0xA1, (IntPtr)2, IntPtr.Zero); WndProc(ref m); }
  }

  void Iniciar() {
    try {
      pastaTemp = Path.Combine(Path.GetTempPath(), "Robo-Revenda-" + Guid.NewGuid().ToString("N"));
      Directory.CreateDirectory(pastaTemp);
      string zip = Path.Combine(pastaTemp, "pacote.zip");
      using (Stream r = Assembly.GetExecutingAssembly().GetManifestResourceStream("pacote.zip"))
      using (FileStream f = File.Create(zip)) r.CopyTo(f);
      ZipFile.ExtractToDirectory(zip, pastaTemp);

      ProcessStartInfo info = new ProcessStartInfo("powershell.exe",
        "-NoProfile -ExecutionPolicy Bypass -File \"" + Path.Combine(pastaTemp, "instalar.ps1") + "\" -UmClique -Saida");
      info.UseShellExecute = false;
      info.CreateNoWindow = true;
      info.RedirectStandardOutput = true;
      info.RedirectStandardError = true;
      info.StandardOutputEncoding = new UTF8Encoding(false);
      info.StandardErrorEncoding = new UTF8Encoding(false);
      Process p = new Process();
      p.StartInfo = info;
      p.EnableRaisingEvents = true;
      StringBuilder erros = new StringBuilder();
      bool[] terminou = { false };
      p.OutputDataReceived += delegate(object s, DataReceivedEventArgs a) {
        if (a.Data == null) return;
        string linha = a.Data;
        BeginInvoke((MethodInvoker)delegate { Linha(linha, terminou); });
      };
      p.ErrorDataReceived += delegate(object s, DataReceivedEventArgs a) { if (a.Data != null) lock (erros) erros.AppendLine(a.Data); };
      p.Exited += delegate {
        p.WaitForExit();
        int codigo = p.ExitCode;
        BeginInvoke((MethodInvoker)delegate {
          if (!terminou[0]) {
            string msg = erros.ToString().Trim();
            Fim(codigo == 0 ? "ok" : "erro", codigo == 0 ? "Robô da Revenda instalado com sucesso!" : "Não deu para instalar",
              msg.Length > 0 ? Primeira(msg) : "Abra o instalador de novo para tentar.");
          }
          Limpar();
        });
      };
      p.Start();
      p.BeginOutputReadLine();
      p.BeginErrorReadLine();
    } catch (Exception ex) {
      Fim("erro", "Não deu para instalar", ex.Message);
      Limpar();
    }
  }

  static string Primeira(string s) { int i = s.IndexOf('\n'); return (i < 0 ? s : s.Substring(0, i)).Trim(); }

  void Linha(string linha, bool[] terminou) {
    if (linha.StartsWith("##STATUS ")) {
      if (manual) return; // os passos manuais têm que continuar na tela até a extensão aparecer
      detalhe.Text = linha.Substring(9).Replace("\\n", "\n");
      Arrumar();
    } else if (linha.StartsWith("##MANUAL ")) {
      manual = true;
      titulo.Text = "Falta um passo seu";
      detalhe.Text = linha.Substring(9).Replace("\\n", "\n");
      botaoOk.Text = "Fechar";
      botaoOk.Visible = true;
      Arrumar();
    } else if (linha.StartsWith("##FIM ")) {
      terminou[0] = true;
      string[] partes = linha.Substring(6).Split(new char[] { '|' }, 2);
      string texto = partes.Length > 1 ? partes[1].Replace("\\n", "\n") : "";
      int q = texto.IndexOf('\n');
      Fim(partes[0], q < 0 ? texto : texto.Substring(0, q), q < 0 ? "" : texto.Substring(q + 1));
    }
  }

  void Fim(string tipo, string tituloFim, string texto) {
    estado = tipo;
    manual = false;
    botaoOk.Text = "OK";
    animacao.Stop();
    titulo.Text = tituloFim;
    detalhe.Text = texto;
    botaoOk.Visible = true;
    Arrumar();
    // agora sim pode vir para a frente, com o OK pronto para Enter
    podeAtivar = true;
    SetWindowLong(Handle, -20 /* GWL_EXSTYLE */, GetWindowLong(Handle, -20) & ~0x08000000);
    SetForegroundWindow(Handle);
    Activate();
    botaoOk.Focus();
  }

  void Limpar() {
    try { if (pastaTemp != null && Directory.Exists(pastaTemp)) Directory.Delete(pastaTemp, true); } catch { }
  }
}
