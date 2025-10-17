# Cogniflow

<div align="center">

<img src="/banner/banner.png" alt="Cogniflow Banner" width="420" />

**AI-Powered Markdown Study Notebook**

[![Angular](https://img.shields.io/badge/Angular-20.3-DD0031?style=flat&logo=angular)](https://angular.io/)
[![Firebase](https://img.shields.io/badge/Firebase-12.4-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A modern, intelligent note-taking platform that combines markdown writing, folder organization, wiki-style linking, and AI-assisted features to enhance your learning and productivity.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Screenshots](#-screenshots)

</div>

---

## Overview

Cogniflow is an AI-powered markdown-based note-taking web application designed to help students, researchers, and knowledge workers organize ideas, track learning progress, and create interconnected knowledge networks. Built with Angular 20, Firebase, and modern web technologies, it provides a seamless, distraction-free environment for capturing and reviewing information.

### Key Highlights

* **Markdown Editor** with live preview and syntax highlighting enhancements
* **Hierarchical Folder System** with drag-and-drop organization
* **Wiki-Style Linking** with `[[Note Title]]` and `[[/path/to/note]]` syntax
* **Tag Management** with chip-based UI for easy categorization
* **Global Search** (Ctrl+K) for instant note discovery
* **Multiple Views** - Grid and List layouts with keyboard navigation
* **Dual Themes** - Cyber Glow (dark) and Electric Sky (light)
* **Real-time Sync** via Firebase Firestore with offline support
* **Secure Authentication** with Firebase Auth
* **Modern UI** built with TailwindCSS 4

---

## Features

### Note Management

- **Markdown Editor**
  - Split view (editor + live preview)
  - Editor-only and preview-only modes
  - Live markdown rendering with syntax highlighting
  - Code blocks with language labels and copy buttons
  - Task lists with checkboxes
  - Wiki-style internal linking
  - Auto-save functionality
  - Word and character count

- **Rich Note Organization**
  - Hierarchical folder structure
  - Drag-and-drop notes and folders
  - Folder breadcrumb navigation
  - Note metadata (created, modified, word count)
  - Content preview in cards (first 2-3 lines)
  - Tag system for categorization

- **Multiple View Modes**
  - Grid view (3-column responsive cards)
  - List view (horizontal layout with metadata)
  - Sorting options: Last Modified, Created, Title, Word Count
  - Ascending/descending order toggle

### Advanced Linking

- **Wiki-Style Links**
  - Title-based: `[[Note Name]]`
  - Path-based: `[[/folder/subfolder/note]]`
  - Automatic link resolution
  - Click to navigate between notes
  - Copy note links from context menu

- **Backlinks**
  - Tracks notes that link to current note
  - Displays linked notes in sidebar
  - Real-time link updates

### User Interface

- **Dual Theme System**
  - **Cyber Glow** (dark): Black, navy, cyan accents
  - **Electric Sky** (light): White, soft blue, cyan accents
  - Smooth theme transitions
  - Persistent theme preference

- **Responsive Design**
  - Mobile-friendly layouts
  - Collapsible sidebar
  - Touch-optimized interactions
  - Adaptive grid columns

- **Keyboard Shortcuts**
  - `Ctrl/Cmd + K`: Global search
  - `Ctrl/Cmd + N`: New note
  - `Arrow keys`: Navigate notes
  - `Enter`: Open selected note
  - `Delete`: Delete selected note
  - `Ctrl/Cmd + S`: Save note

### Task Management

- **Task Lists**
  - Create tasks with priorities and due dates
  - Link tasks to specific notes
  - Filter by status, priority, and tags
  - Task completion tracking
  - Markdown task list integration

### Search & Discovery

- **Global Search Modal** (Ctrl+K)
  - Search across all notes
  - Real-time results
  - Keyboard navigation
  - Jump to notes instantly

- **Advanced Filtering**
  - Filter by tags
  - Filter by folder
  - Sort by multiple criteria
  - Date range filtering

### File Tree

- **Sidebar Organization**
  - Expandable folder tree
  - Drag-and-drop reorganization
  - Context menu actions
  - Create/rename/delete folders
  - Visual folder hierarchy
  - Quick folder navigation

### Authentication & Security

- **Firebase Authentication**
  - Email/password login
  - User registration
  - Protected routes
  - Session management
  - Secure logout

### Cloud Sync

- **Real-time Synchronization**
  - Firestore backend
  - Offline support with local cache
  - Multi-tab synchronization
  - Automatic conflict resolution
  - Data persistence

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Angular 20 | Modern, signal-based reactive framework |
| **Language** | TypeScript 5.9 | Type-safe development |
| **Styling** | TailwindCSS 4 | Utility-first CSS framework |
| **Database** | Firebase Firestore | NoSQL cloud database with real-time sync |
| **Authentication** | Firebase Auth | Secure user authentication |
| **Hosting** | Firebase Hosting | Fast, secure web hosting |
| **Markdown** | Marked.js | Markdown parsing and rendering |
| **Syntax Highlighting** | Prism.js | Code syntax highlighting |
| **Search** | Fuse.js | Fuzzy search library |
| **State Management** | Angular Signals | Reactive state management |
| **Drag & Drop** | Angular CDK | Native drag-and-drop functionality |
| **HTTP Client** | Angular HttpClient | API communication |

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lucifron28/Cogniflow.git
   cd Cogniflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Create `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: 'YOUR_API_KEY',
       authDomain: 'YOUR_PROJECT.firebaseapp.com',
       projectId: 'YOUR_PROJECT_ID',
       storageBucket: 'YOUR_PROJECT.appspot.com',
       messagingSenderId: 'YOUR_MESSAGING_ID',
       appId: 'YOUR_APP_ID'
     },
     geminiApiKey: 'YOUR_GEMINI_API_KEY' // For future AI features
   };
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:4200
   ```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Create a Firestore database
5. Copy your config to `environment.ts`

---

## Project Structure

```
cogniflow/
├── src/
│   ├── app/
│   │   ├── core/                      # Core services and models
│   │   │   ├── guards/                # Route guards
│   │   │   ├── models/                # TypeScript interfaces
│   │   │   ├── resolvers/             # Route resolvers
│   │   │   └── services/              # Core services
│   │   ├── features/                  # Feature modules
│   │   │   ├── auth/                  # Authentication
│   │   │   ├── notes/                 # Notes feature
│   │   │   ├── analytics/             # Analytics
│   │   │   └── search/                # Search
│   │   ├── pages/                     # Additional pages
│   │   │   └── tasks/                 # Task management
│   │   ├── services/                  # Business logic
│   │   ├── shared/                    # Shared components
│   │   ├── app.ts                     # Root component
│   │   ├── app.config.ts              # App configuration
│   │   └── app.routes.ts              # Routes
│   ├── environments/                  # Environment configs
│   ├── index.html                     # HTML entry
│   └── styles.css                     # Global styles
├── public/                            # Static assets
└── angular.json                       # Angular config
```

---

## Available Scripts

```bash
npm start          # Start development server (port 4200)
npm run build      # Build for production
npm run watch      # Build with watch mode
npm test           # Run unit tests
```

---

## Themes

### Cyber Glow (Dark Theme)
- Background: Black (#000000), Dark Navy (#001424)
- Accent: Cyan (#00f2fe)
- Text: Light gray (#e2e8f0)
- Cards: Semi-transparent with glow effects

### Electric Sky (Light Theme)
- Background: White (#ffffff), Light Blue (#e0f4ff)
- Accent: Cyan (#00d4ff)
- Text: Dark gray (#1e293b)
- Cards: Clean, minimalist design

---

## Routes

| Path | Component | Protected | Description |
|------|-----------|-----------|-------------|
| `/` | Redirect | - | Redirects to `/notes` |
| `/auth` | AuthComponent | No | Login/signup page |
| `/notes` | NotesComponent | Yes | All notes view |
| `/notes/folder/:folderId` | NotesComponent | Yes | Folder-specific view |
| `/notes/new` | NoteEditorComponent | Yes | Create new note |
| `/notes/:id` | NoteEditorComponent | Yes | Edit existing note |
| `/tasks` | TasksComponent | Yes | Task management |
| `/analytics` | AnalyticsComponent | Yes | Analytics dashboard |

---

## Roadmap

### Completed Features
- [x] Markdown editor with live preview
- [x] Folder organization with drag-and-drop
- [x] Wiki-style linking system
- [x] Tag management
- [x] Global search (Ctrl+K)
- [x] Grid/List views
- [x] Keyboard shortcuts
- [x] Dual theme system
- [x] Firebase authentication
- [x] Real-time sync
- [x] Code block enhancements
- [x] Task management

### In Progress
- [ ] Filtering sidebar (tags, dates)
- [ ] Bulk selection mode
- [ ] Bulk actions (delete, move, tag)

### Planned Features
- [ ] Template system
- [ ] Version history
- [ ] Export options (PDF, HTML)
- [ ] Tag manager page
- [ ] Statistics dashboard
- [ ] PWA with offline support
- [ ] AI-powered features (Gemini integration)
  - Smart summaries
  - Concept explanations
  - Question generation
- [ ] Collaboration features
- [ ] Mobile apps

See [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) for detailed phase breakdown.

---

## Database Schema

### Notes Collection
```typescript
interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  folderId: string | null;
  userId: string;
  linkedNotes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Folders Collection
```typescript
interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Tasks Collection
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: Timestamp | null;
  tags: string[];
  linkedNoteId: string | null;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Use Cases

### For Students
- Take lecture notes in markdown
- Create study guides with wiki links
- Track assignments as tasks
- Organize notes by subject folders
- Review with preview mode

### For Researchers
- Document research findings
- Link related concepts
- Tag papers and references
- Export to various formats
- Build knowledge networks

### For Developers
- Document code snippets
- Create technical wikis
- Link project documentation
- Track development tasks
- Share knowledge with team

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Author

**Ron**

- GitHub: [@lucifron28](https://github.com/lucifron28)
- Project: [Cogniflow](https://github.com/lucifron28/Cogniflow)

---

## Acknowledgments

- [Angular](https://angular.io/) - Modern web framework
- [Firebase](https://firebase.google.com/) - Backend platform
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Marked.js](https://marked.js.org/) - Markdown parser
- [Prism.js](https://prismjs.com/) - Syntax highlighter
- [Angular Fire](https://github.com/angular/angularfire) - Firebase integration

---

<div align="center">

**Made with love and coffee by Ron**

[Back to top](#cogniflow)

</div>

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example environment files
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.prod.ts

# Edit the files and add your actual API keys
# These files are .gitignored and won't be committed
```

3. Run the development server:
```bash
npm start
```

4. Open your browser to `http://localhost:4200`

## Tech Stack

- **Angular 20** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS
- **Firebase** - Backend (Firestore, Auth, Hosting) - *To be configured*
- **Gemini API** - AI features - *To be integrated*
- **Akita** - State management - *To be integrated*
- **ngx-markdown** - Markdown rendering - *To be integrated*
- **ng2-charts** - Analytics visualizations - *To be integrated*
- **fuse.js** - Fuzzy search - *To be integrated*

## Project Structure

```
cogniflow/
├── src/
│   ├── app/
│   │   ├── core/                           # Core services, models, and utilities
│   │   │   ├── models/                     # TypeScript interfaces and types
│   │   │   │   ├── note.model.ts           # Note data structure
│   │   │   │   ├── user.model.ts           # User data structure
│   │   │   │   └── analytics.model.ts      # Study tracking data structure
│   │   │   ├── services/                   # Injectable services
│   │   │   │   ├── auth.service.ts         # Firebase Authentication
│   │   │   │   ├── note.service.ts         # CRUD operations for notes
│   │   │   │   ├── analytics.service.ts    # Study tracking logic
│   │   │   │   ├── ai.service.ts           # Gemini API integration
│   │   │   │   └── search.service.ts       # Fuse.js search logic
│   │   │   ├── state/                      # Akita state management
│   │   │   │   ├── note/
│   │   │   │   │   ├── note.store.ts       # Note store (placeholder)
│   │   │   │   │   └── note.query.ts       # Note query (placeholder)
│   │   │   │   └── analytics/
│   │   │   │       ├── analytics.store.ts  # Analytics store (placeholder)
│   │   │   │       └── analytics.query.ts  # Analytics query (placeholder)
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts           # Route authentication guard
│   │   │   └── interceptors/
│   │   │       └── auth.interceptor.ts     # HTTP auth interceptor
│   │   │
│   │   ├── features/                       # Feature modules (standalone components)
│   │   │   ├── notes/
│   │   │   │   ├── notes.component.ts      # Notes dashboard
│   │   │   │   ├── notes.component.html    # Notes template
│   │   │   │   └── note-editor/
│   │   │   │       ├── note-editor.component.ts
│   │   │   │       └── note-editor.component.html
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.component.ts  # Analytics dashboard
│   │   │   │   └── analytics.component.html
│   │   │   └── search/
│   │   │       ├── search.component.ts     # Search functionality
│   │   │       └── search.component.html
│   │   │
│   │   ├── shared/                         # Shared components, pipes, directives
│   │   │   ├── components/
│   │   │   │   └── note-card/
│   │   │   │       ├── note-card.component.ts
│   │   │   │       └── note-card.component.html
│   │   │   ├── pipes/
│   │   │   │   └── markdown.pipe.ts        # Markdown transform pipe
│   │   │   └── directives/
│   │   │       └── auto-focus.directive.ts # Auto-focus directive
│   │   │
│   │   ├── app.component.html              # Root component template
│   │   ├── app.ts                          # Root component
│   │   ├── app.config.ts                   # Application configuration
│   │   └── app.routes.ts                   # Routing configuration
│   │
│   ├── assets/                             # Static assets
│   │   ├── images/                         # Images and icons
│   │   └── data/                           # Mock data (if needed)
│   │
│   ├── environments/                       # Environment configurations
│   │   ├── environment.ts                  # Development config
│   │   └── environment.prod.ts             # Production config
│   │
│   ├── index.html                          # Main HTML file
│   ├── main.ts                             # Application entry point
│   └── styles.css                          # Global styles (Tailwind imports)
│
├── public/
│   └── favicon.ico                         # App favicon
│
├── .postcssrc.json                         # PostCSS configuration (Tailwind)
├── angular.json                            # Angular CLI configuration
├── package.json                            # Dependencies and scripts
├── tsconfig.json                           # TypeScript configuration
├── tsconfig.app.json                       # App-specific TypeScript config
├── tsconfig.spec.json                      # Test-specific TypeScript config
└── README.md                               # Project documentation
```

## File Count Summary

- **Models**: 3 files (Note, User, Analytics)
- **Services**: 5 files (Auth, Note, Analytics, AI, Search)
- **State Management**: 4 files (Note & Analytics stores/queries)
- **Guards/Interceptors**: 2 files
- **Feature Components**: 4 components (Notes, NoteEditor, Analytics, Search)
- **Shared Components**: 1 component (NoteCard)
- **Pipes/Directives**: 2 files
- **Total TypeScript Files**: ~30 files

## Current Status

✅ Project structure scaffolded  
✅ Basic routing configured (4 routes)  
✅ Tailwind CSS v4 integrated  
✅ External templates for all components  
✅ Core models and services (placeholder implementations)  
⏳ Firebase configuration pending  
⏳ Akita state management (placeholders ready)  
⏳ Feature implementations pending  

## Routes

- `/` - Redirects to `/notes`
- `/notes` - Notes dashboard
- `/notes/new` - Create new note
- `/notes/:id` - Edit existing note
- `/analytics` - Study analytics dashboard
- `/search` - Search notes

## Next Steps

1. **Configure Firebase**: Add credentials to `src/environments/environment.ts`
2. **Install Dependencies**: 
   ```bash
   npm install @datorama/akita ngx-markdown ng2-charts fuse.js
   ```
3. **Implement Services**: Add real Firebase/Firestore integration
4. **Build Features**: Implement CRUD operations, AI integration, search
5. **Add Tests**: Write unit tests for components and services

## Development Notes

- All components use **external templates** (`.html` files)
- Components are **standalone** (no NgModules)
- Using **Tailwind CSS v4** for styling
- Following **Angular 20** best practices
- State management placeholders ready for **Akita** integration

## Learn More

- [Angular Documentation](https://angular.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Akita State Management](https://opensource.salesforce.com/akita/)
- [ngx-markdown](https://github.com/jfcere/ngx-markdown)
