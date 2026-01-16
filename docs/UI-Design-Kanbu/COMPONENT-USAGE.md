# Kanbu Component Usage Guide

**Versie:** 2.0.0
**Laatst bijgewerkt:** 2026-01-16
**Status:** Design System v2.0.0 Voltooid

---

## Inhoud

1. [Button](#button)
2. [Badge](#badge)
3. [Card](#card)
4. [Input & Form Elements](#input--form-elements)
5. [Dialog / Modal](#dialog--modal)
6. [Dropdown Menu](#dropdown-menu)
7. [Tooltip](#tooltip)
8. [Toast Notifications](#toast-notifications)
9. [Tables](#tables)
10. [Accessibility Guidelines](#accessibility-guidelines)

---

## Button

### Import

```tsx
import { Button } from '@/components/ui/button'
```

### Variants

| Variant | Use Case | Example |
|---------|----------|---------|
| `default` | Primary actions | Save, Submit, Create |
| `secondary` | Secondary actions | Cancel, Back |
| `outline` | Less prominent actions | Filter, Sort |
| `ghost` | Minimal UI actions | Menu items, icons |
| `link` | Navigation links | Learn more, View details |
| `destructive` | Dangerous actions | Delete, Remove |
| `success` | Positive confirmations | Approve, Complete |
| `warning` | Cautionary actions | Archive, Disable |

### Basic Usage

```tsx
// Primary action
<Button>Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete Project</Button>

// Success action
<Button variant="success">Approve</Button>

// Warning action
<Button variant="warning">Archive</Button>

// Outline variant
<Button variant="outline">Filter</Button>

// Ghost variant (minimal)
<Button variant="ghost">Settings</Button>

// Link variant
<Button variant="link">Learn more</Button>
```

### Sizes

```tsx
// Small - compact interfaces
<Button size="sm">Small</Button>

// Default - standard use
<Button size="default">Default</Button>

// Large - hero sections, emphasis
<Button size="lg">Large</Button>

// Icon - icon-only buttons
<Button size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>
```

### With Icons

```tsx
// Icon before text
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>

// Icon after text
<Button>
  Next
  <ChevronRight className="ml-2 h-4 w-4" />
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Saving...
</Button>
```

### Do's and Don'ts

**Do:**
- Use `variant="destructive"` for delete/remove actions
- Use `variant="success"` for positive confirmations
- Provide clear, action-oriented labels ("Save" not "OK")
- Use `aria-label` for icon-only buttons
- Group related buttons together

**Don't:**
- Use custom colors: `className="bg-red-500"`
- Mix icon-only with text buttons in the same group
- Use destructive styling for non-destructive actions
- Chain multiple primary buttons together
- Use vague labels like "Submit" when "Create Project" is clearer

### Accessibility

```tsx
// Icon-only buttons MUST have aria-label
<Button size="icon" aria-label="Delete item">
  <Trash className="h-4 w-4" />
</Button>

// Disabled buttons should explain why
<Button disabled title="You need permissions to edit">
  Edit
</Button>

// Loading states
<Button disabled aria-busy="true">
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Processing...
</Button>
```

---

## Badge

### Import

```tsx
import { Badge } from '@/components/ui/badge'
```

### Variants

| Variant | Use Case |
|---------|----------|
| `default` | Generic labels |
| `secondary` | Muted labels |
| `outline` | Bordered labels |
| `destructive` | Error states |
| `success` | Success states |
| `warning` | Warning states |
| `error` | Error states (alias) |
| `info` | Information |
| `priority-low` | Low priority |
| `priority-medium` | Medium priority |
| `priority-high` | High priority |
| `priority-urgent` | Urgent priority |

### Status Badges

```tsx
// Task/item status
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Pending Review</Badge>
```

### Priority Badges

```tsx
// Task priority
<Badge variant="priority-low">Low</Badge>
<Badge variant="priority-medium">Medium</Badge>
<Badge variant="priority-high">High</Badge>
<Badge variant="priority-urgent">Urgent</Badge>
```

### General Badges

```tsx
// Labels and tags
<Badge>New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="outline">v2.0.0</Badge>
```

### Do's and Don'ts

**Do:**
- Use semantic variants (success/warning/error) for status
- Use priority variants for task priorities
- Keep badge text short (1-2 words)
- Use consistent variants throughout the app

**Don't:**
- Create custom colored badges: `className="bg-purple-500"`
- Use badges for long text
- Use badges for interactive elements (use buttons instead)
- Mix different badge styles in the same context

---

## Card

### Import

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
```

### Basic Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
    <CardDescription>
      Manage your project configuration
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

### Variations

```tsx
// Compact card (no header)
<Card className="p-4">
  <p className="text-sm text-muted-foreground">Quick stat</p>
  <p className="text-2xl font-bold">1,234</p>
</Card>

// Interactive card
<Card className="cursor-pointer hover:shadow-md transition-shadow">
  <CardContent className="p-4">
    Click me
  </CardContent>
</Card>

// Card with custom padding
<Card className="p-8">
  <CardContent className="p-0">
    {/* Content without extra padding */}
  </CardContent>
</Card>
```

### Do's and Don'ts

**Do:**
- Use `Card` for grouping related content
- Use `CardHeader` for titles and descriptions
- Use `CardFooter` for actions
- Apply `shadow-sm` (already included) for subtle elevation

**Don't:**
- Nest cards within cards
- Override card background: `className="bg-gray-100"`
- Use cards for single elements
- Add excessive shadows: `className="shadow-2xl"`

---

## Input & Form Elements

### Import

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
```

### Basic Input

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>
```

### Input with Error

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    className="border-destructive focus-visible:ring-destructive"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" className="text-sm text-destructive">
    Please enter a valid email address
  </p>
</div>
```

### Textarea

```tsx
<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter a description..."
    rows={4}
  />
</div>
```

### Checkbox

```tsx
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms" className="text-sm">
    I agree to the terms and conditions
  </Label>
</div>
```

### Switch

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="notifications">Enable notifications</Label>
  <Switch id="notifications" />
</div>
```

### Do's and Don'ts

**Do:**
- Always pair inputs with labels
- Use `id` and `htmlFor` for accessibility
- Show clear error states with `aria-invalid`
- Use placeholders as hints, not labels

**Don't:**
- Use placeholder as the only label
- Override input colors: `className="bg-blue-50"`
- Hide labels (use `sr-only` if needed visually)
- Use non-semantic error indicators

### Accessibility

```tsx
// Required field
<Label htmlFor="name">
  Name <span className="text-destructive">*</span>
</Label>
<Input id="name" required aria-required="true" />

// Disabled field with explanation
<Input
  disabled
  title="This field is auto-calculated"
  aria-disabled="true"
/>

// Error state
<Input
  aria-invalid="true"
  aria-describedby="error-message"
/>
<p id="error-message" role="alert" className="text-destructive">
  This field is required
</p>
```

---

## Dialog / Modal

### Import

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
```

### Basic Usage

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Dialog body content */}
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Confirmation Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete
        the project and all associated data.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive">Delete Project</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Do's and Don'ts

**Do:**
- Always include `DialogTitle` for accessibility
- Use `DialogDescription` to explain the purpose
- Put primary action on the right in `DialogFooter`
- Use `DialogClose` for cancel buttons

**Don't:**
- Create dialogs without titles
- Nest dialogs within dialogs
- Override overlay color: `className="bg-black/80"`
- Use dialogs for simple confirmations (consider toast)

---

## Dropdown Menu

### Import

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
```

### Basic Usage

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Copy className="mr-2 h-4 w-4" />
      Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Do's and Don'ts

**Do:**
- Use consistent icon sizes (`h-4 w-4`)
- Group related items with `DropdownMenuSeparator`
- Use `DropdownMenuLabel` for group headings
- Put destructive actions at the bottom

**Don't:**
- Override menu background colors
- Create deeply nested menus
- Use long labels in menu items
- Mix icon and non-icon items inconsistently

---

## Tooltip

### Import

```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
```

### Basic Usage

```tsx
// Wrap app with TooltipProvider once
<TooltipProvider>
  <App />
</TooltipProvider>

// Individual tooltips
<Tooltip>
  <TooltipTrigger asChild>
    <Button size="icon" aria-label="Settings">
      <Settings className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Settings</p>
  </TooltipContent>
</Tooltip>
```

### With Delay

```tsx
<Tooltip delayDuration={300}>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <Info className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>More information about this feature</p>
  </TooltipContent>
</Tooltip>
```

### Do's and Don'ts

**Do:**
- Use tooltips for supplementary information
- Keep tooltip text short (1 line preferred)
- Use on icon-only buttons
- Wrap app with `TooltipProvider`

**Don't:**
- Put essential information in tooltips only
- Use tooltips on touch devices (not accessible)
- Put interactive elements in tooltips
- Override tooltip colors

---

## Toast Notifications

### Import

```tsx
import { toast } from 'sonner'
```

### Basic Usage

```tsx
// Success
toast.success('Changes saved successfully')

// Error
toast.error('Failed to save changes')

// Warning
toast.warning('Your session will expire soon')

// Info
toast.info('New updates available')

// Custom
toast('Hello World', {
  description: 'This is a custom toast',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo clicked'),
  },
})
```

### With Actions

```tsx
toast.success('Item deleted', {
  action: {
    label: 'Undo',
    onClick: () => restoreItem(),
  },
})
```

### Loading State

```tsx
const id = toast.loading('Saving...')
// Later...
toast.success('Saved!', { id })
// Or on error
toast.error('Failed to save', { id })
```

### Do's and Don'ts

**Do:**
- Use appropriate status (success/error/warning/info)
- Keep messages concise
- Provide undo actions when appropriate
- Use loading toasts for async operations

**Don't:**
- Use toasts for critical errors (use dialogs)
- Show multiple toasts at once
- Use toasts for form validation errors
- Override toast styling

---

## Tables

### Basic Structure

```tsx
<div className="rounded-lg border">
  <table className="w-full">
    <thead className="bg-surface-2">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
          Name
        </th>
        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
          Status
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-t hover:bg-muted/50 transition-colors">
        <td className="px-4 py-3 text-sm">Project Alpha</td>
        <td className="px-4 py-3">
          <Badge variant="success">Active</Badge>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Do's and Don'ts

**Do:**
- Use `bg-surface-2` for header background
- Use `hover:bg-muted/50` for row hover
- Use semantic badges for status columns
- Align text consistently (left for text, right for numbers)

**Don't:**
- Override table colors: `className="bg-gray-100"`
- Use custom hover colors
- Create tables without headers
- Use borders between every cell (use row borders)

---

## Accessibility Guidelines

### General Principles

1. **Keyboard Navigation**
   - All interactive elements must be focusable
   - Use logical tab order
   - Provide visible focus indicators

2. **Screen Readers**
   - Use semantic HTML elements
   - Provide labels for all form elements
   - Use `aria-label` for icon-only buttons

3. **Color Contrast**
   - Design tokens ensure WCAG AA compliance
   - Never rely on color alone for meaning
   - Use text or icons alongside color indicators

4. **Motion**
   - Respect `prefers-reduced-motion`
   - Provide pause/stop controls for animations

### Common Patterns

```tsx
// Skip link (at top of page)
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

// Screen reader only text
<span className="sr-only">Loading...</span>

// Live region for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Announce route changes
useEffect(() => {
  document.title = `${pageTitle} | Kanbu`
}, [pageTitle])
```

### Focus Management

```tsx
// Auto-focus first input in dialog
<DialogContent onOpenAutoFocus={(e) => {
  e.preventDefault()
  inputRef.current?.focus()
}}>

// Return focus after closing
<Dialog onOpenChange={(open) => {
  if (!open) triggerRef.current?.focus()
}}>
```

---

## Related Documentation

- [Token Reference Guide](./TOKEN-REFERENCE.md) - Complete design token documentation
- [Migration Guide](./MIGRATION-GUIDE.md) - Migrating to design tokens
- [Design System Roadmap](./06-DESIGN-SYSTEM-ROADMAP.md) - Implementation history

---

*Document Version: 2.0.0*
*Last Updated: 2026-01-16*
