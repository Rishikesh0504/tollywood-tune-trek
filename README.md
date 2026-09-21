# 🎵 Tollywood Tune Trek

> A high-performance, interactive Telugu music guessing game built with React, Vite, and Supabase. Guess iconic Tollywood tracks across decades from audio snippets, beat streaks, and climb the leaderboard!

---

## 🌟 Overview

**Tollywood Tune Trek** challenges players to identify Telugu tracks from short audio snippets. Designed for speed and minimal latency, the catalog of 600+ verified tracks is statically served and coupled with an intelligent audio-matching engine that resolves 30-second previews in real time without heavy database queries.

### 🎮 Game Highlights

- **600+ Curated Songs**: Spanning 50+ years of Telugu cinema across 4 distinct eras.
- **Intelligent Audio Resolver**: Real-time track matching against Apple Music's preview CDN with keyword scoring, dub filtering, and OST theme-trap protection.
- **Interactive Waveform Player**: Smooth playhead animation powered by `requestAnimationFrame` for stutter-free audio scrubbing.
- **Leaderboard Integration**: Persistent high-score and streak tracking backed by Supabase with guest and username profiles.
- **Developer CLI Tooling**: Built-in verification and auditing scripts to test song audio directly from the terminal.

---

## 🗂️ Song Catalog Eras

The catalog is balanced and categorized into four eras:

| Era                     | Badge       | Coverage   | Notable Composers & Artists                                               |
| ----------------------- | ----------- | ---------- | ------------------------------------------------------------------------- |
| **2020s Bangers**       | `2020s`     | 350 tracks | Anirudh, Thaman S, Devi Sri Prasad, Hesham Abdul Wahab, Vivek Sagar       |
| **2000s–10s Nostalgia** | `2000–2019` | 350 tracks | Mani Sharma, Devi Sri Prasad, Harris Jayaraj, Mickey J Meyer, A.R. Rahman |
| **90s Golden Era**      | `1990–1999` | 150 tracks | M.M. Keeravani, Koti, Deva, Sandeep Chowtha, Ilaiyaraaja                  |
| **Vintage Classics**    | `Pre-1990`  | 150 tracks | K.V. Mahadevan, Ilaiyaraaja, Chakravarthy, Ghantasala                     |

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Leaderboard**: [Supabase](https://supabase.com/)
- **Audio Previews**: iTunes Search API (Edge-queried client-side)
- **Scripting & Tooling**: Node.js / `npx tsx`

---
