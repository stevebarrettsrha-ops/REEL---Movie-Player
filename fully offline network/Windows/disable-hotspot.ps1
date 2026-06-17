# ============================================================
#  REEL - best-effort "turn the Windows Mobile hotspot OFF".
#  Used by  2 - STOP offline WiFi.bat  to switch off the modern
#  Mobile hotspot (in case that is what was turned on).
#  Always exits 0 - if there was nothing to stop, that is fine.
# ============================================================

$ErrorActionPreference = 'Stop'

function Await($op, $resultType) {
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and
      $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
  $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
  $task = $asTask.Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
  $task.Result
}

try {
  [void][Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime]
  [void][Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]

  $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
  if (-not $profile) {
    $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetConnectionProfiles() | Select-Object -First 1
  }
  if ($profile) {
    $mgr = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)
    if ($mgr.TetheringOperationalState -eq 1) {
      [void](Await ($mgr.StopTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]))
    }
  }
}
catch { }

exit 0
