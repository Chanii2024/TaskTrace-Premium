# TaskTrace Premium

A **premium** multi‑page project‑tracking web app built with **HTML**, **Tailwind CSS**, **Lucide icons**, and **Firebase Realtime Database**.  
It provides a clean UI for creating, viewing, and managing projects, with a modern glass‑morphism design.

## Features
- Multi‑page layout (home, team, workspace, analytics)
- Real‑time data sync via Firebase Realtime DB
- Dynamic header/footer with version badge, system status, and build‑stack info
- Instagram link in footer, custom header background image
- Responsive design using Tailwind utilities

## Getting Started
1. **Clone the repo**
   ```bash
   git clone https://github.com/Chanii2024/TaskTrace-Premium.git
   cd TaskTrace-Premium
   ```
2. **Install dependencies** (only the Firebase SDK is loaded from CDN, no npm packages required for the UI).
3. **Run locally** – simply open `index.html` in a browser or serve the folder with any static server (e.g., `npx serve`).

## Deploy to Firebase Hosting
```bash
# Make sure you are logged in
firebase login
# Initialise (already done) and deploy
firebase deploy --only hosting
```
The site will be available at `https://<project-id>.web.app`.

## Contributing
Feel free to open issues or submit pull requests. Follow the existing code style, add validation to forms, and keep the UI consistent.

---
*Created by Chaniru Weerasinghe*
