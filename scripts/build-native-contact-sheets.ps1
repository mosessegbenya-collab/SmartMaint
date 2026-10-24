Add-Type -AssemblyName System.Drawing
$inventory = Get-Content -LiteralPath 'validation/current/screens.json' -Raw | ConvertFrom-Json
$items = @($inventory.screens | Where-Object { $_.android.preferredEvidence })
$font = New-Object System.Drawing.Font('Arial', 11)
try {
  for ($offset = 0; $offset -lt $items.Count; $offset += 12) {
    $canvas = New-Object System.Drawing.Bitmap(1120, 1980)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::White)
    try {
      $limit = [Math]::Min($offset + 12, $items.Count)
      for ($index = $offset; $index -lt $limit; $index++) {
        $item = $items[$index]
        $metadata = Get-Content -LiteralPath $item.android.preferredEvidence -Raw | ConvertFrom-Json
        $bitmap = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $metadata.screenshot).Path)
        try {
          $slot = $index - $offset
          $x = ($slot % 4) * 280
          $y = [Math]::Floor($slot / 4) * 660
          $height = [int](260 * $bitmap.Height / $bitmap.Width)
          $graphics.DrawImage($bitmap, [int]($x + 10), [int]$y, 260, $height)
          $caption = "$($item.number) - $($item.screen) (variant)"
          $graphics.DrawString($caption, $font, [System.Drawing.Brushes]::Black, [single]($x + 5), [single]($y + 605))
        } finally { $bitmap.Dispose() }
      }
      $target = "validation/current/native-contact-$([int]($offset / 12)).jpg"
      $canvas.Save((Join-Path (Get-Location) $target), [System.Drawing.Imaging.ImageFormat]::Jpeg)
      Write-Output $target
    } finally { $graphics.Dispose(); $canvas.Dispose() }
  }
} finally { $font.Dispose() }
