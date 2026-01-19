# Debugging Guide

## VS Code Debugger

### Debug Next.js App

1. **Press F5** or go to **Run & Debug** > **Next.js App (Port 3000)**
2. Set breakpoints in your code by clicking on the line number
3. The debugger will pause at breakpoints
4. Use the debug console to inspect variables

### Debug Tests

1. **Press Ctrl+Shift+D** to open Run & Debug
2. Select **Debug Tests**
3. Jest will run in watch mode with debugger attached
4. Breakpoints in test files will work

### Full Stack Debug (App + Browser)

1. Select **Full Stack Debug** from the debug dropdown
2. This will start both the Next.js app and Chrome DevTools
3. You can debug both backend and frontend simultaneously

---

## Command Line Debugging

### Debug with inspect flag

```bash
# Debug the app server
node --inspect=9229 node_modules/.bin/next dev

# Or via pnpm
NODE_OPTIONS=--inspect pnpm dev
```

Then attach VSCode debugger to the running process.

### Debug tests with inspect

```bash
NODE_OPTIONS=--inspect pnpm test:watch
```

---

## Browser DevTools

### Microsoft Edge Tools

1. Open VS Code Command Palette (Ctrl+Shift+P)
2. Search for "Edge: Open DevTools"
3. Use the browser inspector to debug frontend code
4. Set breakpoints in the Elements and Sources panels

### Chrome DevTools Protocol

Network debugging is available via Chrome DevTools at `chrome://inspect`

---

## SQL Server Debugging

### Connect to PostgreSQL via MSSQL Extension

1. Open **SQL Server (mssql)** extension in VS Code
2. Click **Add Connection**
3. Use these credentials:
   - **Server**: localhost:5432
   - **Database**: verifactu
   - **User**: verifactu
   - **Password**: verifactu_dev_pass

### Run Queries

- Right-click on a connection and select **New Query**
- Write your SQL and press **Ctrl+Shift+E** to execute
- Results appear in the output panel

---

## Logging Best Practices

### Server-side Logging

```typescript
// Bad - will be stripped in production
console.log('Debug info:', data);

// Good - uses proper logging
console.error('Error occurred:', error);
console.warn('Warning:', issue);
```

### Client-side Debugging

Use browser console for frontend debugging:
```typescript
if (typeof window !== 'undefined') {
  console.debug('Client debug:', data);
}
```

### Use Debugger Statements

```typescript
function problematicFunction() {
  debugger; // Execution will pause here when debugger is open
  // ... rest of code
}
```

---

## Environment Variables for Debugging

Create `.env.local.debug`:
```
DEBUG=*
LOG_LEVEL=debug
NEXT_PUBLIC_DEBUG=true
```

Then run:
```bash
source .env.local.debug && pnpm dev
```

---

## GitHub Actions Debugging

Enable debug logging for Actions:

1. Go to your GitHub repository
2. Settings > Secrets and variables > Actions
3. Add secret `ACTIONS_STEP_DEBUG` = `true`
4. Push a commit to see detailed logs

---

## Useful Debugging Commands

```bash
# List all processes on a port
lsof -i :3000

# Kill a process on a port
kill -9 <PID>

# Check Node memory usage
node --max-old-space-size=4096 node_modules/.bin/next dev

# Run with verbose output
DEBUG=* pnpm dev
```

---

## Common Issues

### Breakpoints not working
- Make sure source maps are enabled
- Check that the file path matches your source
- Try stopping and restarting the debugger

### Debugger won't attach
- Check if the port (9229) is already in use
- Ensure Node process is still running
- Try using `--inspect-brk` instead of `--inspect`

### Tests not debugging
- Make sure you're using the correct debug configuration
- Check that Jest is running in watch mode
- Verify test file paths are correct
