Add-Type -AssemblyName System.Drawing
$path = "d:/group-project-code/group-project-code/public/assets/xiaoyi.png"
$img = [System.Drawing.Image]::FromFile($path)
$bmp = New-Object System.Drawing.Bitmap $img
$w = $bmp.Width; $h = $bmp.Height
$chars = "@%#*+=-:. "
# 只输出脸部与头部区域
$xStart = 30; $xEnd = 70; $yStart = 4; $yEnd = 46
$cols = 100; $rows = 46
$out = ""
for ($r = 0; $r -lt $rows; $r++) {
  $line = ""
  for ($c = 0; $c -lt $cols; $c++) {
    $xp0 = $xStart + ($xEnd - $xStart) * $c / $cols
    $xp1 = $xStart + ($xEnd - $xStart) * ($c + 1) / $cols
    $yp0 = $yStart + ($yEnd - $yStart) * $r / $rows
    $yp1 = $yStart + ($yEnd - $yStart) * ($r + 1) / $rows
    $sum = 0.0; $n = 0
    for ($y = [int]($h * $yp0 / 100); $y -lt [int]($h * $yp1 / 100); $y++) {
      for ($x = [int]($w * $xp0 / 100); $x -lt [int]($w * $xp1 / 100); $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 40) { continue }
        $sum += 0.299*$p.R + 0.587*$p.G + 0.114*$p.B; $n++
      }
    }
    if ($n -eq 0) { $line += " "; continue }
    $avg = $sum / $n
    $idx = [int]([math]::Floor($avg / 256 * $chars.Length))
    if ($idx -ge $chars.Length) { $idx = $chars.Length - 1 }
    $line += $chars[$idx]
  }
  $out += ("{0,4}%|{1}`n" -f [int]($yStart + ($yEnd-$yStart)*$r/$rows), $line)
}
Write-Output "x: 30% .. 70%，每列 0.4%"
Write-Output $out
$bmp.Dispose(); $img.Dispose()
