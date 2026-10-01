# BitChord — Mi Biblioteca

Addon personalizado para BitChord basado en el archivo `Descargados.json`.

- Canciones importadas: 625
- Endpoint del addon: `/manifest.json`
- Búsqueda: `/search?q=...`
- Reproducción: `/stream/<id>`
- Usa los YouTube Video ID que ya estaban en tu archivo para resolver el audio mediante instancias públicas de Piped.

## Cómo ponerlo en BitChord

1. Publica este proyecto como un Cloudflare Worker.
2. Copia la URL HTTPS que te dé Cloudflare.
3. En BitChord: **Biblioteca → Fuentes → Añadir un complemento**.
4. Pega esa URL (también sirve añadir `/manifest.json` al final).
5. BitChord debería mostrar **Mi Biblioteca (625 canciones)** como fuente.

## Importante

El archivo de canciones queda dentro del Worker. No necesitas importar el JSON desde BitChord.

El Worker no contiene los archivos de audio; cuando BitChord pide reproducir una canción, el Worker consulta una instancia pública de Piped usando el YouTube Video ID y devuelve una URL temporal de audio.

Si una instancia de Piped falla, prueba automáticamente otras de la lista.

## Despliegue con Wrangler

```bash
npm install -g wrangler
wrangler login
cd BitChord-Mi-Biblioteca
wrangler deploy
```

Después de `wrangler deploy`, usa la URL `https://<nombre>.workers.dev` que muestre Wrangler.

## Estructura

- `worker.js` — API del addon.
- `tracks.json` — tus 625 canciones.
- `wrangler.toml` — configuración de Cloudflare Worker.
