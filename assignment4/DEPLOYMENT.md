# Website Deployment Guide

This project is ready to upload as a static website. For the existing site `https://zyibo834-ai.github.io/my-blog/`, place the project in an `assignment4` folder so the final URL becomes:

```text
https://zyibo834-ai.github.io/my-blog/assignment4/
```

## Option 1: GitHub Pages

1. Create a new GitHub repository.
2. Upload the project files, with `index.html` at the repository root.
3. Open repository settings.
4. Enable GitHub Pages for the main branch.
5. Copy the published URL into `REPORT.md`.

## Option 2: Netlify / Vercel / Cloudflare Pages

1. Create a new static site project.
2. Upload or import this folder.
3. Set the publish/root directory to this project folder.
4. No build command is required.
5. Copy the generated public URL into `REPORT.md`.

## Option 3: School Server

Upload all files to a public directory on the school server. The important requirement is that `index.html` remains in the web root together with `styles.css`, `game.js`, `manifest.webmanifest`, `sw.js`, and the `assets` folder.

## Local Test Before Upload

```powershell
python -m http.server 8765
```

Open:

```text
http://localhost:8765
```
