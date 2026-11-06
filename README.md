# REDCO BV — interactieve datacenter-site

Dit is een zelfstandige GitHub Pages-klare website zonder build-stap of betaalde dienst.

## Lokaal bekijken

Gebruik een lokale webserver (de GLB/CDN-modules werken niet betrouwbaar via `file://`). Bijvoorbeeld in deze map: `python -m http.server 8080` en open daarna `http://localhost:8080`.

## Publiceren via GitHub Pages

1. Maak een nieuwe GitHub-repository.
2. Upload alle bestanden uit deze map naar de repository-root.
3. Kies in **Settings → Pages** de branch `main` en map `/ (root)`.
4. Open de URL die GitHub Pages toont.

De datacenterwereld gebruikt Three.js/WebGL via een publieke CDN en laadt echte getextureerde GLB-modellen uit de CC0 Data Centre Infiltration Kit. De hero bevat een scroll-gestuurde camerabaan, een donkere serverruimte, PBR-belichting, schaduwen, een gemodelleerde serverkast en een transparante rackdeur die opent bij selectie. Klik op een serverkast, gebruik ESC om terug te gaan en scroll door de pagina om de camera door de ruimte te laten bewegen.

De GLB-assets worden in de browser geladen vanaf `cdn.3dassets.dev`; de GitHub Pages-site heeft daarom internet nodig voor het 3D-gedeelte. Als de CDN niet bereikbaar is, blijft de CSS-3D fallback beschikbaar.
