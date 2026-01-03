# Fix UTF-8 Encoding Issues in Landing Page
# This script corrects mojibake characters in page.tsx

$filePath = "c:\dev\verifactu-monorepo\apps\landing\app\page.tsx"

Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

Write-Host "Applying character fixes..." -ForegroundColor Cyan

# Create mapping of corrupted -> correct characters
$replacements = @{
    # Vowels with accents
    "├│" = "ó"
    "├¡" = "á"
    "├®" = "é"
    "├¡" = "í"
    "├║" = "ú"
    
    # Special consonant
    "├▒" = "ñ"
    
    # Punctuation
    "┬┐" = "¿"
    "┬À" = "·"
    
    # Currency
    "Ôé¼" = "€"
    
    # Arrows
    "ÔåÆ" = "→"
    "Ôåæ" = "↑"
    
    # Checkmark
    "Ô£ô" = "✓"
    
    # Emojis
    "­ƒô©" = "📷"
    "­ƒñû" = "🧠"
    "­ƒôè" = "📈"
    "ÔÅ░" = "🔔"
    
    # Complete words
    "├Ültima" = "Última"
}

# Apply all replacements
$originalLength = $content.Length
foreach ($key in $replacements.Keys) {
    $count = ([regex]::Matches($content, [regex]::Escape($key))).Count
    if ($count -gt 0) {
        Write-Host "  Replacing '$key' → '$($replacements[$key])' ($count occurrences)" -ForegroundColor Yellow
        $content = $content.Replace($key, $replacements[$key])
    }
}

Write-Host "`nWriting corrected file..." -ForegroundColor Cyan
$content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline

$newLength = $content.Length
Write-Host "✓ File corrected successfully!" -ForegroundColor Green
Write-Host "  Original length: $originalLength characters" -ForegroundColor Gray
Write-Host "  New length: $newLength characters" -ForegroundColor Gray
Write-Host "`nNote: Please verify the file compiles correctly:" -ForegroundColor Cyan
Write-Host "  cd apps/landing && npm run build" -ForegroundColor White
