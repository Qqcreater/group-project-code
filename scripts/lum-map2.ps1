Add-Type -AssemblyName System.Drawing

function LumMap([string]$path, [int]$yStart, [int]$yEnd) {
  $img = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $img
  $w = $bmp.Width; $h = $bmp.Height
  Write-Output "=== $path ==="
  for ($yp = $yStart; $yp -lt $yEnd; $yp += 2) {
    $row = ""
    for ($xp = 28; $xp -lt 72; $xp += 2) {
      $x0 = [int]($w * $xp / 100); $x1 = [int]($w * ($xp + 2) / 100)
      $y0 = [int]($h * $yp / 100); $y1 = [int]($h * ($yp + 2) / 100)
      $sum = 0.0; $n = 0
      for ($y = $y0; $y -lt $y1; $y++) {
        for ($x = $x0; $x -lt $x1; $x++) {
          $c = $bmp.GetPixel($x, $y)
          $sum += 0.299*$c.R + 0.587*$c.G + 0.114*$c.B; $n++
        }
      }
      $avg = $sum / [math]::Max($n, 1)
      if ($avg -lt 60) { $row += "##" } elseif ($avg -lt 110) { $row += "++" }
      elseif ($avg -lt 170) { $row += "--" } elseif ($avg -lt 220) { $row += ".." }
      else { $row += "  " }
    }
    Write-Output ("y{0,2}% {1}" -f $yp, $row)
  }
  Write-Output "x轴: 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70"
  $bmp.Dispose(); $img.Dispose()
}

LumMap "d:/group-project-code/group-project-code/public/assets/xiaoyi.png" 22 50
LumMap "d:/group-project-code/group-project-code/public/assets/xiaoyi_front.png" 22 50
