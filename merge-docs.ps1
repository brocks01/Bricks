# Merges every .md file in team-docs and platform-docs into ONE file, one after another.
# Run from anywhere:  powershell -File C:\Users\ankitkumar\Desktop\work\bricks\merge-docs.ps1
# Output: bricks\master-docs\ALL_DOCS.md  (overwritten each time). Nothing else is changed.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path $root 'master-docs\ALL_DOCS.md'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null

$files = @()
foreach ($folder in 'team-docs', 'platform-docs') {
    $dir = Join-Path $root $folder
    if (Test-Path $dir) { $files += Get-ChildItem $dir -Recurse -Filter *.md -File | Sort-Object FullName }
}

$sb = New-Object System.Text.StringBuilder
foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1)
    [void]$sb.AppendLine("`n`n==================== FILE: $rel ====================`n")
    [void]$sb.AppendLine(([IO.File]::ReadAllText($f.FullName).TrimStart([char]0xFEFF)).TrimEnd())
}
[IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
"Merged $($files.Count) files into $out ($([math]::Round((Get-Item $out).Length / 1KB, 1)) KB)"
