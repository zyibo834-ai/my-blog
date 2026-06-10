# Defend Your Thesis

Assignment 4 project: a playable HTML5 survival game developed with LLM-assisted programming.

The player controls a student defender and protects the thesis document from incoming Bugs, Deadlines, and Peer Reviewers. The project is designed as a static website/PWA, so it can be opened locally or deployed to a stable URL.

Planned GitHub Pages URL:

```text
https://zyibo834-ai.github.io/my-blog/assignment4/
```

## Run Locally

Open `index.html` directly in a modern browser, or run a local server:

```powershell
python -m http.server 8765
```

Then visit:

```text
http://localhost:8765
```

## Website Deployment

This project can be hosted as a static website. Upload these files and folders to the web root:

```text
index.html
styles.css
game.js
manifest.webmanifest
sw.js
assets/
screenshots/
```

Good deployment targets include GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any school static web server. For the existing site `https://zyibo834-ai.github.io/my-blog/`, place the deploy folder at `assignment4/`.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse/touch pointer
- Shoot: hold mouse/touch or press `Space`
- Special ability: `E` or the ability button
- Pause: `P` or the pause button
- Restart: `R` button in the HUD

## Features

- Character selection with three defenders
- Canvas-based real-time survival gameplay
- Threat spawning, collision detection, scoring, wave scaling, and game-over logic
- Integrated in-game AI Advisor that gives rule-based tactical tips and answers typed questions
- PWA manifest and service worker for website installation/offline caching after HTTP/HTTPS deployment
- Windows self-extracting executable in `dist/DefendYourThesis_Windows.exe`

## Project Structure

```text
Assignment4_Defend_Your_Thesis/
  index.html
  styles.css
  game.js
  manifest.webmanifest
  sw.js
  assets/icon.svg
  screenshots/
  dist/DefendYourThesis_Windows.exe
  launcher/
  package/
  REPORT.md
```

## Notes

The `.exe` build is a Windows self-extracting launch package created with IExpress. The most portable submission method is the static website version, because the same files run on Windows, macOS, Linux, and mobile browsers.
