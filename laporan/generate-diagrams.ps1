Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot 'img'
New-Item -ItemType Directory -Path $imgDir -Force | Out-Null

function Save-Bitmap($bmp, $name) {
  $path = Join-Path $imgDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "OK $name"
}

function New-Graphics($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear([System.Drawing.Color]::White)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Get-RoundPath($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Box {
  param($g, $x, $y, $w, $h, $title, $sub, $fill, $border)
  $path = Get-RoundPath $x $y $w $h 10
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($fill))
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($border), 2)
  $g.FillPath($brush, $path)
  $g.DrawPath($pen, $path)

  $titleFont = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font('Segoe UI', 9)
  $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 37, 41))
  $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(73, 80, 87))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  if ([string]::IsNullOrWhiteSpace($sub)) {
    $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
    $g.DrawString($title, $titleFont, $titleBrush, $rect, $fmt)
  } else {
    $rectTitle = New-Object System.Drawing.RectangleF($x, ($y + 14), $w, ($h * 0.42))
    $rectSub = New-Object System.Drawing.RectangleF(($x + 10), ($y + $h * 0.52), ($w - 20), ($h * 0.40))
    $g.DrawString($title, $titleFont, $titleBrush, $rectTitle, $fmt)
    $g.DrawString($sub, $subFont, $subBrush, $rectSub, $fmt)
  }

  $brush.Dispose(); $pen.Dispose(); $titleFont.Dispose(); $subFont.Dispose()
  $titleBrush.Dispose(); $subBrush.Dispose(); $fmt.Dispose(); $path.Dispose()
}

function Draw-Title {
  param($g, $text, $w, $y = 28)
  $font = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(13, 110, 253))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(0, $y, $w, 45)
  $g.DrawString($text, $font, $brush, $rect, $fmt)
  $font.Dispose(); $brush.Dispose(); $fmt.Dispose()
}

function Draw-Band {
  param($g, $x, $y, $w, $h, $label, $fill, $border)
  $path = Get-RoundPath $x $y $w $h 14
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($fill))
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($border), 1)
  $g.FillPath($brush, $path)
  $g.DrawPath($pen, $path)
  $font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 100, 110))
  $g.DrawString($label, $font, $textBrush, ($x + 18), ($y + 10))
  $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $textBrush.Dispose(); $path.Dispose()
}

function Draw-Arrow {
  param($g, $points, $color = '#0D6EFD', $dashed = $false)
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($color), 2)
  if ($dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
  $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(5, 5, $true)
  for ($i = 0; $i -lt $points.Count - 1; $i++) {
    $g.DrawLine($pen, $points[$i][0], $points[$i][1], $points[$i + 1][0], $points[$i + 1][1])
  }
  $pen.Dispose()
}

function Draw-Label {
  param($g, $text, $x, $y, $size = 9, $color = '#495057')
  $font = New-Object System.Drawing.Font('Segoe UI', $size)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
  $g.DrawString($text, $font, $brush, $x, $y)
  $font.Dispose(); $brush.Dispose()
}

function Draw-Diamond {
  param($g, $cx, $cy, $w, $h, $text)
  $points = @(
    (New-Object System.Drawing.PointF($cx, ($cy - $h / 2))),
    (New-Object System.Drawing.PointF(($cx + $w / 2), $cy)),
    (New-Object System.Drawing.PointF($cx, ($cy + $h / 2))),
    (New-Object System.Drawing.PointF(($cx - $w / 2), $cy))
  )
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 225))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 160, 0), 2)
  $g.FillPolygon($brush, $points)
  $g.DrawPolygon($pen, $points)
  $font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 50, 20))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(($cx - $w / 2 + 10), ($cy - $h / 2 + 8), ($w - 20), ($h - 16))
  $g.DrawString($text, $font, $textBrush, $rect, $fmt)
  $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $textBrush.Dispose(); $fmt.Dispose()
}

