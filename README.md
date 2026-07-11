# Sherpa Caddie PWA

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


## Brand
- Forest Green: `#1B4D2E`
- Fairway Green: `#3E7A4E`
- Meadow Green: `#8DBA5E`
- Caddie Navy: `#0D1B2A`
- Sky Blue: `#4A6FA5`
- Sand Beige: `#F1E6D3`
- Warm Tan: `#C9A97A`
- Stone Gray: `#6B6F72`

The logo combines the golf flag and hole with the silhouette of a guide, representing golf, coaching, and caddie support in one simple symbol.


## Version 0.2.1

- Replaced the generated SVG logo with the exact approved Sherpa Caddie artwork supplied by the project owner.
- Rebuilt PWA install icons from the approved flag-guide emblem.
