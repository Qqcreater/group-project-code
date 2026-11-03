Add-Type -AssemblyName System.Drawing

function Find-EyeBlobs([string]$path) {
  $img = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $img
  $w = $bmp.Width; $h = $bmp.Height
  Write-Output "=== $path ($w x $h) ==="
  $mask = New-Object 'bool[,]' $w, $h
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      if ($c.A -gt 100 -and (0.299*$c.R + 0.587*$c.G + 0.114*$c.B) -lt 70) { $mask[$x, $y] = $true }
    }
  }
  $visited = New-Object 'bool[,]' $w, $h
  $found = @()
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if (-not $mask[$x, $y] -or $visited[$x, $y]) { continue }
      $stack = New-Object System.Collections.Stack
      $stack.Push(@($x, $y)); $visited[$x, $y] = $true
      $cnt = 0; $sumX = 0.0; $sumY = 0.0; $minX = $x; $maxX = $x; $minY = $y; $maxY = $y
      while ($stack.Count -gt 0) {
        $pt = $stack.Pop(); $px = $pt[0]; $py = $pt[1]
        $cnt++; $sumX += $px; $sumY += $py
        if ($px -lt $minX) { $minX = $px }; if ($px -gt $maxX) { $maxX = $px }
        if ($py -lt $minY) { $minY = $py }; if ($py -gt $maxY) { $maxY = $py }
        foreach ($d in @(@(1,0),@(-1,0),@(0,1),@(0,-1))) {
          $nx = $px + $d[0]; $ny = $py + $d[1]
          if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h -and $mask[$nx, $ny] -and -not $visited[$nx, $ny]) {
            $visited[$nx, $ny] = $true; $stack.Push(@($nx, $ny))
          }
        }
      }
      $bw = $maxX - $minX + 1; $bh = $maxY - $minY + 1
      $fill = $cnt / ($bw * $bh)
      # 眼珠特征：尺寸适中、填充率高（近圆/椭圆实心）
      if ($cnt -ge 50 -and $bw -ge 8 -and $bw -le [int]($w*0.12) -and $bh -ge 8 -and $bh -le [int]($h*0.08) -and $fill -gt 0.45) {
        $found += [pscustomobject]@{
          Center = "{0:N1}% , {1:N1}%" -f (100*($sumX/$cnt)/$w), (100*($sumY/$cnt)/$h)
          Box = "x {0:N1}-{1:N1}%  y {2:N1}-{3:N1}%" -f (100*$minX/$w), (100*$maxX/$w), (100*$minY/$h), (100*$maxY/$h)
          Size = "${bw}x${bh}"
          Fill = "{0:P0}" -f $fill
          Pixels = $cnt
        }
      }
    }
  }
  $found | Sort-Object Pixels -Descending | Select-Object -First 10 | Format-Table -AutoSize
  $bmp.Dispose(); $img.Dispose()
}

Find-EyeBlobs "d:/group-project-code/group-project-code/public/assets/xiaoyi.png"
Find-EyeBlobs "d:/group-project-code/group-project-code/public/assets/xiaoyi_front.png"
Find-EyeBlobs "d:/group-project-code/group-project-code/public/assets/xiaoyi_talk_matte.png"
Find-EyeBlobs "d:/group-project-code/group-project-code/public/assets/ce6582e85e3cc8621f891133f9d1a6ac.jpg"
