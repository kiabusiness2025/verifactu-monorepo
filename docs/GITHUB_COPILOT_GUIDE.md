# GitHub Copilot Guide

## 🤖 What is GitHub Copilot?

GitHub Copilot is an AI-powered coding assistant that helps you write code faster. It suggests code completions, functions, tests, and documentation.

**Key Features:**
- ✅ Code completion (inline suggestions)
- ✅ Full function generation
- ✅ Test generation
- ✅ Documentation generation
- ✅ Code explanation
- ✅ Chat for assistance

---

## 🚀 Quick Start

### Installation

The extension is already in `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "GitHub.copilot"
  ]
}
```

**Install:**
1. VS Code → Extensions
2. Search "GitHub Copilot"
3. Click "Install"
4. Sign in with GitHub account

### First Use

```typescript
// 1. Type a comment describing what you want
// Convert string to number

// 2. Copilot suggests code
const stringToNumber = (str: string): number => {
  return parseInt(str, 10);
};

// 3. Press Tab to accept, Escape to reject
```

---

## 💻 Code Completion

### Inline Suggestions

Start typing and Copilot suggests completions:

```typescript
// Copilot suggests function body
function calculateTotal(items: Item[]): number {
  // [Copilot completes this]
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Accept Suggestions

- **Tab** - Accept entire suggestion
- **Ctrl+→** - Accept word by word
- **Escape** - Reject
- **Alt+[** - Previous suggestion
- **Alt+]** - Next suggestion

### Multiple Suggestions

Press **Ctrl+Enter** to see all suggestions:

```
┌─────────────────────────────────┐
│ Copilot: 5 suggestions          │
├─────────────────────────────────┤
│ 1. return items.reduce(...)     │
│ 2. let total = 0;               │
│ 3. for (const item of items)    │
│ 4. return sum(items)            │
│ 5. return items.length          │
└─────────────────────────────────┘
```

---

## 📝 Common Use Cases

### Generate Function Implementation

```typescript
// Type function signature
function formatDate(date: Date): string {
  // [Copilot generates implementation]
  const months = ['Jan', 'Feb', ...];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
```

### Generate Test Cases

```typescript
// Type test comment
// Test: calculateTotal should sum all item prices

it('should sum all item prices', () => {
  // [Copilot generates test]
  const items = [
    { name: 'Item 1', price: 10 },
    { name: 'Item 2', price: 20 },
  ];
  expect(calculateTotal(items)).toBe(30);
});
```

### Generate API Handler

```typescript
// POST /api/users - Create new user
export async function POST(request: Request) {
  // [Copilot generates handler]
  const body = await request.json();
  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
    },
  });
  return Response.json(user);
}
```

### Generate Utility Function

```typescript
// Format currency value
function formatCurrency(value: number): string {
  // [Copilot generates]
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
```

---

## 🤖 Copilot Chat

Ask Copilot questions directly (Ctrl+Shift+L):

### Ask for Explanation

**You:** "Explain this function"
```typescript
const items = data.map(x => ({...x, id: uuid()}));
```

**Copilot:** "Maps over data array, spreads each item's properties, and adds a unique id using uuid()"

### Ask for Help

**You:** "How do I format a date in JavaScript?"

**Copilot:** Provides several approaches with code examples

### Ask for Refactoring

**You:** "How can I simplify this code?"
```typescript
let total = 0;
for (let i = 0; i < items.length; i++) {
  total += items[i].price;
}
```

**Copilot:** "Use reduce: `items.reduce((sum, item) => sum + item.price, 0)`"

### Ask to Generate Code

**You:** "Generate a function to validate email"

**Copilot:**
```typescript
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

---

## 🎯 Best Practices

### ✓ Do's
- ✓ Use clear, descriptive comments
- ✓ Review generated code carefully
- ✓ Ask for explanations if unsure
- ✓ Use for repetitive patterns
- ✓ Generate tests alongside code
- ✓ Ask for edge case handling

### ✗ Don'ts
- ✗ Don't blindly accept all suggestions
- ✗ Don't use for security-sensitive code without review
- ✗ Don't rely entirely on Copilot (you're still responsible)
- ✗ Don't use for complex business logic without understanding
- ✗ Don't commit code you haven't reviewed

---

## 🧠 Writing Good Prompts

### Bad Prompts
```typescript
// function
const x = (a, b) => a + b;
```

Copilot: Might not understand intent

### Good Prompts
```typescript
// Add two numbers together and return the result
const add = (a: number, b: number): number => a + b;
```

Copilot: Clear intent → better suggestion

