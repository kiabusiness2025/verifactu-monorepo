#!/bin/bash
# Wrapper script to prevent Prisma from using npm during generation

# Create a fake npm that does nothing
mkdir -p /tmp/fake-bin
cat > /tmp/fake-bin/npm << 'EOF'
#!/bin/bash
echo "npm disabled during prisma generate"
exit 0
EOF
chmod +x /tmp/fake-bin/npm

# Add fake npm to PATH (prepend to override system npm)
export PATH="/tmp/fake-bin:$PATH"

# Disable Prisma auto-installation
export PRISMA_GENERATE_SKIP_AUTOINSTALL=true
export PRISMA_SKIP_POSTINSTALL_GENERATE=true
export PRISMA_GENERATE_IN_POSTINSTALL=false

# Run prisma generate
../../node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
