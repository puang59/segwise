# Frontend UI Plan — Banking Analytics Agent (v2)
## Design Philosophy

Built on Emil Kowalski's design engineering philosophy + Apple's Fluid Interfaces principles.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

**Rules governing every decision:**
- Clean, minimal, monochromatic base — content is the star, chrome is invisible
- Chain-of-thought and tool traces are **always visible**, with agent names prominently shown
- Animate only what earns the right to animate (four-gate filter applied to every element)
- UI animations ≤ 300ms; custom cubic-bezier curves only; never `ease-in`; never `scale(0)`
- LLM never shows raw streaming text — it shows *structured* progressive disclosure

---

## Design Tokens

```css
/* globals.css */
:root {
  /* Base — near-black monochromatic */
  --bg:            #0a0a0a;
  --surface:       #111111;
  --surface-2:     #1a1a1a;
  --surface-3:     #222222;
  --border:        rgba(255,255,255,0.06);
  --border-hover:  rgba(255,255,255,0.12);
  --text-primary:  #f0f0f0;
  --text-secondary: rgba(240,240,240,0.45);
  --text-tertiary:  rgba(240,240,240,0.25);

  /* Single accent */
  --accent:        #6366f1;
  --accent-dim:    rgba(99,102,241,0.12);
  --success:       #22c55e;
  --warning:       #f59e0b;
  --error:         #ef4444;

  /* Agent identity colours */
  --agent-atlas:  #6366f1;   /* indigo  — intent, planning */
  --agent-scout:  #0ea5e9;   /* sky     — data scouting */
  --agent-forge:   #a78bfa;   /* violet  — feature engineering */
  --agent-mosaic:  #f97316;   /* orange  — segmentation */
  --agent-prism:  #22c55e;   /* green   — explainability */
  --agent-compass:  #f59e0b;   /* amber   — recommendation */
  --agent-loom:    #ec4899;   /* pink    — response synthesis */

  /* Tool colours (subset of agent palette, used in badges) */
  --tool-eda:      #0ea5e9;
  --tool-feature:  #a78bfa;
  --tool-segment:  #f97316;
  --tool-explain:  #22c55e;
  --tool-recom:    #f59e0b;
  --tool-viz:      #ec4899;

  /* Typography */
  --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;

  /* Easing — custom curves, never built-in CSS easings */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* all entrances/exits */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* sheets, drawers */

  /* Duration budgets */
  --dur-press:    120ms;
  --dur-tooltip:  150ms;
  --dur-dropdown: 200ms;
  --dur-modal:    280ms;
  --dur-stagger:  30ms;
}
```

---

## Library Stack

| Task | Library |
|---|---|
| Animation — springs, layout, enter/exit | **motion** (Framer Motion v11) |
| Unstyled accessible primitives | **base-ui** |
| Toasts | **Sonner** |
| Charts | **Recharts** (`isAnimationActive={false}`) |
| Syntax highlighting (JSON in trace rows) | **shiki** |

---

## Layout — Three-Column Shell

```
┌──────────────────┬───────────────────────────────┬────────────────────┐
│                  │                               │                    │
│  Sidebar         │   Chat + Trace Panel          │  Context Panel     │
│  240px           │   flex-1                      │  360px             │
│                  │                               │                    │
│  [⬡ Segwise]    │  ┌────────────────────────┐   │  [Charts] [Data]   │
│  ─────────       │  │ Agent Trace Stream     │   │  [Report]          │
│  Model Switcher  │  │ (chain-of-thought)     │   │                    │
│  ─────────       │  └────────────────────────┘   │  Chart cards       │
│  Today           │                               │  appear here as    │
│  · Session 1     │  ┌────────────────────────┐   │  agents produce    │
│  · Session 2     │  │ Message Output         │   │  them              │
│  ─────────       │  └────────────────────────┘   │                    │
│  Yesterday       │                               │                    │
│  · Session 3     │  ┌────────────────────────┐   │                    │
│                  │  │ Input Bar              │   │                    │
│                  │  └────────────────────────┘   │                    │
└──────────────────┴───────────────────────────────┴────────────────────┘
```

