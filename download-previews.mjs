import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.join(__dirname, "public", "audio");

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const TRACKS = [
  { file: "chuttamalle.mp3", query: "Chuttamalle Devara" },
  {
    file: "kurchi-madathapetti.mp3",
    query: "Kurchi Madathapetti Guntur Kaaram",
  },
  { file: "fear-song.mp3", query: "Fear Song Devara" },
  { file: "naatu-naatu.mp3", query: "Naatu Naatu RRR" },
  { file: "oo-antava.mp3", query: "Oo Antava Mava Pushpa" },
  { file: "butta-bomma.mp3", query: "Butta Bomma Ala Vaikunthapurramuloo" },
  {
    file: "inkem-inkem.mp3",
    query: "Inkem Inkem Inkem Kaavaale Geetha Govindam",
  },
  { file: "rangamma-mangamma.mp3", query: "Rangamma Mangamma Rangasthalam" },
  { file: "vachinde.mp3", query: "Vachinde Fidaa" },
  {
    file: "cinema-choopistha.mp3",
    query: "Cinema Choopistha Mava Race Gurram",
  },
  { file: "ringa-ringa.mp3", query: "Ringa Ringa Arya 2" },
  { file: "cheliya-cheliya.mp3", query: "Cheliya Cheliya Kushi" },
  { file: "ghal-ghal.mp3", query: "Ghal Ghal Nuvvostanante Nenoddantana" },
  { file: "nammaka-thappani.mp3", query: "Nammaka Thappani Criminal" },
  { file: "nuvve-kavali.mp3", query: "Kallaloki Kallu Petti Nuvve Kavali" },
  { file: "abbanee-teeyani.mp3", query: "Abbanee Teeyani Jagadeka Veerudu" },
  {
    file: "omkara-naada.mp3",
    query: "Omkaara Naadaanusandhaanam Sankarabharanam",
  },
  { file: "mounamelanoyi.mp3", query: "Mounamelanoyi Sagara Sangamam" },
  { file: "aakasa-veedhilo.mp3", query: "Aakasa Veedhilo Mande Gundelu" },
];

async function downloadTrack({ file, query }) {
  const filePath = path.join(TARGET_DIR, file);
  console.log(`🔍 Searching iTunes for: "${query}"...`);

  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query,
    )}&media=music&entity=song&country=IN&limit=1`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`❌ No result found on iTunes for "${query}". Skipping.`);
      return;
    }

    const previewUrl = data.results[0].previewUrl;
    if (!previewUrl) {
      console.warn(`❌ No preview URL available for "${query}". Skipping.`);
      return;
    }

    console.log(`⬇️ Downloading preview for ${data.results[0].trackName}...`);
    const audioRes = await fetch(previewUrl);
    const arrayBuffer = await audioRes.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    console.log(`✅ Saved: public/audio/${file}`);
  } catch (err) {
    console.error(`⚠️ Failed to process ${file}:`, err.message);
  }
}

async function run() {
  console.log(
    `Starting download of ${TRACKS.length} Telugu song preview snippets...\n`,
  );
  for (const track of TRACKS) {
    await downloadTrack(track);
    // 300ms pause to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.log("\n All previews downloaded to public/audio/");
}

run();
