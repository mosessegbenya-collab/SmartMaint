param([ValidateSet('native','expo-go')][string]$Runtime='native')
Add-Type -AssemblyName System.Drawing
$comparisonInventory=Get-Content -LiteralPath 'artifacts/design-inventory.json' -Raw | ConvertFrom-Json
$comparisonPairs=if($Runtime -eq 'native'){@(
  @('SmartMaint Staff Sign-In Screen-1.png','artifacts/runtime/corrective-native-sign-in.png'),
  @('SmartMaint Staff Registration Mockup-1.png','artifacts/runtime/corrective-native-registration.png')
)}else{@(
  @('SmartMaint Staff Sign-In Screen-1.png','artifacts/runtime/corrective-sign-in-clean.png'),
  @('SmartMaint Staff Registration Mockup-1.png','artifacts/runtime/corrective-registration.png')
)}
foreach($comparisonPair in $comparisonPairs) {
  $comparisonIndex=-1
  for($comparisonCounter=0;$comparisonCounter -lt $comparisonInventory.Count;$comparisonCounter++) { if([IO.Path]::GetFileName($comparisonInventory[$comparisonCounter].reference) -eq $comparisonPair[0]) { $comparisonIndex=$comparisonCounter; break } }
  if($comparisonIndex -lt 0) { throw 'Approved reference not found in inventory.' }
  $comparisonFolder=Join-Path 'validation/screens' (($comparisonIndex+1).ToString('00'))
  if($Runtime -eq 'native') { foreach($preservedName in @('implementation.png','comparison.png','comparison-protocol.json')) { $preservedPath=Join-Path $comparisonFolder $preservedName; $preservedDestination=Join-Path $comparisonFolder ($preservedName.Replace('.png','-expo-go.png').Replace('.json','-expo-go.json')); if((Test-Path -LiteralPath $preservedPath) -and -not (Test-Path -LiteralPath $preservedDestination)){Copy-Item -LiteralPath $preservedPath -Destination $preservedDestination} } }
  Copy-Item -LiteralPath $comparisonPair[1] -Destination (Join-Path $comparisonFolder 'implementation.png')
  $comparisonRef=[Drawing.Image]::FromFile((Join-Path $PWD $comparisonInventory[$comparisonIndex].reference))
  $comparisonActual=[Drawing.Image]::FromFile((Join-Path $PWD $comparisonPair[1]))
  $comparisonCanvas=New-Object Drawing.Bitmap 846,860
  $comparisonGraphics=[Drawing.Graphics]::FromImage($comparisonCanvas)
  $comparisonGraphics.Clear([Drawing.Color]::White)
  $comparisonFont=New-Object Drawing.Font 'Arial',12
  $comparisonGraphics.DrawString('Approved reference (app content)', $comparisonFont,[Drawing.Brushes]::Black,20,10)
  $comparisonLabel=if($Runtime -eq 'native'){'Android debug build (not accepted)'}else{'Android Expo Go (not accepted)'}
  $comparisonGraphics.DrawString($comparisonLabel, $comparisonFont,[Drawing.Brushes]::Black,433,10)
  $comparisonGraphics.DrawImage($comparisonRef,[Drawing.Rectangle]::new(20,44,393,784),198,170,628,1253,[Drawing.GraphicsUnit]::Pixel)
  $comparisonGraphics.DrawImage($comparisonActual,[Drawing.Rectangle]::new(433,44,393,800),0,139,1080,2198,[Drawing.GraphicsUnit]::Pixel)
  $comparisonCanvas.Save((Join-Path $PWD (Join-Path $comparisonFolder 'comparison.png')),[Drawing.Imaging.ImageFormat]::Png)
  $comparisonGraphics.Dispose(); $comparisonCanvas.Dispose(); $comparisonRef.Dispose(); $comparisonActual.Dispose(); $comparisonFont.Dispose()
  $comparisonRuntime=if($Runtime -eq 'native'){'Pixel API35, Android debug x86_64 development build, 1080x2400'}else{'Pixel API35, Expo Go57, 1080x2400'}
  $comparisonMetadata=@{ referenceCrop=@(198,170,628,1253); implementationCrop=@(0,139,1080,2198); normalizedWidth=393; method='App-content crops, density normalization preserving aspect approximately; qualitative comparison only, no similarity score'; runtime=$comparisonRuntime; exclusions='OS bars and source phone frame excluded; floating developer button remains runtime chrome'; checkpoint='2026-10-23' }
  [IO.File]::WriteAllText((Join-Path $PWD (Join-Path $comparisonFolder 'comparison-protocol.json')),($comparisonMetadata|ConvertTo-Json -Depth 5),(New-Object Text.UTF8Encoding $false))
  Write-Output $comparisonFolder
}
