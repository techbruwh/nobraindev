---
applyTo: '**'
---
# UI Component Guide

## Tech Stack 
- **React** + **Vite**
- **Tailwind CSS** with CSS variable-based theme tokens (`ui/tailwind.config.js`)
- **lucide-react** for icons
- **class-variance-authority** (`cva`) for variant definitions
- **clsx** + **tailwind-merge** via `cn()` utility (`ui/src/lib/utils.js`)
- **Tauri** for backend integration (`@tauri-apps/api`)

## Component File Structure
- **Primitives:** `ui/src/components/ui/`
  - `button.jsx`, `input.jsx`, `badge.jsx`, `card.jsx`, `textarea.jsx`
- **Main app:** `ui/src/App.jsx`
- **Utilities:** `ui/src/lib/utils.js` (contains `cn()` helper)

## Code Patterns

### 1. Component Signature
All components use `React.forwardRef` and spread `...props`:
```jsx
const Component = React.forwardRef(({ className, variant, ...props }, ref) => {
  return <element className={cn(baseClasses, className)} ref={ref} {...props} />
})
Component.displayName = "Component"
```

### 2. Styling with `cn()` helper
- Import: `import { cn } from "@/lib/utils"`
- Usage: `className={cn("base-classes", className)}`
- The `cn()` function merges `clsx` and `twMerge` for clean Tailwind class composition.

### 3. Variants with `cva`
Components with multiple styles use `class-variance-authority`:
```jsx
import { cva } from "class-variance-authority"

const buttonVariants = cva(
  "base classes",
  {
    variants: {
      variant: { default: "...", destructive: "...", outline: "..." },
      size: { default: "...", sm: "...", lg: "..." }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

// In component:
className={cn(buttonVariants({ variant, size, className }))}
```

### 4. Component Exports
Named exports with the variant helper:
```jsx
export { Button, buttonVariants }
```

### 5. Import Alias
All internal imports use the `@/` alias:
```jsx
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

## Tailwind Theme (from `ui/tailwind.config.js`)
- **Dark mode:** `class`-based (add `dark` class to root)
- **Colors:** CSS variables (`hsl(var(--primary))`) mapped to semantic tokens:
  - `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`
- **Border radius:** CSS variable `--radius` with computed `lg`, `md`, `sm`
- Actual CSS variables defined in `ui/src/index.css`

## State & Data Flow (from `ui/src/App.jsx`)
- Component state: `useState` / `useEffect`
- Tauri commands called via `invoke` from `@tauri-apps/api/core`:
  - `get_all_snippets`, `create_snippet`, `update_snippet`, `delete_snippet`, `semantic_search`, `get_model_status`, `load_model`
- Icons from `lucide-react`: `import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles } from 'lucide-react'`

## Example: Button Component (actual code)
```jsx
import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Usage in `ui/src/App.jsx`
```jsx
import { Button } from '@/components/ui/button'

<Button onClick={handleNewSnippet}>
  <Plus className="h-4 w-4 mr-2" />
  New Snippet
</Button>

<Button variant="outline" onClick={() => setIsEditing(false)}>
  <X className="h-4 w-4 mr-2" />
  Cancel
</Button>

<Button variant="destructive" onClick={() => handleDeleteSnippet(snippet)}>
  <Trash2 className="h-4 w-4 mr-2" />
  Delete
</Button>
```
