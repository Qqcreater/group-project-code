Add-Type -AssemblyName System.Drawing

function AsciiArt([string]$path, [int]$cols, [int]$rows) {
  $img = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $img
  $w = $bmp.Width; $h = $bmp.Height
  Write-Output "=== ASCII $path (${w}x${h}) -> ${cols}x${rows} ==="
  $chars = "@%#*+=-:. "
  $out = ""
  for ($r = 0; $r -lt $rows; $r++) {
    $line = ""
    for ($c = 0; $c -lt $cols; $c++) {
      $x0 = [int]($w * $c / $cols); $x1 = [int]($w * ($c + 1) / $cols)
      $y0 = [int]($h * $r / $rows); $y1 = [int]($h * ($r + 1) / $rows)
      $sum = 0.0; $n = 0
      for ($y = $y0; $y -lt $y1; $y += 2) {
        for ($x = $x0; $x -lt $x1; $x += 2) {
          $p = $bmp.GetPixel($x, $y)
          $sum += 0.299*$p.R + 0.587*$p.G + 0.114*$p.B; $n++
        }
      }
      $avg = $sum / [math]::Max($n, 1)
      $idx = [int]([math]::Floor($avg / 256 * $chars.Length))
      if ($idx -ge $chars.Length) { $idx = $chars.Length - 1 }
      $line += $chars[$idx]
    }
    $out += ("{0,2}|{1}`n" -f [int]($r * 100 / $rows), $line)
  }
  Write-Output $out
  $bmp.Dispose(); $img.Dispose()
}

AsciiArt "d:/group-project-code/group-project-code/public/assets/xiaoyi.png" 78 40