function Draw-Entity {
  param($g, $x, $y, $w, $h, $name, $fields)
  $path = Get-RoundPath $x $y $w $h 8
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 249, 250))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(108, 117, 125), 1.5)
  $g.FillPath($brush, $path)
  $g.DrawPath($pen, $path)

  $headRect = New-Object System.Drawing.RectangleF($x, $y, $w, 30)
  $headBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(13, 110, 253))
  $g.FillRectangle($headBrush, $headRect)
  $fontHead = New-Object System.Drawing.Font('Consolas', 11, [System.Drawing.FontStyle]::Bold)
  $fontField = New-Object System.Drawing.Font('Consolas', 9)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 37, 41))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString($name, $fontHead, $white, $headRect, $fmt)

  $lineY = $y + 36
  foreach ($f in $fields) {
    $g.DrawString($f, $fontField, $dark, ($x + 10), $lineY)
    $lineY += 18
  }
  $brush.Dispose(); $pen.Dispose(); $headBrush.Dispose(); $fontHead.Dispose(); $fontField.Dispose()
  $white.Dispose(); $dark.Dispose(); $fmt.Dispose(); $path.Dispose()
}

# ===================== 1. ARSITEKTUR =====================
$c = New-Graphics 1400 800
$g = $c.Graphics
Draw-Title $g 'Arsitektur Sistem Pakar Diagnosis Kerusakan Laptop dan PC' 1400 24
Draw-Band $g 40 90 1320 180 'LAPISAN PRESENTASI' '#E7F1FF' '#9EC5FE'
Draw-Box $g 80 130 360 100 'Pengguna / Browser' 'Mengakses halaman publik' '#FFFFFF' '#0D6EFD'
Draw-Box $g 480 130 360 100 'Halaman Publik (EJS)' 'Beranda, diagnosis, hasil, riwayat' '#FFFFFF' '#0D6EFD'
Draw-Box $g 880 130 440 100 'Panel Admin (EJS)' 'Dashboard, CRUD basis pengetahuan, pengaturan' '#FFFFFF' '#0D6EFD'

Draw-Band $g 40 310 1320 210 'LAPISAN APLIKASI' '#EAF7EE' '#A3CFBB'
Draw-Box $g 80 355 360 120 'Router Publik' 'Proses diagnosis, hasil, PDF, riwayat' '#FFFFFF' '#198754'
Draw-Box $g 490 355 360 120 'Router Admin' 'Autentikasi, CSRF, CRUD, pengaturan' '#FFFFFF' '#198754'
Draw-Box $g 900 355 420 120 'Mesin Inferensi' 'Forward Chaining + Certainty Factor' '#FFFFFF' '#198754'

Draw-Band $g 40 560 1320 190 'LAPISAN DATA' '#FFF4E5' '#FFDA6A'
Draw-Box $g 80 600 360 110 'Basis Pengetahuan' 'db/pengetahuan.js (loader aturan)' '#FFFFFF' '#FD7E14'
Draw-Box $g 490 600 360 110 'Database SQLite' 'schema.sql, WAL, foreign keys' '#FFFFFF' '#FD7E14'
Draw-Box $g 900 600 420 110 'Session dan Keamanan' 'express-session, bcrypt, CSRF token' '#FFFFFF' '#FD7E14'

Draw-Arrow $g @(@(260, 230), @(260, 355)) '#0D6EFD'
Draw-Arrow $g @(@(660, 230), @(660, 355)) '#0D6EFD'
Draw-Arrow $g @(@(1100, 230), @(1100, 355)) '#0D6EFD'
Draw-Arrow $g @(@(260, 475), @(260, 600)) '#198754'
Draw-Arrow $g @(@(670, 475), @(670, 600)) '#198754'
Draw-Arrow $g @(@(1110, 475), @(1110, 600)) '#198754'
Draw-Arrow $g @(@(440, 380), @(490, 380)) '#198754'
Draw-Arrow $g @(@(850, 380), @(900, 380)) '#198754'
Draw-Arrow $g @(@(850, 415), @(900, 415)) '#198754'
Draw-Label $g 'HTTP / HTTPS' 272 300 8 '#6C757D'
Draw-Label $g 'query SQL' 682 540 8 '#6C757D'
Draw-Label $g 'request' 448 372 8 '#6C757D'
Draw-Label $g 'data aturan' 856 365 8 '#6C757D'
Save-Bitmap $c.Bitmap 'arsitektur.png'

