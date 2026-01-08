$f = Join-Path $env:USERPROFILE ".ssh/id_ed25519"
ssh-keygen -t ed25519 -C "kiabusiness2025@gmail.com" -N "" -f $f