Context panel collapses to slide-over sheet on mobile.
Sidebar collapses to icon-only rail on narrow viewports.

---

## Component Specifications

### 1. Agent Trace Stream — the centrepiece

Every user sees exactly what each named agent is doing in real time.

#### Visual design

```
┌──────────────────────────────────────────────────────────────┐
│  ● Atlas                               planning...  0.8s    │
│    Intent: segmentation · rule-based                         │
│    Calling: Scout → Forge → Mosaic → Loom                   │
├──────────────────────────────────────────────────────────────┤
│  ✓ Scout                                            142ms   │
│    Resolved 3 columns: avg_balance, txn_freq, recency        │
│    Dataset: 823,411 customers                                 │
│    ▸ Show details                                             │
├──────────────────────────────────────────────────────────────┤
│  ⟳ Mosaic                               running...           │
│    method: rule-based        [▓▓▓▓▓▓░░░░]                   │
├──────────────────────────────────────────────────────────────┤
│  ○ Loom                                 queued                │
└──────────────────────────────────────────────────────────────┘
```

#### Agent row anatomy

Each row has:
- **Agent colour dot** — left border or dot, using `--agent-{name}` token
- **Agent name** — e.g. "Scout" in the agent's colour
- **Status** — `○ queued` | `⟳ running...` | `✓ done` | `✗ error`
- **Duration** — muted, appears only after completion
- **Summary line** — one-line output description
- **▸ Show details** — expands to raw input/output JSON (collapsed by default)
- **Progress bar** — indeterminate shimmer while running, instant fill on done

After the final response arrives: the entire trace collapses to a single `▾ Reasoning (4 agents, 2.3s)` disclosure.

#### AgentAvatar chip

```tsx
// AgentAvatar.tsx
const AGENT_META = {
  atlas:  { color: '#6366f1', icon: '◆', role: 'Intent'        },
  scout:  { color: '#0ea5e9', icon: '◉', role: 'Data Scout'    },
  forge:   { color: '#a78bfa', icon: '⬡', role: 'Features'      },
  mosaic:  { color: '#f97316', icon: '◈', role: 'Segmentation'  },
  prism:  { color: '#22c55e', icon: '◎', role: 'Explainability'},
  compass:  { color: '#f59e0b', icon: '◇', role: 'Recommendations'},
  loom:    { color: '#ec4899', icon: '✦', role: 'Response'      },
}

export function AgentAvatar({ agent }: { agent: AgentName }) {
  const meta = AGENT_META[agent]
  return (
    <span style={{ color: meta.color }} className="agent-avatar">
      {meta.icon} {agent.charAt(0).toUpperCase() + agent.slice(1)}
    </span>
  )
}
```

#### Animation spec

| Element | Frequency | Animation | Rationale |
|---|---|---|---|
| New agent row appearing | Occasional | `opacity:0→1, y:-8→0`, 200ms, `ease-out` | Spatial consistency — queued rows arrive from above |
| Status `○→⟳→✓` | Occasional | Crossfade 120ms, no movement | State indication without jitter |
| Progress bar shimmer | During loading | Linear infinite CSS `@keyframes` | Perceived performance |
| Row expand (`▸ Show`) | Occasional | Height layout animation, 250ms, spring `bounce:0` | Preventing jarring layout jump |
| Trace collapses to disclosure | Once/query | Height→0 + opacity fade, 280ms, spring `bounce:0` | Spatial consistency — folds away |
| Agent colour dot pulse (running only) | During loading | Subtle pulse `opacity:1→0.5→1`, 1200ms linear | State indication for active agent |

```tsx
// TraceRow.tsx
import { motion, AnimatePresence } from 'motion/react'

<motion.div
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
>
  <AgentAvatar agent={agent} />
  <TraceRowContent status={status} summary={summary} duration={duration} />
</motion.div>
```

---