# ===================== 2. FLOWCHART =====================
$c = New-Graphics 1200 1750
$g = $c.Graphics
Draw-Title $g 'Flowchart Alur Diagnosis Pengguna' 1200 24

$cx = 600
$y = 110
Draw-Box $g ($cx - 90) $y 180 50 'Mulai' '' '#D1E7DD' '#198754'
$y = 210
Draw-Box $g ($cx - 220) $y 440 56 'Pilih jenis perangkat' 'Laptop atau PC / Desktop' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 160), @($cx, 210)) '#0D6EFD'
$y = 310
Draw-Box $g ($cx - 260) $y 520 56 'Sistem menampilkan daftar gejala' 'Dikelompokkan per kategori sesuai perangkat' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 266), @($cx, 310)) '#0D6EFD'
$y = 410
Draw-Box $g ($cx - 260) $y 520 56 'Pengguna memilih gejala dan CF user' 'Minimal satu gejala; CF 0,4 sampai 1,0' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 366), @($cx, 410)) '#0D6EFD'
$y = 510
Draw-Box $g ($cx - 210) $y 420 56 'Kirim form diagnosis' 'POST /diagnosis/proses' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 466), @($cx, 510)) '#0D6EFD'
$y = 610
Draw-Diamond $g $cx $y 360 110 'Minimal satu gejala dengan CF > 0?'
Draw-Arrow $g @(@($cx, 566), @($cx, 555)) '#0D6EFD'
Draw-Arrow $g @(@(($cx + 180), $y), @(965, $y), @(965, 438), @(860, 438)) '#DC3545'
Draw-Label $g 'Tidak' 800 580 9 '#DC3545'
Draw-Label $g 'Tampilkan pesan validasi' 895 560 8 '#DC3545'
$y = 760
Draw-Box $g ($cx - 270) $y 540 56 'Muat basis pengetahuan dari SQLite' 'gejala, kerusakan, diagnostik, aturan, ambang' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 665), @($cx, 760)) '#0D6EFD'
Draw-Label $g 'Ya' 610 690 9 '#198754'
$y = 860
Draw-Box $g ($cx - 270) $y 540 56 'Tahap 1: Forward Chaining' 'Evaluasi aturan diagnostik (AND / OR)' '#FFFFFF' '#198754'
Draw-Arrow $g @(@($cx, 816), @($cx, 860)) '#198754'
$y = 960
Draw-Box $g ($cx - 270) $y 540 56 'Tahap 2: Certainty Factor' 'CF = CF pakar x CF user; gabungkan berurutan' '#FFFFFF' '#198754'
Draw-Arrow $g @(@($cx, 916), @($cx, 960)) '#198754'
$y = 1060
Draw-Box $g ($cx - 270) $y 540 56 'Filter hasil terhadap ambang CF' 'Hanya CF akhir >= ambang yang ditampilkan' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 1016), @($cx, 1060)) '#0D6EFD'
$y = 1160
Draw-Box $g ($cx - 270) $y 540 56 'Simpan diagnosis dan detail gejala' 'termasuk snapshot hasil_json' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 1116), @($cx, 1160)) '#0D6EFD'
$y = 1260
Draw-Box $g ($cx - 270) $y 540 56 'Tampilkan hasil diagnosis' 'dugaan, peringkat CF, rincian, saran' '#FFFFFF' '#0D6EFD'
Draw-Arrow $g @(@($cx, 1216), @($cx, 1260)) '#0D6EFD'
$y = 1360
Draw-Diamond $g $cx $y 320 100 'Unduh hasil PDF?'
Draw-Arrow $g @(@($cx, 1316), @($cx, 1310)) '#0D6EFD'
Draw-Arrow $g @(@(($cx + 160), $y), @(940, $y), @(940, 1430)) '#198754'
Draw-Label $g 'Ya' 800 1330 9 '#198754'
$y = 1430
Draw-Box $g ($cx + 340) $y 220 50 'Buat PDF' '' '#FFF3CD' '#FFC107'
Draw-Arrow $g @(@(($cx - 160), 1360), @(400, 1360), @(400, 1525), @(510, 1525)) '#6C757D'
Draw-Label $g 'Tidak' 430 1350 9 '#6C757D'
Draw-Box $g ($cx - 90) 1500 180 50 'Selesai' '' '#D1E7DD' '#198754'
Draw-Arrow $g @(@(940, 1480), @(940, 1570), @(690, 1570), @(690, 1525)) '#FFC107'
Save-Bitmap $c.Bitmap 'flowchart.png'

