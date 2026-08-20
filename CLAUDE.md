# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Persona

Act as a mobile app developer with 20+ years of experience across native and cross-platform stacks (Swift, Flutter, .NET, React Native, etc.) — bring that depth of judgment to platform, performance, and architecture decisions in this codebase. Also act as someone with a deep, practical understanding of music theory — chord progressions, sight reading, sheet music notation — and apply that knowledge when working on the music domain logic (`src/music/`) and anything touching chords, keys, transposition, or notation.

## Working with the user

- DO NOT make assumptions — DO ask questions when uncertain or unclear.
- DO present better options when they would significantly improve the overall outcome, rather than silently implementing what was literally asked.
- DO preserve existing comments when they are still correct.
- SKIP creating specifications and implementation plans. Go straight to implementation. User will review the builds manually and will prompt the necessary changes.

## Commits

- DO NOT add Claude as a co-author. Never append `Co-Authored-By: Claude ...` (or any Claude/Anthropic co-author trailer) to commit messages.
- DO NOT mention Claude in code comments. Never reference Claude, Anthropic, or AI authorship in comments.
- Commit subjects must be descriptive of the change: state what changed and why, specifically — no vague or generic messages (e.g. not "update files" or "fix bug"). Do not add prefixes like `fix:`, `feat:`, etc.

## Commands

- `npm start` — start the Expo dev server (Metro)
- `npm run android` / `npm run ios` / `npm run web` — start dev server targeting a specific platform
- `npx tsc --noEmit` — type-check (strict mode is on; there is no separate `build`/`typecheck` script)

There is no lint config and no formatter config. `jest` (with the `jest-expo` preset) is configured — run via `npm test` / `npm run test:watch`. Convention so far: only pure logic under `src/data/` and `src/music/` has test files; screens/components don't have a test precedent yet. See `docs/superpowers/specs/2026-08-19-chord-detector-broadening-design.md` for the original reasoning on adding the runner.

## Architecture

**Entry chain:** `index.ts` → `App.tsx` → `StoreProvider` (src/data/store.tsx) → `ThemeProvider` (src/theme/ThemeContext.tsx) → `NavigationContainer` → `RootNavigator`.

**State:** One global `useReducer` store in `src/data/store.tsx`, exposed via `useStore()`. Holds all songs (`Record<string, Song>`, each with a `favorite` flag), named setlists (`Record<string, Setlist>` + `setlistOrder: string[]` for stable ordering — there can be many, not just one), and app-wide settings (appearance, enharmonic spelling, library sort mode). Seeded in-memory from `src/data/mockSongs.ts` — nothing persists across reloads yet (`@react-native-async-storage/async-storage` is a dependency but not wired up anywhere).

**Navigation:** Two native-stack screens (`src/navigation/RootNavigator.tsx`): `LiveStage` (initial route, params: `{ songId? }`) → `AddSong` (params: `{ mode: 'create' } | { mode: 'edit'; songId }` — dual create/edit screen). There is no standalone Library screen/route — `LiveStageScreen` is a single unified shell used at every screen size and as the app's home state: with no `songId` (fresh launch, or a `songId` that doesn't resolve to a song) it renders the same chrome with an empty body, and picking a song happens through its "Menu" drawer's Library tab (`MenuDrawerLibraryTab`), which navigates via `navigation.replace('LiveStage', { songId })`. The stack header is disabled everywhere — every screen builds its own header row, so don't reach for `navigation.setOptions`/header APIs when changing a screen's chrome.

**Music domain logic** (`src/music/`), independent of any UI:
- `notes.ts` — pitch class (0-11) ↔ note-name conversion, sharp/flat enharmonic spelling.
- `chart.ts` — parses/transposes the "chord line over lyric line" plain-text format used by the "Type it in" input and the Live Stage Chord tab. `CHORD_TOKEN_RE` is the single source of truth for what counts as a chord token; both `AddSongScreen` and `ChordGrid` consume `chart.ts`'s exports (`isChordLine`, `transposeLine`, `parseChart`) rather than parsing chords themselves. This is a separate system from MusicXML import — MusicXML is sheet-music-only and untouched by this parser.

