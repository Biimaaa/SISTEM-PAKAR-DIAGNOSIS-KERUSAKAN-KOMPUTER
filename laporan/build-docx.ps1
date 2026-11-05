$ErrorActionPreference = 'Stop'

$base = $PSScriptRoot
$htmlSource = [string](Join-Path $base 'laporan.html')
$htmlPath = [string](Join-Path $base 'laporan_final.html')
$docxPath = [string](Join-Path (Split-Path $base -Parent) 'LAPORAN_UTS_SISTEM_PAKAR.docx')
$pdfPath = [string](Join-Path (Split-Path $base -Parent) 'LAPORAN_UTS_SISTEM_PAKAR.pdf')

Copy-Item -LiteralPath $htmlSource -Destination $htmlPath -Force
Get-ChildItem -LiteralPath $base -Filter '~$*' -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

if (Test-Path $docxPath) { Remove-Item -LiteralPath $docxPath -Force }
if (Test-Path $pdfPath) { Remove-Item -LiteralPath $pdfPath -Force }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Open($htmlPath, $false, $false, $false)

  # Sematkan gambar hasil impor HTML agar tidak tersimpan sebagai tautan.
  foreach ($shape in $doc.InlineShapes) {
    try {
      $null = $shape.LinkFormat.SourceFullName
      $shape.LinkFormat.SavePictureWithDocument = $true
      $shape.LinkFormat.BreakLink()
    } catch {}
  }

  # Pengaturan halaman A4 dan margin.
  $ps = $doc.PageSetup
  $ps.PaperSize = 7  # wdPaperA4
  $ps.TopMargin = $word.CentimetersToPoints(2.5)
  $ps.BottomMargin = $word.CentimetersToPoints(2.5)
  $ps.LeftMargin = $word.CentimetersToPoints(3.0)
  $ps.RightMargin = $word.CentimetersToPoints(2.5)

  # Gaya dasar.
  $normal = $doc.Styles.Item('Normal')
  $normal.Font.Name = 'Times New Roman'
  $normal.Font.Size = 12
  $normal.ParagraphFormat.LineSpacingRule = 1  # 1.5 lines
  $normal.ParagraphFormat.SpaceAfter = 6
  $normal.ParagraphFormat.SpaceBefore = 0

  try {
    $h1 = $doc.Styles.Item('Heading 1')
    $h1.Font.Name = 'Times New Roman'
    $h1.Font.Size = 14
    $h1.Font.Bold = $true
    $h1.Font.Italic = $false
    $h1.Font.Color = 0
    $h1.ParagraphFormat.Alignment = 1
    $h1.ParagraphFormat.SpaceBefore = 0
    $h1.ParagraphFormat.SpaceAfter = 18
    $h1.ParagraphFormat.LineSpacingRule = 1
    $h1.ParagraphFormat.KeepWithNext = $true
  } catch { Write-Output "Peringatan gaya Heading 1: $($_.Exception.Message)" }

  try {
    $h2 = $doc.Styles.Item('Heading 2')
    $h2.Font.Name = 'Times New Roman'
    $h2.Font.Size = 12
    $h2.Font.Bold = $true
    $h2.Font.Italic = $false
    $h2.Font.Color = 0
    $h2.ParagraphFormat.Alignment = 0
    $h2.ParagraphFormat.SpaceBefore = 12
    $h2.ParagraphFormat.SpaceAfter = 6
    $h2.ParagraphFormat.LineSpacingRule = 1
    $h2.ParagraphFormat.KeepWithNext = $true
  } catch { Write-Output "Peringatan gaya Heading 2: $($_.Exception.Message)" }

  # Page break untuk halaman depan dan bab.
  $frontTitles = @('LEMBAR PENGESAHAN','ABSTRAK','KATA PENGANTAR','DAFTAR ISI','DAFTAR GAMBAR','DAFTAR TABEL')
  foreach ($p in $doc.Paragraphs) {
    $teks = $p.Range.Text.Trim()
    $gaya = $p.Style.NameLocal
    if ($gaya -eq 'Heading 1') {
      $p.Format.PageBreakBefore = $true
    }
    if ($frontTitles -contains $teks) {
      $p.Format.PageBreakBefore = $true
    }
  }

  # Tabel: font lebih kecil dan spasi tunggal agar rapi.
  foreach ($t in $doc.Tables) {
    $t.Range.Font.Name = 'Times New Roman'
    $t.Range.Font.Size = 9.5
    $t.Range.ParagraphFormat.LineSpacingRule = 0
    $t.Range.ParagraphFormat.SpaceBefore = 0
    $t.Range.ParagraphFormat.SpaceAfter = 0
  }

  # Nomor halaman di footer (halaman pertama berbeda / tanpa nomor).
  $section = $doc.Sections.Item(1)
  $section.PageSetup.DifferentFirstPageHeaderFooter = $true
  $footer = $section.Footers.Item(1)
  $footer.LinkToPrevious = $false
  $footer.Range.Text = ''
  $footer.Range.ParagraphFormat.Alignment = 1
  $footer.Range.Fields.Add($footer.Range, 33) | Out-Null  # wdFieldPage

  # Ganti penanda daftar isi dengan field TOC otomatis.
  $rng = $doc.Content
  $rng.Find.ClearFormatting()
  $rng.Find.Text = '[DAFTAR ISI OTOMATIS]'
  $rng.Find.Forward = $true
  $rng.Find.Wrap = 1
  $found = $rng.Find.Execute()
  if ($found) {
    $rng.Text = ''
    $toc = $doc.TablesOfContents.Add($rng, $true, 1, 2)
    $toc.Update()
  } else {
    Write-Output 'Peringatan: penanda daftar isi tidak ditemukan.'
  }

  $doc.Repaginate()
  $doc.Fields.Update() | Out-Null
  if ($found) { $toc.Update() }
  $doc.Repaginate()

  # Simpan sebagai DOCX lalu ekspor PDF.
  $doc.SaveAs2($docxPath, 16)
  $doc.ExportAsFixedFormat($pdfPath, 17)

  $pages = $doc.ComputeStatistics(2)  # wdStatisticPages
  Write-Output "DOCX : $docxPath"
  Write-Output "PDF  : $pdfPath"
  Write-Output "Halaman: $pages"

  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
