import { FileType, FileSystemNode } from '../types';

const WELCOME_CONTENT = `# Welcome to Obsidian Reader

This is a **mocked vault** demonstrating the reader's capabilities.

## Wiki Links Demo

- Link to another note: [[Projects/Alpha/Specs]] (Standard link)
- Link with alias: [[Projects/Alpha/Specs|Project Alpha Specs]]
- Link by filename only: [[Specs]] (Auto-resolve)

## Image Attachment Demo

We have an attachment folder named \`FigureBed 🌄\`. It is hidden in the sidebar if configured in Admin Console.

Below is an image embedded using Wiki Link syntax \`![[demo-image.png]]\`:

![[demo-image.png]]

`;

const PROJECT_SPECS_CONTENT = `# Project Alpha Specs

## Overview
Project Alpha aims to revolutionize the way we take notes.

## Requirements
1. **Fast**: Must load in under 100ms.
2. **Offline**: Must work without internet.
3. **Secure**: Local-first architecture.

| Feature | Priority | Status |
| :--- | :--- | :--- |
| File System Access | High | Done |
| Markdown Parser | High | Done |
| Search | Medium | Pending |
`;

const MEETING_NOTES_CONTENT = `# Weekly Sync - 2023-10-27

**Attendees**: Alice, Bob, Charlie

## Agenda
- Review sprint progress
- Discuss deployment strategy

## Notes
- Bob suggested using a static manifest file for the hosted version.
- Alice is working on the mobile responsive layout.
`;

const MARKDOWN_DEMO_CONTENT = `# Markdown Capabilities

Here is a showcase of supported syntax.

### Code

\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

### Quotes

> "The best way to predict the future is to invent it."
> — Alan Kay

### Lists

- Item 1
- Item 2
  - Nested Item 2.1
  - Nested Item 2.2

1. First
2. Second
3. Third
`;

// Mock File Content Map
const MOCK_FILES: Record<string, string> = {
  'Welcome.md': WELCOME_CONTENT,
  'Projects/Alpha/Specs.md': PROJECT_SPECS_CONTENT,
  'Work/Meetings/2023-10-27.md': MEETING_NOTES_CONTENT,
  'Tech/Markdown Demo.md': MARKDOWN_DEMO_CONTENT,
  // Mock image content (Base64 placeholder)
  'FigureBed 🌄/demo-image.png': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgNDAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2UzZjJmZCIgLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9ImFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSIjMDA3OTZiIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZXRhZGF0YSBJbWFnZSAoTW9jayk8L3RleHQ+PC9zdmc+'
};

export const getMockRoot = (): FileSystemNode => {
  return {
    name: 'Demo Vault',
    kind: FileType.DIRECTORY,
    path: '',
    isOpen: true,
    children: [
      {
        name: 'Welcome.md',
        kind: FileType.FILE,
        path: 'Welcome.md',
      },
      {
        name: 'Projects',
        kind: FileType.DIRECTORY,
        path: 'Projects',
        children: [
          {
            name: 'Alpha',
            kind: FileType.DIRECTORY,
            path: 'Projects/Alpha',
            children: [
              {
                name: 'Specs.md',
                kind: FileType.FILE,
                path: 'Projects/Alpha/Specs.md',
              }
            ]
          }
        ]
      },
      {
        name: 'Work',
        kind: FileType.DIRECTORY,
        path: 'Work',
        children: [
          {
            name: 'Meetings',
            kind: FileType.DIRECTORY,
            path: 'Work/Meetings',
            children: [
               {
                 name: '2023-10-27.md',
                 kind: FileType.FILE,
                 path: 'Work/Meetings/2023-10-27.md',
               }
            ]
          }
        ]
      },
      {
        name: 'Tech',
        kind: FileType.DIRECTORY,
        path: 'Tech',
        children: [
          {
             name: 'Markdown Demo.md',
             kind: FileType.FILE,
             path: 'Tech/Markdown Demo.md',
          }
        ]
      },
      {
        name: 'FigureBed 🌄',
        kind: FileType.DIRECTORY,
        path: 'FigureBed 🌄',
        children: [
          {
            name: 'demo-image.png',
            kind: FileType.FILE,
            path: 'FigureBed 🌄/demo-image.png'
          }
        ]
      }
    ]
  };
};

export const getMockFileContent = (path: string): string => {
  return MOCK_FILES[path] || '# 404 Not Found\nFile content missing in mock data.';
};