### 2. Model Switcher

In the sidebar, below the logo. Always visible — this is a key UI element.

```
┌─────────────────────────────────────┐
│  Model                              │
│  ┌───────────────────────────────┐  │
│  │ ◈ Llama 3.1 70B        fast ▾ │  │  ← trigger
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │  ← dropdown (open state)
│  │ ◈ Llama 3.1 70B   ✓ fast     │  │
│  │   Llama 3.1 8B      fastest  │  │
│  │   Mistral 7B        fastest  │  │
│  │   Qwen 2.5 72B      fast     │  │
│  │   DeepSeek R1 70B   medium   │  │
│  │   Gemma 2 27B       fast     │  │
│  └───────────────────────────────┘  │
│                                     │
│  API Key   [••••••••••••] [Edit]    │
└─────────────────────────────────────┘
```

**Behaviour**:
- Selecting a model calls `POST /models/select` immediately
- The `ModelBadge` in the chat header updates to reflect the new model
- All subsequent messages in the session use the new model
- API key field: masked by default, click Edit → inline text input → Save button
  - If blank, uses the server's environment key (your provided key)
  - If filled, overrides to user's own DeepInfra key

**Animation**:
- Dropdown opens: `scale(0.97)→1` + `opacity:0→1`, 200ms, `ease-out`, `transform-origin: top left` (origin-aware, grows from trigger)
- Speed badge uses colour only: `fastest`=green, `fast`=indigo, `medium`=amber — instant, no transition
- Selected model row: instant left-border accent — it's a state, not an entrance

```tsx
// ModelSwitcher.tsx — key animation
<AnimatePresence>
  {open && (
    <motion.div
      className="model-dropdown"
      initial={{ opacity: 0, scale: 0.97, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{ transformOrigin: 'top left' }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      {models.map(model => <ModelOption key={model.id} model={model} />)}
    </motion.div>
  )}
</AnimatePresence>
```

**ModelBadge** — shown in chat panel header:
```
  ◈ Llama 3.1 70B  ·  DeepInfra
```
Small, muted. Clickable — opens the Model Switcher in the sidebar.

---

### 3. Message Blocks

Full-width document sections, not chat bubbles.

```
┌──────────────────────────────────────────────────────────┐
│ You                                        11:42 AM       │
│ Segment customers into priority, regular and dormant      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ✦ Loom · Llama 3.1 70B                     11:42 AM      │  ← agent + model attribution
│ ▾ Reasoning  (4 agents, 1.8s)                            │  ← collapsed trace
│                                                          │
│ I segmented 823,411 customers using rule-based logic.    │
│                                                          │
│ ┌── Segments ──────────────────────────────────────────┐ │
│ │  ● Priority   18%   147,214    ₹1,82,400   22.4/mo  │ │
│ │  ● Regular    58%   477,579    ₹23,100      8.7/mo  │ │
│ │  ● Dormant    24%   198,618    ₹4,200        1.1/mo │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [↓ Download CSV]  [View in Dashboard]                   │
│                                                          │
│ ┄ Suggested next ───────────────────────────────────── │
│  Which regular customers can become priority?  →        │
│  Compare balances across segments  →                    │
│  Show churn risk by segment  →                          │
└──────────────────────────────────────────────────────────┘
```

Key differences from v1:
- Agent attribution line: `✦ Loom · Llama 3.1 70B` — user always knows which model answered
- Collapsed reasoning shows the agent count: `(4 agents, 1.8s)`

**Entry animation**: `opacity:0→1`, `y:12→0`, 240ms, `ease-out`. Occasional — earns it.

---

### 4. HITL Clarification Card

```
┌──────────────────────────────────────────────────────────┐
│  ◆ Atlas needs input                                    │  ← Atlas's colour
│                                                          │
│  How would you like to define VIP customers?             │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Balance > ₹2L    │  │ Income > ₹1L     │             │
│  └──────────────────┘  └──────────────────┘             │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Product owner    │  │ Let Mosaic decide│             │
│  └──────────────────┘  └──────────────────┘             │
│                                                          │
│  Or describe your own definition...        [Send]        │
└──────────────────────────────────────────────────────────┘
```

