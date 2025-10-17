# Cogniflow

<div align="center">

<img src="/banner/cogniflow-banner.png" alt="Cogniflow Banner" width="420" />

**AI-Powered Markdown Study Notebook**

[![Angular](https://img.shields.io/badge/Angular-20.3-DD0031?style=flat&logo=angular)](https://angular.io/)
[![Firebase](https://img.shields.io/badge/Firebase-12.4-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A modern, intelligent note-taking platform that combines markdown writing, folder organization, wiki-style linking, and AI-assisted features to enhance your learning and productivity.

</div>

---

## Overview

Cogniflow is an AI-powered markdown-based note-taking web application designed to help students, researchers, and knowledge workers organize ideas, track learning progress, and create interconnected knowledge networks. Built with Angular 20, Firebase, and modern web technologies, it provides a seamless, distraction-free environment for capturing and reviewing information.

### Key Features

- **Markdown Editor** with live preview and syntax highlighting
- **Hierarchical Folder System** with drag-and-drop organization
- **Wiki-Style Linking** with `[[Note Title]]` and `[[/path/to/note]]` syntax
- **Tag Management** with chip-based UI for easy categorization
- **Global Search** (Ctrl+K) for instant note discovery
- **Multiple Views** - Grid and List layouts with keyboard navigation
- **Dual Themes** - Cyber Glow (dark) and Electric Sky (light)
- **Real-time Sync** via Firebase Firestore with offline support
- **Secure Authentication** with Firebase Auth
- **Modern UI** built with TailwindCSS 4

---

## Tech Stack

- **Angular 20** - Modern, signal-based reactive framework
- **TypeScript 5.9** - Type-safe development
- **TailwindCSS 4** - Utility-first CSS framework
- **Firebase Firestore** - NoSQL cloud database with real-time sync
- **Firebase Auth** - Secure user authentication
- **Firebase Hosting** - Fast, secure web hosting
- **Marked.js** - Markdown parsing and rendering
- **Prism.js** - Code syntax highlighting
- **Fuse.js** - Fuzzy search library
- **Angular Signals** - Reactive state management
- **Angular CDK** - Native drag-and-drop functionality

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

5. **Open your browser to `http://localhost:4200`**

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

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Global search
- `Ctrl/Cmd + N` - New note
- `Ctrl/Cmd + S` - Save note
- `Arrow keys` - Navigate notes
- `Enter` - Open selected note
- `Delete` - Delete selected note

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
- [ ] Collaboration features
- [ ] Mobile apps

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

<div align="center">

**Made with love and coffee by Ron**

[Back to top](#cogniflow)

</div>