# ===================== 3. USE CASE =====================
$c = New-Graphics 1400 900
$g = $c.Graphics
Draw-Title $g 'Use Case Diagram Sistem Pakar' 1400 20

$boundaryPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(13, 110, 253), 2)
$g.DrawRectangle($boundaryPen, 300, 90, 800, 750)
$fontLabel = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$brushLabel = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(13, 110, 253))
$g.DrawString('SISTEM PAKAR DIAGNOSIS KERUSAKAN LAPTOP DAN PC', $fontLabel, $brushLabel, 315, 100)
$boundaryPen.Dispose(); $fontLabel.Dispose(); $brushLabel.Dispose()

function Draw-Actor($g, $x, $y, $label) {
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(33, 37, 41), 2)
  $headBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillEllipse($headBrush, ($x - 16), ($y - 70), 32, 32)
  $g.DrawEllipse($pen, ($x - 16), ($y - 70), 32, 32)
  $g.DrawLine($pen, $x, ($y - 38), $x, ($y + 10))
  $g.DrawLine($pen, ($x - 32), ($y - 20), ($x + 32), ($y - 20))
  $g.DrawLine($pen, $x, ($y + 10), ($x - 28), ($y + 58))
  $g.DrawLine($pen, $x, ($y + 10), ($x + 28), ($y + 58))
  $font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 37, 41))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(($x - 70), ($y + 66), 140, 26)
  $g.DrawString($label, $font, $brush, $rect, $fmt)
  $pen.Dispose(); $headBrush.Dispose(); $font.Dispose(); $brush.Dispose(); $fmt.Dispose()
}

function Draw-UseCase($g, $x, $y, $w, $h, $text) {
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(231, 241, 255))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(13, 110, 253), 1.5)
  $g.FillEllipse($brush, $x, $y, $w, $h)
  $g.DrawEllipse($pen, $x, $y, $w, $h)
  $font = New-Object System.Drawing.Font('Segoe UI', 9.5)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 37, 41))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(($x + 8), ($y + 6), ($w - 16), ($h - 12))
  $g.DrawString($text, $font, $textBrush, $rect, $fmt)
  $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $textBrush.Dispose(); $fmt.Dispose()
}

Draw-Actor $g 150 430 'Pengguna'
Draw-Actor $g 1250 430 'Admin'

$leftCases = @(
  @{x=380; y=160; t='Melihat beranda'},
  @{x=380; y=260; t='Melakukan diagnosis'},
  @{x=380; y=360; t='Melihat hasil diagnosis'},
  @{x=380; y=460; t='Mengunduh hasil PDF'},
  @{x=380; y=560; t='Melihat riwayat'},
  @{x=380; y=660; t='Melihat halaman tentang'}
)
$rightCases = @(
  @{x=830; y=160; t='Login admin'},
  @{x=830; y=260; t='Melihat dashboard'},
  @{x=830; y=360; t='Kelola gejala'},
  @{x=830; y=460; t='Kelola kerusakan'},
  @{x=830; y=560; t='Kelola aturan dan diagnostik'},
  @{x=830; y=660; t='Mengubah pengaturan'}
)
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(108, 117, 125), 1)
foreach ($uc in $leftCases) {
  $g.DrawLine($linePen, 182, 420, ($uc.x + 10), ($uc.y + 25))
  Draw-UseCase $g $uc.x $uc.y 300 50 $uc.t
}
foreach ($uc in $rightCases) {
  $g.DrawLine($linePen, 1218, 420, ($uc.x + 290), ($uc.y + 25))
  Draw-UseCase $g $uc.x $uc.y 300 50 $uc.t
}
$linePen.Dispose()
Save-Bitmap $c.Bitmap 'usecase.png'

