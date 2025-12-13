---
title: Syntax Highlighting Demo
tags: [code, demo]
---

# Markdown Capabilities

Here is a showcase of supported syntax.

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
}

const greeting = "Hello, World!";
console.log(greeting);

function getUser(id: number): User {
  return { id, name: "Admin" };
}
```

### Python

```python
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)

print(factorial(5))
```

### JSON

```json
{
  "name": "Obsidian Reader",
  "version": "1.0.0",
  "features": ["Markdown", "WikiLinks"]
}
```

### Quotes

> "The best way to predict the future is to invent it."
> — Alan Kay