### Better Prompts
```typescript
// Calculate total price of items including tax
// Tax rate is 8% (0.08)
function calculateTotal(items: Item[]): number {
  // [Copilot generates accurate implementation]
}
```

---

## 🔧 Configuration

### Settings

**VS Code Settings (Ctrl+,):**

```json
// Enable/disable Copilot
"github.copilot.enable": true,

// Auto-accept suggestions
"github.copilot.autocompleteSingleLineCompletion.enabled": true,

// Chat settings
"github.copilot.chat.enabled": true,
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Tab | Accept suggestion |
| Escape | Reject suggestion |
| Ctrl+Enter | Show multiple suggestions |
| Alt+[ | Previous suggestion |
| Alt+] | Next suggestion |
| Ctrl+Shift+L | Open Copilot Chat |

---

## 💡 Real-World Examples

### Example 1: API Endpoint

**You type:**
```typescript
// POST /api/admin/emails/send - Send email via Resend
export async function POST(request: Request) {
  const { to, subject, body, cc, bcc } = await request.json();
  // [Copilot suggests complete implementation]
}
```

**Copilot generates:**
```typescript
export async function POST(request: Request) {
  try {
    const { to, subject, body, cc, bcc } = await request.json();
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@verifactu.business',
        to,
        subject,
        html: body,
        cc,
        bcc,
      }),
    });
    
    return Response.json(await response.json());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Example 2: Component with Tailwind

**You type:**
```typescript
// Admin email card component showing sender, subject, timestamp
export function EmailCard({ email }: { email: AdminEmail }) {
  return (
    // [Copilot suggests Tailwind-styled component]
  );
}
```

**Copilot generates:**
```typescript
export function EmailCard({ email }: { email: AdminEmail }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{email.from}</h3>
          <p className="text-sm text-gray-600 mt-1">{email.subject}</p>
        </div>
        <time className="text-xs text-gray-500">
          {new Date(email.createdAt).toLocaleDateString()}
        </time>
      </div>
    </div>
  );
}
```

### Example 3: Test Generation

**You type:**
```typescript
// Test: Email validation should reject invalid formats
it('should reject invalid email formats', () => {
  // [Copilot generates comprehensive test]
});
```

**Copilot generates:**
```typescript
it('should reject invalid email formats', () => {
  expect(validateEmail('invalid')).toBe(false);
  expect(validateEmail('user@')).toBe(false);
  expect(validateEmail('@domain.com')).toBe(false);
  expect(validateEmail('user@domain')).toBe(false);
});
```

---

## 🐛 Troubleshooting

### Copilot Not Suggesting

**Check:**
1. Is Copilot enabled? (GitHub icon in VS Code)
2. Are you logged in? (Check GitHub account)
3. Type clear comment before code
4. Wait 1-2 seconds for suggestions to appear

**Fix:**
```bash
# Restart VS Code
Ctrl+Shift+P → "Developer: Reload Window"
```

### Suggestions Not Relevant

**Reason:** Unclear comments or bad context

**Solution:**
- Write more specific comments
- Include types and parameters
- Add expected behavior

### Authorization Failed

**Check:**
1. GitHub account is valid
2. Copilot subscription is active (might be free with GitHub account)
3. Try signing out and back in

```bash
Ctrl+Shift+P → "GitHub Copilot: Sign Out"
# Then sign back in
```

---

## 📊 Statistics & Benefits

### Code Generation Speed
- Average function: 5 seconds (vs 1-2 minutes manually)
- Test generation: 10 seconds (vs 3-5 minutes manually)
- Boilerplate code: 90% reduction in typing

### Quality Impact
- Consistent code style
- Better error handling suggestions
- Security-aware suggestions
- Type-safe implementations

### Team Productivity
- Faster code reviews (less boilerplate)
- More time for logic/architecture
- Less context-switching
- Better developer satisfaction

---

## ⚖️ Legal & Ethical

### Important Notes
- Review all Copilot suggestions before committing
- Don't use for security-critical code without review
- Be aware of license implications
- Copilot learns from public code (your code might be used to train models)
- Don't commit Copilot-generated credentials or secrets

### Best Practices
- ✓ Always review generated code
- ✓ Test thoroughly
- ✓ Understand what the code does
- ✓ Add comments explaining logic
- ✓ Be responsible with sensitive data

---

## 📚 Related Resources

- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [Copilot Best Practices](https://github.blog/2023-06-20-github-copilot-enterprise-is-coming/)
- [AI-Powered Code](https://github.com/features/copilot)

---

Last updated: January 2026