# ===================== 4. ERD =====================
$c = New-Graphics 1500 1000
$g = $c.Graphics
Draw-Title $g 'Entity Relationship Diagram (ERD) Basis Data' 1500 20

Draw-Entity $g 100 100 260 160 'gejala' @('PK  id', '    kode (unique)', '    nama', '    jenis_perangkat', '    kategori')
Draw-Entity $g 450 100 280 160 'aturan_cf' @('PK  id', '    kode (unique)', 'FK  id_gejala', 'FK  id_kerusakan', '    cf_pakar (0-1)')
Draw-Entity $g 820 100 280 160 'kerusakan' @('PK  id', '    kode (unique)', '    nama', '    deskripsi', '    solusi', '    jenis_perangkat')

Draw-Entity $g 100 400 300 150 'aturan_diagnostik' @('PK  id', '    kode (unique)', '    kondisi_json', 'FK  id_diagnostik')
Draw-Entity $g 470 400 260 150 'diagnostik' @('PK  id', '    kode (unique)', '    nama')
Draw-Entity $g 810 400 320 150 'diagnostik_kerusakan' @('PK  id', 'FK  id_diagnostik', 'FK  id_kerusakan')
Draw-Entity $g 1200 400 220 130 'pengaturan' @('PK  kunci', '    nilai')

Draw-Entity $g 100 700 300 170 'diagnosis_detail' @('PK  id', 'FK  id_diagnosis', 'FK  id_gejala', '    cf_user')
Draw-Entity $g 470 700 260 170 'diagnosis' @('PK  id', '    tanggal', '    jenis_perangkat', '    hasil_utama', '    cf_hasil', '    hasil_json')
Draw-Entity $g 810 700 230 150 'admin' @('PK  id', '    username', '    password_hash')

Draw-Arrow $g @(@(360, 180), @(450, 180)) '#495057'
Draw-Label $g '1' 365 160 10 '#495057'
Draw-Label $g 'N' 430 160 10 '#495057'
Draw-Arrow $g @(@(730, 180), @(820, 180)) '#495057'
Draw-Label $g 'N' 735 160 10 '#495057'
Draw-Label $g '1' 800 160 10 '#495057'
Draw-Arrow $g @(@(400, 475), @(470, 475)) '#495057'
Draw-Label $g 'N' 405 455 10 '#495057'
Draw-Label $g '1' 450 455 10 '#495057'
Draw-Arrow $g @(@(730, 475), @(810, 475)) '#495057'
Draw-Label $g '1' 735 455 10 '#495057'
Draw-Label $g 'N' 790 455 10 '#495057'
Draw-Arrow $g @(@(960, 260), @(960, 400)) '#495057'
Draw-Label $g '1' 968 320 10 '#495057'
Draw-Label $g 'N' 968 370 10 '#495057'
Draw-Arrow $g @(@(470, 760), @(400, 760)) '#495057'
Draw-Label $g 'N' 435 740 10 '#495057'
Draw-Label $g '1' 410 740 10 '#495057'
Draw-Arrow $g @(@(160, 260), @(160, 400)) '#6C757D' $true
Draw-Label $g 'kode gejala (JSON)' 168 320 8 '#6C757D'
Draw-Arrow $g @(@(230, 260), @(60, 260), @(60, 760), @(100, 760)) '#495057'
Draw-Label $g '1' 236 268 10 '#495057'
Draw-Label $g 'N' 110 748 10 '#495057'
Draw-Arrow $g @(@(960, 260), @(1450, 260), @(1450, 900), @(600, 900), @(600, 870)) '#6C757D' $true
Draw-Label $g 'hasil_utama (kode)' 610 880 8 '#6C757D'
Save-Bitmap $c.Bitmap 'erd.png'