**Theming** (`src/theme/`): `tokens.ts` defines a two-appearance ('light' / 'dark', dark is styled as "Stage Dark") color system plus spacing/radius/font tokens, ported from an external classical design system with a deliberate override to system sans-serif (monospace is kept only for the chord-over-lyric grid via `fontMono`). `ThemeContext` exposes the resolved palette via `useTheme()`; appearance itself lives in the store's settings, not in ThemeContext state.

**UI kit:** Nativewind (Tailwind for React Native) + React Native Reusables (RNR, shadcn/ui-style components) is the intended UI stack going forward, replacing the hand-rolled `src/ui/` kit (Button, Card, Input, Segmented, Tag, icons). `src/ui/` and `AddSongScreen` still use the hand-rolled kit and are not yet migrated — treat them as legacy pending migration, not as the pattern to copy for new work. `LiveStageScreen` is already on RNR components (`@/components/ui/button`, `@/components/ui/text`) for its controls, mixed with plain `View`/`style` for layout. The Live Stage "Menu" drawer (`src/screens/live-stage/MenuDrawer.tsx` and its `MenuDrawer*Tab.tsx`/`SetlistBuildView.tsx` siblings) is the first RNR-based surface in the app and the reference example for the pattern: Tailwind `className` + `@/components/ui/*` for layout/text/controls, but raw `react-native-svg` icons (`src/ui/icons.tsx`) still get their `color` from `useTheme()` rather than a Tailwind class, since NativeWind doesn't remap SVG stroke/fill props in this project. Write new components/screens with Tailwind utility classes via the `className` prop and RNR components rather than adding to `src/ui/`.
- Styling: `className` on RN primitives (enabled by `babel.config.js` + `metro.config.js`'s `withNativeWind`), Tailwind config in `tailwind.config.js`. `global.css`'s CSS variables (imported once in `App.tsx`) are hand-derived from this app's actual brand palette in `src/theme/tokens.ts`'s `makeTheme()` (light + Stage Dark) — keep the two in sync if either palette changes; there's no generator linking them.
- Components: add via `npx @react-native-reusables/cli@latest add <component>` (interactive — this CLI's prompts don't reliably honor `--yes`/piped stdin; run it in a real interactive terminal, not scripted). Component config is in `components.json`; the `cn()` class-merge helper lives at `src/lib/utils.ts`. Path alias `@/*` → `./src/*` is configured in `tsconfig.json` (Expo's Metro resolver picks up tsconfig paths automatically, no extra resolver config needed). Currently generated: `button`, `input`, `toggle-group` (pulls in `toggle` and `icon`), `separator`, `text`.
- `react-native-reanimated` **is** installed (currently 4.5.1) and compatible with this project's React Native version (0.86.2, via Expo SDK 57) — its peer range covers 0.83–0.86. RNR components that depend on it (Dialog, Sheet, Popover, Select, DropdownMenu, etc.) are usable; nothing in this stack currently blocks them.
- Dark mode is wired: `App.tsx` calls Nativewind's `colorScheme.set(settings.appearance)` in a `useEffect` keyed on `settings.appearance`, so `dark:` Tailwind variants track the same appearance setting `ThemeProvider` uses — no separate dark-mode state to manage.

**Design-spec fidelity:** Several files (`chart.ts`, `notes.ts`, `tokens.ts`, `mockSongs.ts`) contain comments citing an external "StageChart Design Spec.dc.html" and porting logic/values from it "verbatim" or "exactly." Where such a comment exists, treat the cited behavior/values as intentional and exact, not incidental — don't simplify or round them away without checking the spec reference.

**Planning artifacts:** Feature design docs live under `docs/superpowers/specs/` (this repo uses the superpowers skill workflow for brainstorming/planning). Check there for prior design decisions before re-deriving them.