- Header says "Atlas needs input" using Atlas's indigo colour — makes HITL feel like a real team handoff
- **Entry animation**: `scale(0.97)→1` + `opacity:0→1`, 220ms, `ease-out`
- **Exit on selection**: `opacity:1→0` only, 150ms — no movement; the answer already replaced it

---

### 5. Follow-Up Suggestions

```
┌─── Suggested next ────────────────────────────────────────────┐
│  Which regular customers can become priority?  →              │
│  Show churn risk across segments  →                           │
│  Export priority customers as CSV  →                          │
└───────────────────────────────────────────────────────────────┘
```

Stagger: each chip `opacity:0→1` + `y:4→0`, 30ms delay between items, 180ms duration.
Click: chip instantly disappears (keyboard-action treatment — no animation).

```tsx
chips.map((chip, i) => (
  <motion.button
    key={chip}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.03, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
    onClick={() => { submitMessage(chip) }}
  >
    {chip} →
  </motion.button>
))
```

---

### 6. Input Bar

```
◆ Atlas    ┌──────────────────────────────────────────────────┐
            │  Ask anything about your customers...             │
            └──────────────────────────────────────────────────┘
                                                      [↑ Send]
```

- Left label shows **which agent is currently active** (updating as agents run)
  - `◆ Atlas` (indigo) → planning
  - `◉ Scout` (sky) → scouting data
  - `⟳ Mosaic` (orange) → segmenting
  - `✦ Loom` (pink) → responding
- Status transitions: crossfade 120ms only — seen constantly, movement would be noise
- Send button: `scale(0.97)` on `:active`, 120ms, `ease-out`
- Disabled while agent runs: `opacity: 0.4`, `cursor: not-allowed`

---

### 7. Context Panel — Charts & Downloads

Right column. Three tabs: **Charts** | **Data** | **Report**.

**Charts tab**:
- Cards appear as Loom emits `chart_spec` SSE events
- Card entry: `opacity:0→1` + `y:8→0`, 240ms, `ease-out`
- Charts internally: `isAnimationActive={false}` — data is for reading, not decoration
- Each card header shows which agent produced it: `⬡ Forge's feature distribution`

**Data tab**:
- Paginated table of customers in the active segment
- Row hover: background 120ms `ease` — colour only, no movement
- Sort: no animation (too frequent)

**Report tab**:
- "Generate PDF Report" button → morphing button state (text fades, spinner fades in)

---

### 8. Sidebar

```
┌──────────────────┐
│  ⬡  Segwise      │
│  ────────────    │
│  Model           │  ← Model Switcher lives here
│  ◈ Llama 70B ▾  │
│  API Key: ••• ✎ │
│  ────────────    │
│  Today           │
│  · Segmentation  │
│  · Churn risk    │
│  ────────────    │
│  Yesterday       │
│  · EDA Analysis  │
└──────────────────┘
```

Session item entry: `opacity:0→1` only, 150ms. No slide — rapid creation would be noisy.
Collapsed to rail: width transition 280ms `ease-drawer`.

---

### 9. Segment Detail Side Panel

Slides in from right when clicking a segment row or "View in Dashboard".

```
┌──────────────────────────────────────────────────────────┐
│  ✕                                         ● Priority    │
│                                                          │
│  Digital High-Value Customer               ← Loom's name │
│  "Frequent, high-balance, digitally active"              │
│                                                          │
│  ┌──────┬────────┬────────┬────────┬───────┐            │
│  │ 18%  │ ₹1.8L  │ 22.4   │  4.2   │  87   │            │
│  │ base │ avg bal│ txn/mo │ prodcts│ eng   │            │
│  └──────┴────────┴────────┴────────┴───────┘            │
│                                                          │
│  [Radar chart — Forge's features]                        │
│                                                          │
│  Compass's Recommendations                               │  ← agent attribution
│  · Premium Savings Account                               │
│  · Mutual Fund SIP                                       │
│  · Travel Credit Card                                    │
│                                                          │
│  [↓ Export segment CSV]                                  │
└──────────────────────────────────────────────────────────┘
```

