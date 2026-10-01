import tracks from "./tracks.json";

const PIPED_APIS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io",
  "https://api-piped.mha.fi",
];

const MANIFEST = {
  id: "santiago.mi-biblioteca",
  name: "Mi Biblioteca (625 canciones)",
  version: "1.0.0",
  resources: ["search", "stream"],
  allowDownloads: 1
};

function normalize(s = "") {
  return s.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function trackToBitChord(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist || "",
    album: t.album || "",
    artworkURL: `https://i.ytimg.com/vi/${encodeURIComponent(t.videoId)}/hqdefault.jpg`,
    format: "m4a",
    audioQuality: "HIGH"
  };
}

async function pipedStreams(videoId) {
  for (const base of PIPED_APIS) {
    try {
      const r = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
        headers: { "accept": "application/json" }
      });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
      const usable = streams.filter(s => s && s.url);
      usable.sort((a, b) => {
        const am = String(a.mimeType || "").includes("audio/mp4") ? 1 : 0;
        const bm = String(b.mimeType || "").includes("audio/mp4") ? 1 : 0;
        if (am !== bm) return bm - am;
        return (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0);
      });
      if (usable.length) return usable[0];
    } catch (_) {}
  }
  return null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "GET") return new Response(null, { status: 405 });

    if (path === "/" || path === "/manifest.json") {
      return json(MANIFEST);
    }

    if (path === "/health") {
      return json({ ok: true, tracks: tracks.length, addon: MANIFEST.name });
    }

    if (path === "/search") {
      const q = normalize(url.searchParams.get("q") || "");
      if (!q) return json({ tracks: [] });

      const terms = q.split(/\s+/).filter(Boolean);
      const scored = tracks.map(t => {
        const hay = normalize([t.title, t.artist, t.album].join(" "));
        const title = normalize(t.title);
        let score = 0;
        for (const term of terms) {
          if (title.includes(term)) score += 5;
          else if (hay.includes(term)) score += 2;
          else return null;
        }
        return score ? { score, t } : null;
      }).filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map(x => trackToBitChord(x.t));

      return json({ tracks: scored });
    }

    if (path.startsWith("/stream/")) {
      const id = decodeURIComponent(path.slice("/stream/".length));
      const track = tracks.find(t => t.id === id);
      if (!track) return new Response(null, { status: 404 });

      const stream = await pipedStreams(track.videoId);
      if (!stream || !stream.url) {
        return json({ error: "No se pudo resolver el audio en este momento." }, 502);
      }

      const mime = String(stream.mimeType || "").toLowerCase();
      const isMp4 = mime.includes("audio/mp4") || String(stream.format || "").toUpperCase() === "M4A";
      const codec = isMp4 ? "aac" : "opus";
      const container = isMp4 ? "mp4" : "webm";

      return json({
        url: stream.url,
        format: isMp4 ? "m4a" : "webm",
        quality: "High",
        codec,
        container,
        manifest: "none",
        encrypted: false,
        bitrate: Number(stream.bitrate) || undefined
      });
    }

    return new Response(null, { status: 404 });
  }
};
