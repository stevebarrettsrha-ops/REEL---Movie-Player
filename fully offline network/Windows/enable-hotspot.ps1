param(
  [string]$Name = "REEL",
  [string]$Password = "YourPassword"
)

# ============================================================
#  REEL - best-effort "turn the Windows Mobile hotspot ON".
#  Used by  1 - START offline WiFi.bat  only when the older
#  "hosted network" method is not supported by this PC.
#
#  Exit code 0  = hotspot is now ON.
#  Exit code <>0 = could not do it automatically; the .bat then
#                  opens the Mobile hotspot settings page so the
#                  user can flip the one switch by hand.
# ============================================================

$ErrorActionPreference = 'Stop'

# Helper: wait for a WinRT IAsyncOperation to finish and return its result.
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
  # Load the WinRT types we need.
  [void][Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime]
  [void][Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]

  # The Mobile hotspot shares a network connection. Prefer the active
  # internet connection; if we are fully offline, use any adapter profile.
  $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
  if (-not $profile) {
    $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetConnectionProfiles() | Select-Object -First 1
  }
  if (-not $profile) { exit 1 }

  $mgr = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)

  # Try to set the WiFi name + password (not available on every build).
  try {
    $config = $mgr.GetCurrentAccessPointConfiguration()
    $config.Ssid = $Name
    $config.Passphrase = $Password
    [void](Await ($mgr.ConfigureAccessPointAsync($config)) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]))
  } catch { }

  # Already on? Nothing more to do.
  if ($mgr.TetheringOperationalState -eq 1) { exit 0 }

  $result = Await ($mgr.StartTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
  if ($result.Status -eq 0) { exit 0 }

  exit 2
}
catch {
  exit 3
}