**Entry**: `x:40→0` + `opacity:0→1`, 280ms, `--ease-drawer` curve.
**Exit**: `x:0→40` + opacity, same duration.
Backdrop: `rgba(0,0,0,0)→rgba(0,0,0,0.5)`, 200ms, `ease`.
Content inside does NOT stagger — user wants to read immediately.

---

### 10. Toast Notifications (Sonner)

- Placement: bottom-right
- Used for: export complete, API error, session model changed
- Never used for: tool completions, segment computation (those live in trace stream)
- Enter/exit from bottom-right (spatial consistency)

---

## Animation Opportunities Audit

Every candidate evaluated through: Frequency → Purpose → Speed → Function.

| Moment | Freq | Purpose | Speed | Functional | Verdict |
|---|---|---|---|---|---|
| New agent trace row | Occasional | Spatial consistency | ✓ 200ms | ✓ | **Animate** |
| Agent status `○→⟳→✓` | Occasional | State indication | ✓ 120ms | ✓ | **Animate** |
| Active agent dot pulse | Loading only | State indication | ✓ 1200ms | ✓ | **Animate** |
| Full message block entry | Occasional | Preventing jarring | ✓ 240ms | ✓ | **Animate** |
| HITL card entry | Occasional | State indication | ✓ 220ms | ✓ | **Animate** |
| Follow-up chip stagger | Occasional | Preventing jarring | ✓ 30ms each | ✓ | **Animate** |
| Model dropdown open | Occasional | Spatial consistency | ✓ 200ms | ✓ | **Animate** |
| Chart card entry | Occasional | Preventing jarring | ✓ 240ms | ✓ | **Animate** |
| Segment detail panel slide | Occasional | Spatial consistency | ✓ 280ms | ✓ | **Animate** |
| Trace collapse to disclosure | Once/query | State indication | ✓ 280ms | ✓ | **Animate** |
| Sidebar session item entry | Rare | Preventing jarring | ✓ 150ms | ✓ | **Animate (opacity only)** |
| Active agent label in input | Constant | — | — | — | **No animation** (crossfade 120ms only) |
| Input status indicator | Constant | — | — | — | **No animation** |
| Chart bars/lines internally | Data | — | — | Data density | **No animation** (`isAnimationActive=false`) |
| Table sort | Tens/day | — | — | — | **No animation** |
| Streaming text per character | Constant | — | — | — | **No animation** |
| Button hover colour | Tens/day | Feedback | ✓ | ✓ | **120ms colour only** |
| Model badge update (switch) | Rare | State indication | ✓ | ✓ | **Crossfade 150ms** |

---

## Global Animation Rules

```css
/* Button press — all pressable elements */
.pressable:active {
  transform: scale(0.97);
  transition: transform var(--dur-press) var(--ease-out);
}

/* Entrances — never from scale(0) */
.entering {
  opacity: 0;
  transform: scale(0.96) translateY(6px);
}

/* Reduced motion — always honoured */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Hover — only for pointer devices */
@media (hover: hover) and (pointer: fine) {
  .hoverable:hover {
    background: var(--surface-2);
    transition: background 120ms ease;
  }
}

/* Agent colour utilities */
.agent-atlas { color: var(--agent-atlas); }
.agent-scout { color: var(--agent-scout); }
.agent-forge  { color: var(--agent-forge);  }
.agent-mosaic { color: var(--agent-mosaic); }
.agent-prism { color: var(--agent-prism); }
.agent-compass { color: var(--agent-compass); }
.agent-loom   { color: var(--agent-loom);   }
```

---

## Updated SSE Event Schema (Frontend types)

