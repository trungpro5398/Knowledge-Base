export interface PageTemplate {
    id: string;
    name: string;
    icon: string;
    description: string;
    content: string;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
    {
        id: "blank",
        name: "Blank Page",
        icon: "📄",
        description: "Start with an empty page",
        content: "",
    },
    {
        id: "howto",
        name: "How-to Guide",
        icon: "📝",
        description: "Step-by-step instructions",
        content: `## Goal

Describe what this guide helps users achieve.

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Steps

### Step 1: Title

Description of what to do.

### Step 2: Title

Description of what to do.

## Tips

- Helpful tip 1
- Helpful tip 2

## Related

- [Related Page 1](/kb/...)
- [Related Page 2](/kb/...)
`,
    },
    {
        id: "troubleshooting",
        name: "Troubleshooting",
        icon: "🔧",
        description: "Problem and solution format",
        content: `## Symptoms

Describe the problem or error message users may see.

## Cause

Explain why this problem occurs.

## Solution

### Option 1: Quick Fix

Steps to resolve quickly.

### Option 2: Alternative Approach

Alternative resolution steps.

## Prevention

How to prevent this issue in the future.
`,
    },
    {
        id: "process",
        name: "Process Document",
        icon: "📋",
        description: "Standard operating procedure",
        content: `## Overview

Brief description of this process.

## Scope

Who should follow this process and when.

## Responsibilities

| Role | Responsibility |
|------|---------------|
| Role 1 | What they do |
| Role 2 | What they do |

## Process Steps

1. **Step 1**: Description
2. **Step 2**: Description
3. **Step 3**: Description

## Exceptions

How to handle special cases.

## Related Documents

- [Related Process 1](/kb/...)
`,
    },
    {
        id: "meeting-notes",
        name: "Meeting Notes",
        icon: "📅",
        description: "Record meeting discussions",
        content: `## Meeting Details

- **Date**: YYYY-MM-DD
- **Attendees**: @person1, @person2
- **Facilitator**: @person

## Agenda

1. Topic 1
2. Topic 2
3. Topic 3

## Discussion

### Topic 1

Key points discussed.

### Topic 2

Key points discussed.

## Action Items

- [ ] Action item 1 - @assignee - Due date
- [ ] Action item 2 - @assignee - Due date

## Next Steps

What happens next.
`,
    },
];

export function getTemplateById(id: string): PageTemplate | undefined {
    return PAGE_TEMPLATES.find((t) => t.id === id);
}
