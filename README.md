# Cogniflow

AI-Powered Markdown Study Notebook built with Angular.

## Getting Started

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
