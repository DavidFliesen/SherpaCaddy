# Sherpa Caddy PWA

A static, beginner-friendly golf companion designed for GitHub Pages.

## Included
- Search OpenGolfAPI courses
- Attempt nearby-course lookup using browser location
- Open-Meteo course weather
- Push-to-talk questions and spoken answers where browser-supported
- Local round scoring and notes
- JSON export/import
- Offline app shell and installable PWA manifest

## Run locally
Service workers require HTTP rather than opening `index.html` directly.

```bash
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Publish on GitHub Pages
1. Create a GitHub repository.
2. Upload these files to the repository root.
3. In **Settings → Pages**, deploy from the main branch/root.

## Important limitations
- There is no backend or paid AI model in this version. Sherpa answers from an expandable local knowledge library.
- A true always-listening “Hey Sherpa” wake word is not dependable in mobile PWAs; this version uses push-to-talk.
- Browser speech-recognition support varies, particularly for installed PWAs on iOS.
- OpenGolfAPI is community-maintained, so field names and coverage can vary. The adapter in `app.js` accepts several common response shapes.
- Review the current service terms before commercial deployment.
