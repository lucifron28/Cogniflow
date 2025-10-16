# Cogniflow: AI-Powered Markdown Study Notebook

## Project Summary
Cogniflow is an AI-powered markdown study notebook designed for my frontend development course as a solo project. It enhances how students capture, organize, and interact with knowledge. Built using Angular, Angular Material, Firebase, and Google’s Gemini API, it provides a structured environment for writing, managing, and reviewing notes. The platform integrates markdown editing, study tracking, and intelligent summarization to promote focused learning and comprehension.

## Project Overview
Cogniflow is a web-based, AI-assisted note-taking application tailored for students to organize ideas, summarize content, and track learning progress. Combining the simplicity of markdown with intelligent tools, it offers an intuitive card-based interface for creating, managing, and reviewing notes. The platform leverages AI for summarization, concept explanation, and question generation, aiming to improve productivity and comprehension in a single workspace. This project demonstrates advanced frontend development skills using Angular and Google’s ecosystem for a course submission.

## Key Features
- **Markdown Note Editor**  
  Supports standard markdown syntax for structured, distraction-free writing using `ngx-markdown`.
- **Card-Based Note Presentation**  
  Notes are displayed as cards in a responsive grid layout using Angular Material for easy navigation and quick previews.
- **Study Tracking**  
  Tracks note activity and progress with visualizations powered by `ng2-charts` to measure learning consistency.
- **AI Assistant (Gemini Integration)**  
  Uses Google’s Gemini API for context-aware summaries, concept clarifications, and question generation based on notes.
- **Search and Tagging System**  
  Enables efficient note retrieval using keywords and tags with `fuse.js` for fuzzy search.
- **Cloud Sync and Authentication**  
  Utilizes Firebase for real-time synchronization, user authentication, and secure data storage.
- **Responsive and Accessible Design**  
  Built with Angular Material for accessibility and cross-device usability.

## Tech Stack
| Layer           | Technology            | Purpose                                              |
|-----------------|-----------------------|------------------------------------------------------|
| Frontend        | Angular               | Frontend framework for modular and reactive UI       |
| Styling         | Angular Material      | Material Design components for consistent UI         |
| Database & Hosting | Firebase (Firestore, Hosting) | Cloud storage, authentication, and hosting platform |
| AI Integration  | Gemini API            | Contextual AI summarization and note assistance      |
| Authentication  | Firebase Auth         | Secure user management and session handling          |
| Libraries       | `ngx-markdown`        | Markdown parsing and rendering                      |
|                 | `ng2-charts`          | Study progress visualizations                        |
|                 | `fuse.js`             | Fuzzy search for notes and tags                     |
|                 | `Akita`               | Lightweight state management                         |
|                 | `rxjs`                | Reactive programming for async operations            |

## System Architecture
- **Angular Frontend**: Handles user interaction, note rendering, and markdown editing with Angular Material components (e.g., `mat-card`, `mat-chip-list`).
- **Firebase Firestore**: Stores notes, tags, and user data with real-time synchronization.
- **Firebase Authentication**: Manages secure user sessions and account management.
- **Gemini AI API**: Accessed via Firebase Cloud Functions or client-side for AI-driven features like summarization and question generation.
- **Firebase Hosting**: Serves the Angular build for production deployment.
- **State Management**: Uses `Akita` for managing note and analytics state, with `rxjs` for reactive search and sync.
- **Search**: Implements `fuse.js` for efficient fuzzy search across notes and tags.
- **Visualizations**: Uses `ng2-charts` for study tracking dashboards.

## Objectives
- Deliver a modern, distraction-free note-taking environment for students.
- Integrate AI to assist with summarizing and reinforcing note comprehension.
- Provide lightweight analytics to track study habits using visualizations.
- Showcase proficiency in Angular, Angular Material, and Google’s ecosystem (Firebase, Gemini) for a frontend development course.

## Target Users
Cogniflow is designed for:
- Students and self-learners needing a structured note-taking tool.
- Course evaluators assessing frontend development skills in Angular and API integration.
- Individuals who benefit from AI-driven insights and study tracking.

## Expected Outcome
Cogniflow will serve as an intelligent study notebook that bridges note-taking and learning. Users can take organized notes, receive AI-driven insights, and track study progress seamlessly. The project demonstrates advanced frontend development with Angular, Angular Material, and Google’s ecosystem, fulfilling course requirements for a solo project.

## Usage
1. **Sign Up/Login**: Create an account or log in using Firebase Authentication.
2. **Create Notes**: Use the `ngx-markdown` editor to write notes with standard markdown syntax.
3. **Organize Notes**: Add tags with Angular Material’s `mat-chip-list` and search using `fuse.js`-powered fuzzy search.
4. **AI Assistance**: Leverage the Gemini API to summarize notes, clarify concepts, or generate practice questions.
5. **Track Progress**: View study activity through `ng2-charts`-powered dashboards.
6. **Sync Across Devices**: Notes are saved in real-time to Firebase Firestore for access anywhere.

## Project Notes
- This is a solo project for a frontend development course, designed to demonstrate proficiency in Angular, Angular Material, Firebase, and API integration.
- The project is closed-source and not intended for public distribution or contributions.
- Future enhancements (post-course) may include real-time collaboration or advanced analytics, but the current scope focuses on course requirements.

## Contact
For course-related feedback or inquiries, please contact me at [cronvincent@gmail.com](mailto:cronvincent@gmail.com).