# Регистрирует задачу планировщика: обновление данных площадок каждые 3 часа.
# Запуск: npm run sync:install   (права администратора не нужны)

$ErrorActionPreference = "Stop"

$taskName = "MafiaSiteSync"
$scriptPath = Join-Path $PSScriptRoot "sync.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "Не найден scripts\sync.ps1"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -Quiet' -f $scriptPath)

$daily = New-ScheduledTaskTrigger -Daily -At "09:00"
$repeat = New-ScheduledTaskTrigger -Once -At "09:00" `
  -RepetitionInterval (New-TimeSpan -Hours 3) `
  -RepetitionDuration (New-TimeSpan -Days 1)
$daily.Repetition = $repeat.Repetition

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $daily `
  -Principal $principal `
  -Settings $settings `
  -Description "Обновление отзывов 2ГИС, Яндекс Карт и постов VK на сайте барбершопа «Мафия»" `
  -Force | Out-Null

Write-Host "Задача «$taskName» создана: каждые 3 часа, начиная с 09:00."
Write-Host "Проверить: Get-ScheduledTask -TaskName $taskName"
Write-Host "Удалить:  Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