```ts
type AgentName = 'atlas' | 'scout' | 'forge' | 'mosaic' | 'prism' | 'compass' | 'loom'

type AgentEvent =
  | { type: 'model_info';         data: { model_id: string; display: string } }  // sent first
  | { type: 'agent_start';        data: { agent: AgentName; role: string } }
  | { type: 'agent_complete';     data: { agent: AgentName; duration_ms: number; summary: string } }
  | { type: 'intent_detected';    data: { intent: string; method: string | null; agent_plan: AgentName[] } }
  | { type: 'columns_resolved';   data: { columns: string[]; row_count: number } }
  | { type: 'tool_start';         data: { agent: AgentName; tool: string } }
  | { type: 'tool_progress';      data: { agent: AgentName; progress: number; message: string } }
  | { type: 'tool_complete';      data: { agent: AgentName; duration_ms: number; summary: string } }
  | { type: 'tool_error';         data: { agent: AgentName; error: string } }
  | { type: 'clarification';      data: { question: string; options: string[]; asking_agent: AgentName } }
  | { type: 'text_chunk';         data: { content: string } }
  | { type: 'structured_output';  data: { kind: 'table' | 'chart' | 'csv'; payload: unknown; produced_by: AgentName } }
  | { type: 'suggestions';        data: { chips: string[] } }
  | { type: 'done' }
```

`TraceStream` subscribes to `agent_start`, `agent_complete`, `intent_detected`, `columns_resolved`, `tool_start`, `tool_progress`, `tool_complete`, `tool_error`, `clarification`.

`ChatWindow` subscribes to `text_chunk`, `structured_output`, `suggestions`, `done`.

`ModelBadge` subscribes to `model_info`.

`InputBar` subscribes to `agent_start` to update its active-agent label.

---

## Key Component Files

```
frontend/components/

  agent-trace/
    TraceStream.tsx          # SSE-driven trace panel container
    TraceRow.tsx             # Single agent row (◆●⟳✓✗) with animation
    AgentAvatar.tsx          # Named agent chip with colour dot
    TraceCollapse.tsx        # Folds trace to "▾ Reasoning (N agents, Xs)"
    ToolBadge.tsx            # Coloured tool name badge
    ProgressShimmer.tsx      # Indeterminate loading bar

  model-switcher/
    ModelSwitcher.tsx        # Dropdown in sidebar with API key field
    ModelBadge.tsx           # Active model chip in chat header

  chat/
    ChatWindow.tsx           # Message list, scroll management
    MessageBlock.tsx         # Full-width message with agent attribution
    SegmentTable.tsx         # Styled results table (colour-dot per segment)
    HitlCard.tsx             # Clarification card with "Atlas needs input"
    FollowUpChips.tsx        # Staggered suggestion chips
    InputBar.tsx             # Input + active-agent label

  panels/
    ContextPanel.tsx         # Right column: Charts / Data / Report tabs
    SegmentDetailPanel.tsx   # Slide-over with agent attributions on sections
    ChartCard.tsx            # Chart + "produced by Forge" header

  sidebar/
    Sidebar.tsx              # Contains: sessions + ModelSwitcher
    SessionItem.tsx

  shared/
    StatusDot.tsx            # ○⟳✓✗ with crossfade transitions
    ToastProvider.tsx        # Sonner setup
```

---

## What Makes This Stand Out

1. **Trace is always honest** — every named agent (Atlas, Scout, Forge...) appears with their role, what they produced, and how long they took. Nothing is hidden behind "Agent is thinking…"
2. **Model attribution on every message** — `✦ Loom · Llama 3.1 70B` means users always know what powered the answer
3. **Model switching without reload** — switching models mid-session takes effect on the next message; the model badge updates immediately
4. **Agent colours are consistent** — Mosaic is always orange, Compass always amber — across trace rows, HITL cards, chart headers, and panel sections
5. **Zero decorative motion** — every animation has a named justification from the four-gate audit; "it looks cool" is not in the list
6. **Charts never animate internally** — `isAnimationActive={false}` everywhere; data is for reading
