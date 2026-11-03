Add-Type -AssemblyName System.Drawing

function Analyze-Eyes([string]$path, [double]$yMinRatio, [double]$yMaxRatio) {
  $img = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $img
  $w = $bmp.Width; $h = $bmp.Height
  Write-Output "=== $path ($w x $h) ==="

  # 收集暗色像素（眼睛/瞳孔为深色）
  $dark = New-Object System.Collections.Generic.HashSet[string]
  $yMin = [int]($h * $yMinRatio); $yMax = [int]($h * $yMaxRatio)
  for ($y = $yMin; $y -lt $yMax; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $lum = 0.299*$c.R + 0.587*$c.G + 0.114*$c.B
      if ($lum -lt 90 -and $c.A -gt 128) { [void]$dark.Add("$x,$y") }
    }
  }

  # 简单聚类：网格 8px 连通块
  $cell = 8
  $grid = @{}
  foreach ($k in $dark) {
    $p = $k.Split(','); $x = [int]$p[0]; $y = [int]$p[1]
    $gx = [math]::Floor($x / $cell); $gy = [math]::Floor($y / $cell)
    $key = "$gx,$gy"
    if ($grid.ContainsKey($key)) { $grid[$key]++ } else { $grid[$key] = 1 }
  }
  # 连通网格合并（BFS）
  $visited = @{}
  $clusters = @()
  foreach ($key in $grid.Keys) {
    if ($visited.ContainsKey($key)) { continue }
    $queue = New-Object System.Collections.Queue
    $queue.Enqueue($key); $visited[$key] = $true
    $sumX = 0.0; $sumY = 0.0; $cnt = 0; $minX = 1e9; $maxX = -1.0; $minY = 1e9; $maxY = -1.0
    while ($queue.Count -gt 0) {
      $cur = [string]$queue.Dequeue()
      $cp = $cur.Split(','); $cgx = [int]$cp[0]; $cgy = [int]$cp[1]
      # 该网格内像素
      foreach ($k in $dark) {
        $pp = $k.Split(','); $px = [int]$pp[0]; $py = [int]$pp[1]
        if ([math]::Floor($px/$cell) -eq $cgx -and [math]::Floor($py/$cell) -eq $cgy) {
          $sumX += $px; $sumY += $py; $cnt++
          if ($px -lt $minX) { $minX = $px }; if ($px -gt $maxX) { $maxX = $px }
          if ($py -lt $minY) { $minY = $py }; if ($py -gt $maxY) { $maxY = $py }
        }
      }
      foreach ($dx in @(-1,0,1)) { foreach ($dy in @(-1,0,1)) {
        if ($dx -eq 0 -and $dy -eq 0) { continue }
        $nk = "$($cgx+$dx),$($cgy+$dy)"
        if ($grid.ContainsKey($nk) -and -not $visited.ContainsKey($nk)) {
          $visited[$nk] = $true; $queue.Enqueue($nk)
        }
      }}
    }
    if ($cnt -gt 30) {
      $cx = $sumX / $cnt; $cy = $sumY / $cnt
      $clusters += [pscustomobject]@{
        Count = $cnt
        CenterPct = "{0:N1}% , {1:N1}%" -f (100*$cx/$w), (100*$cy/$h)
        BoxPct = "x {0:N1}-{1:N1}%  y {2:N1}-{3:N1}%" -f (100*$minX/$w), (100*$maxX/$w), (100*$minY/$h), (100*$maxY/$h)
        SizePx = "$([int]($maxX-$minX+1)) x $([int]($maxY-$minY+1))"
      }
    }
  }
  $clusters | Sort-Object Count -Descending | Select-Object -First 8 | Format-Table -AutoSize
  $bmp.Dispose(); $img.Dispose()
}

Analyze-Eyes "d:/group-project-code/group-project-code/public/assets/xiaoyi.png" 0.22 0.50
Analyze-Eyes "d:/group-project-code/group-project-code/public/assets/xiaoyi_front.png" 0.22 0.50
