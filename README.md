Tollywood Tune Trek 🎵An interactive, fast-paced web trivia game for Telugu cinema enthusiasts inspired by Heardle. Players guess iconic Tollywood tracks starting from micro-snippets as short as 0.1 seconds, competing on a live global leaderboard.⚡ FeaturesIncremental Audio Unlocks: Snippets progress across 6 tiers ($0.1\text{s} \to 0.5\text{s} \to 1\text{s} \to 2\text{s} \to 5\text{s} \to 15\text{s}$) with dynamic point weighting.4 Curated Eras: Filter track pools across 2020s Bangers, 2000s–10s Nostalgia, 90s Golden Era, and Vintage Classics.Global Real-Time Leaderboard: Powered by Supabase (PostgreSQL) with period-based filtering (Weekly, Monthly, All-Time) and custom player nicknames.Smart Autocomplete Search: Instant querying across song titles, movies, singers, and composers.Anti-Exploit Audio Engine:2-second start offset to skip silent intros.Media Session API hijacking to mask song metadata in mobile notification shades and lock screens.Strict native hardware bounds (onTimeUpdate, onSeeking, onPlay) to prevent mobile control-center scrubbing exploits.Audio Waveform Visualization: Real-time canvas/SVG snippet progress feedback via Framer Motion.Responsive UI: Tailored for both desktop and mobile layouts with system dark/light mode toggle.🛠️ Tech StackFramework: React + Vite + TypeScriptStyling: Tailwind CSSAnimations: Framer MotionIcons: Lucide ReactDatabase & Backend: Supabase (PostgreSQL with Row Level Security)Audio Source: iTunes Search API CDNDeployment: Vercel🚀 Getting StartedPrerequisitesNode.js (v18.0.0 or higher)npm or pnpmA free Supabase account1. Clone & InstallBashgit clone https://github.com/your-username/tollywood-tune-trek.git
cd tollywood-tune-trek
npm install 2. Configure Environment VariablesCreate a .env.local file in the root directory:Code snippetVITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-legacy-anon-key
Note: Ensure VITE_SUPABASE_URL contains only the base domain (do not append /rest/v1/ or trailing slashes).3. Initialize the Supabase DatabaseRun the following migration script in your Supabase SQL Editor:SQLcreate table if not exists public.leaderboard (
id uuid default gen_random_uuid() primary key,
name text not null unique,
points integer not null default 0,
attempt_length numeric not null default 0.1,
era text not null default 'All Eras',
song_title text not null default '',
created_at timestamptz default now(),
updated_at timestamptz default now()
);

alter table public.leaderboard enable row level security;

create policy "Public leaderboard read" on public.leaderboard for select using (true);
create policy "Public leaderboard insert" on public.leaderboard for insert with check (true);
create policy "Public leaderboard update" on public.leaderboard for update using (true); 4. Run Development ServerBashnpm run dev
Visit http://localhost:5173 to test the game locally.5. Production BuildBashnpm run build
npm run preview
🎯 Scoring MatrixAttemptSnippet DurationPoints Awarded1st0.1s100 pts2nd0.5s50 pts3rd1.0s25 pts4th2.0s15 pts5th5.0s10 pts6th15.0s5 pts
