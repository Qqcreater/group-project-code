Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:/group-project-code/group-project-code/public/assets/xiaoyi.png")
$bmp = New-Object System.Drawing.Bitmap $img

# 在 y 28%~40% 区域按 5% x 2% 的块输出平均亮度，画成亮度图（越小越暗）
for ($yb = 28; $yb -le 40; $yb += 2) {
  $row = ""
  for ($xb = 35; $xb -le 65; $xb += 2.5) {
    $x0 = [int](500 * $xb / 100); $x1 = [int](500 * ($xb + 2.5) / 100)
    $y0 = [int](500 * $yb / 100); $y1 = [int](500 * ($yb + 2) / 100)
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
  Write-Output ("y{0,2}% {1}" -f $yb, $row)
}
Write-Output "图例: ## <60(瞳孔) ++ <110(深) -- <170(中) .. <220(浅) 空>=220"
$bmp.Dispose(); $img.Dispose()
