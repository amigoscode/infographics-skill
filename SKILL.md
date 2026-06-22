---
name: infographic
description: "Generate 'HOW X WORKS' educational infographic diagrams for Amigoscode — hand-drawn style diagrams about backend/Java topics, composited onto a branded HTML template and screenshotted into a final PNG. Use this skill whenever the user wants to create an infographic, a 'how X works' diagram, an educational diagram, a tech explainer image, or mentions 'infographic', 'how does X work diagram', 'create a diagram about', 'explain X visually', or any request to produce a branded Amigoscode educational visual. Even if the user just names a topic like 'Docker', 'Kafka', 'Kubernetes', 'Spring Boot', etc. and wants a visual explanation — this skill applies. Triggers on: 'infographic', 'how X works', 'diagram about', 'explain visually', 'educational poster', 'Amigoscode diagram'."
---

# Infographic — "HOW X WORKS" Diagram Generator

Generate branded educational infographic diagrams. The user provides a topic, you generate everything and deliver a final PNG plus caption.

Branding (logo, footer text) is configurable. See **Step 0**. The first time the skill runs it asks for these and saves them to `config.json`.

## Prerequisites

- A `GEMINI_API_KEY` (from https://aistudio.google.com/apikey). Export it in your shell, or copy `.env.example` to `.env` and add it there.
- Node.js with `npx` available. The generator runs via `tsx` and the screenshot step uses Playwright.
- Run `npm install` once in the repo root to install dependencies.

Paths below are written relative to the skill's own directory (the folder containing this `SKILL.md`), referred to as `SKILL_DIR`. Run commands from there, or substitute the absolute install path.

## Output Structure

All output goes into a **capitalized folder with spaces** under the configured output directory (`config.json` field `outputDir`, default `~/infographics`):

```
<outputDir>/How [Topic] Works/
├── How [Topic] Works Raw.jpg    ← the raw hand-drawn diagram from Gemini
├── How [Topic] Works.html       ← intermediate HTML (template + diagram)
├── How [Topic] Works.png        ← FINAL branded image (Playwright screenshot)
└── caption.txt                  ← dev-friendly explanation, no hashtags
```

Examples (with the default `outputDir`):
- `~/infographics/How Docker Works/`
- `~/infographics/How Kafka Works/`
- `~/infographics/How API Gateway Works/`

## Step-by-Step Workflow

### Step 0: Load configuration (first-run onboarding)

Read `SKILL_DIR/config.json`.

**If `config.json` does NOT exist**, this is the first run. Use the Ask tool to collect branding from the user, then write `config.json`. Ask for:

1. **Footer text**: the URL or text shown at the bottom-left of every infographic. Default: `www.amigoscode.com`.
2. **Logo path**: path to an SVG or PNG wordmark shown bottom-center. Default: `assets/amigoscode-wordmark.svg` (the bundled logo). The user can point this at their own file. This logo is also used as the top-left fallback icon for topics with no specific tech icon.

Then write `SKILL_DIR/config.json`:

```json
{
  "footerText": "<their footer text>",
  "logoPath": "<their logo path>",
  "outputDir": "~/infographics"
}
```

`outputDir` is where infographics are saved. Keep its default unless the user asks to change it.

**If `config.json` exists**, load it and use `footerText`, `logoPath`, and `outputDir` throughout the workflow below.

### Step 1: Create the output directory

```bash
mkdir -p "<outputDir>"/"How [Topic] Works"
```

### Step 2: Fill in the prompt template

Take the user's topic and fill in every `[placeholder]` in the prompt template below. Think carefully about:
- **Technical accuracy** — the audience is mid-to-senior Java/backend developers
- **Interview relevance** — concepts should be things engineers discuss in system design interviews
- **Visual clarity** — each "Draw" description must be a specific scene with boxes, arrows, labels — not just an icon name

### Step 3: Generate the diagram image

Use the bundled `generate-diagram.ts` script which sends **all reference images** to Gemini in a single request, giving it maximum context for style-matching. Run from `SKILL_DIR/assets` and pass every reference image with `--ref`:

```bash
cd "SKILL_DIR/assets" && npx tsx generate-diagram.ts \
  --ref reference-rate-limiting.jpeg \
  --ref reference-linux-processes.jpeg \
  --ref reference-kafka.jpeg \
  --prompt "<your filled-in prompt>" \
  --output "<outputDir>/How [Topic] Works/How [Topic] Works Raw.png"
```

The script reads `GEMINI_API_KEY` from your environment, falling back to a `.env` file in the repo root (see Prerequisites).

**Reference images** (all in `SKILL_DIR/assets/`):
- `reference-rate-limiting.jpeg`: "How Rate Limiting Works" diagram
- `reference-linux-processes.jpeg`: "How Linux Processes Work" diagram
- `reference-kafka.jpeg`: "How Kafka Works" diagram

All three are passed as visual context so Gemini can see the exact hand-drawn style, layout structure, colour usage, and illustration quality to replicate.

Note: Gemini may save as `.jpg` instead of `.png`. That is fine, just use whatever extension it produces for the HTML template `src`.

### Step 4: Create the branded HTML

Read the template from `SKILL_DIR/assets/template.html` and create a copy in the output directory, replacing the placeholders:
- `{{TITLE}}`: the topic title, ALL CAPS
- `{{DIAGRAM_SRC}}`: the raw diagram filename (relative to the HTML file, so just the filename works)
- `{{DIAGRAM_ALT}}`: the topic name
- `{{FOOTER_TEXT}}`: `footerText` from `config.json`
- `{{LOGO_PATH}}`: `logoPath` from `config.json` (use the absolute path so the screenshot can resolve it)
- `{{ICON_PATH}}`: the tech icon (see below)

Icon rules:
- Pick the appropriate tech icon URL (lobehub or devicon) for `{{ICON_PATH}}`.
- **If the topic is generic/comparison with no specific technology icon**, set `{{ICON_PATH}}` to the absolute path of `logoPath` from `config.json` (the brand logo doubles as the fallback icon). Do not leave a default placeholder.
- **If the title is long (more than ~25 characters), REMOVE the icon entirely** by deleting the `<div class="tech-icon">...</div>` element. Long titles collide with the icon on the top-left. Short titles like "HOW SSH WORKS" or "HOW DOCKER WORKS" are fine with an icon. Long titles like "10 AI TERMS EVERY DEV MUST KNOW" or "JAVA PASS BY VALUE VS REFERENCE" should have no icon.

Save as `<outputDir>/How [Topic] Works/How [Topic] Works.html`.

### Step 5: Screenshot with Playwright (headless)

Use Playwright CLI in headless mode to capture the branded slide as a PNG. Build the `file://` URL from the absolute path of the HTML file, URL-encoding spaces as `%20`:

```bash
npx playwright screenshot \
  --browser chromium \
  --full-page \
  --wait-for-timeout 3000 \
  "file://<absolute-path-to>/How%20[Topic]%20Works/How%20[Topic]%20Works.html" \
  "<outputDir>/How [Topic] Works/How [Topic] Works.png"
```

The output PNG is the **final deliverable**.

### Step 6: Write the caption

Create `caption.txt` in the output directory using the system prompt below.

**Before writing, READ `assets/caption-examples.md` end-to-end.** That file contains a menu of strong hook patterns and four worked examples each using a DIFFERENT hook style. Pick a hook pattern that matches the topic and rotate styles across the week — never use the same opener twice in a row.

**Caption system prompt:**

```
You are a senior software engineer working at Amigoscode.

You deeply understand backend engineering, Java, Spring Boot, Spring Security, system design, and real world production systems.

You are exceptional at explaining complex technical systems so beginners can understand them clearly.

You are also an expert LinkedIn content creator for the software engineering niche.

Your job is to transform technical infographics or diagrams into educational LinkedIn posts that simplify complex systems and build strong engineering intuition.

Follow these rules strictly:

Do NOT describe the image or infographic.
Do NOT repeat the text from the image.
Go straight into explaining the core concept behind the system.

The opener is the single most important line. Pick ONE of these eight hook patterns and use it:
1. Contrast / parallelism — "Juniors do X. Seniors do Y."
2. Direct reframe — "X is not magic. It is Y."
3. Specific concrete pain — name an exact symptom the reader has felt
4. Imperative / challenge — "Stop doing X." or "Read X before Y."
5. Counter-intuitive claim — open with something readers do not expect to be true
6. Specific number / fact — anchor in a concrete count or surprising statistic
7. Question — ask something the reader cannot confidently answer
8. Incident / story — open with a real (or representative) failure

NEVER open with:
- "Today we are going to talk about..."
- "Let me tell you about..."
- Restating the title of the image
- Any sentence starting with the word "I"

Explain the system using a clear mental model instead of definitions.
Break the concept down step by step in a simple way.
Use bullet points with this symbol only:
→
Do NOT add line breaks between bullet points.
Focus on helping beginners understand how things actually work in practice.
Highlight common mistakes developers make when working with this system.
Show how senior engineers think differently about the same concept.
Keep language simple, clear, and practical.
Avoid jargon unless you explain it simply.
Ask engaging questions at the end to encourage comments and discussion.
Always finish with a soft call to action encouraging readers to follow Amigoscode for software engineering insights.

Output rules:
Plain text only
No markdown
No bold text
No emojis
No special characters
No em dashes or en dashes

Tone:
Senior engineer mentor
Clear
Practical
Insight driven
Beginner friendly but not simplistic
```

Reference `assets/caption-examples.md` for the full hook menu, the "Avoid" list, and four worked examples each demonstrating a different opener. Match the voice and arrow grouping; vary the hook.

### Step 7: Update the CSV tracker (OPTIONAL)

This step is **optional** and only applies if you keep a content-planning CSV. It is **skipped by default**. Run it only when a tracker CSV exists at `config.json` field `trackerCsv` (no default, so absent means skip).

If you use one, the expected columns are `name,generated,rank,instagram,linkedin,youtube`. Update the row for the topic (fuzzy match on `name`, e.g. "How Docker Works" matches "Docker") by setting `generated` to `yes`, appending a new row if none matches:

```bash
python3 -c "
import csv, os
csv_path = os.path.expanduser('<trackerCsv path>')
topic = '[TOPIC NAME]'  # e.g. 'How Docker Works'
rows = list(csv.DictReader(open(csv_path)))
found = False
for r in rows:
    if topic.lower() in r['name'].lower() or r['name'].lower() in topic.lower():
        r['generated'] = 'yes'
        found = True
        break
if not found:
    rows.append({'name': topic, 'generated': 'yes', 'rank': '8', 'instagram': 'false', 'linkedin': 'false', 'youtube': 'false'})
with open(csv_path, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['name','generated','rank','instagram','linkedin','youtube'])
    w.writeheader()
    w.writerows(rows)
print(f'CSV updated: {topic} -> generated=yes')
"
```

### Step 8: Deliver

Show the user the final branded PNG and tell them the output directory path.

---

## Image Generation Prompt Template

This is the complete prompt to fill in and send to the generate-diagram script. Replace every `[placeholder]` with real content for the user's topic.

Always prepend this line at the top of the prompt:
```
These three reference images show the exact visual style I want you to replicate. Match the hand-drawn marker style, layout structure, Amigoscode purple (#7F56D9) accent colour, numbered circles, section headings with underlines, and illustration quality exactly.
```

Then the main template:

```
Create a hand-drawn educational diagram on a clean digital canvas —
like detailed notes a senior dev wrote by hand but scanned perfectly flat.

**Dimensions:** 1000px wide by 1300px tall. Exactly 1000x1300.
Portrait orientation. All content must fit within this canvas
without cropping or overflow.

**Critical style rules:**
- PURE WHITE background — hex #FFFFFF, RGB(255,255,255).
  Do NOT add any paper texture, grain, noise, shadow, or vignette.
  Do NOT make it look like paper or a physical surface.
  Do NOT add warmth, coolness, or any tint whatsoever.
  The background must be completely flat, clean, digital white —
  the same as a blank PNG canvas exported from Photoshop.
  Treat the background as a digital document, not a physical material.
- IMPORTANT: NO title text anywhere on the diagram. Start directly
  with the two intro blurbs. No heading, no banner, no label,
  no box with the topic name. If you are about to draw a title — STOP.
- NO whiteboard frame, NO sticky notes, NO coloured boxes, NO banner headers
- Everything hand-drawn like someone sketched it with markers
- Feels like clean, detailed how-to notes — easy to scan, not cluttered
- Bold ALL CAPS marker-style font for section headings only
- Remaining text in casual handwritten marker style — slightly imperfect
- Hand-drawn numbered circles for each step — outline style only

**Theme colour rules (auto-detected from icon):**

The primary accent colour should match the technology's official brand.
Look up the icon you chose for Step 4 and use that technology's brand colour.

Common mappings (use these, or look up the correct hex for any technology):
- kubernetes → #326CE5 (blue)
- docker → #2496ED (blue)
- git → #F05032 (orange-red)
- java → #E76F00 (orange)
- spring → #6DB33F (green)
- github/githubactions → #181717 (black)
- kafka → #231F20 (dark)
- intellij → #FE315D (pink)
- claude/claudecode → #D97757 (coral)
- postgresql → #4169E1 (blue)
- redis → #DC382D (red)
- mongodb → #47A248 (green)
- react → #61DAFB (cyan)
- python → #3776AB (blue)
- rust → #DEA584 (copper)
- go → #00ADD8 (cyan)
- typescript → #3178C6 (blue)
- No icon / generic → #7F56D9 (Amigoscode purple)

If the user says "use amigoscode theme" or "use purple", override
with #7F56D9 (Amigoscode purple) instead.

Apply the chosen primary colour to: section headings, underlines,
numbered circles, arrows, and coloured segments beneath intro blurbs.

- Dark: #181D2F (Amigoscode dark navy) — always used for body text and outlines
- Background: #FFFFFF (white) — canvas only
- Icons and illustrations use full original brand colours

**Icon rules:**
- All icons rendered in flat bold colour — not outline, not gradient,
  not faded. Solid filled colour like a sticker or flat illustration.

**Illustration rules:**
- Each step must have a small hand-drawn illustrative sketch, not just
  a symbol. Draw a small scene that visually explains the concept.
- All sketches hand-drawn, rough, energetic — not clipart, not flat icons

**Arrow rules:**
- Arrows connect steps WITHIN each section only (1→2→3→4 and 5→6→7→8).
- Do NOT draw any arrow between Section 1 and Section 2.
  Step 4 does NOT connect to Step 5. There is a clear visual break
  between the two sections — the section heading acts as the separator.
- No step should have two outgoing arrows.
- All arrows use the chosen theme colour.

**Tone:** Clean, simple, senior dev hand-drawn notes. Rich coloured
illustrations per concept. Amigoscode brand colours throughout.
Not childish, not cluttered.

**Top blurbs:**
- Left: What [TOPIC] is — [one punchy line, max 20 words]
- Right: Why it matters — [one punchy line, max 20 words]

**Spacing rule:** Leave a LARGE visible gap (about 80-100px of white space)
between the top blurbs and the first section heading below them.
This is important — the intro blurbs and the section content must feel
like two clearly separate zones. Do not let them run together.
Think of it as a paragraph break, not a line break.

**Section 1: [SECTION NAME — 3 words max, ALL CAPS]**
(#7F56D9 underline)
Subtext: [One line explaining what this section covers]
  1. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene — boxes, arrows, labels]
  2. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]
  3. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]
  4. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]

**Section 2: [SECTION NAME — 3 words max, ALL CAPS]**
(#7F56D9 underline)
Subtext: [One line explaining what this section covers]
  1. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]
  2. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]
  3. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]
  4. [Concept name] — [one line explanation, max 20 words]
     | Draw: [specific hand-drawn scene]

**Arrow flow (within sections only — NO arrow between sections):**
Section 1: [Step 1] → [Step 2] → [Step 3] → [Step 4]
Section 2: [Step 5] → [Step 6] → [Step 7] → [Step 8]
(Do NOT connect Step 4 to Step 5 — the section heading is the separator.)
```

## Rules for filling in the template

- Target audience: mid to senior Java and backend developers
- Concepts must be technically accurate and interview-relevant
- Each "Draw" description must be a specific visual scene — describe boxes, arrows, labels, flow — not just an icon name
- Section names must be short, punchy, ALL CAPS, max 3 words
- Arrow flow must be exactly 8 steps — 4 from Section 1 then 4 from Section 2, no branching, one direction only
- Use the auto-detected theme colour from the icon (or #7F56D9 Amigoscode purple for generic topics)
- Never add extra sections, commentary, or text outside the template
- Replace every [placeholder] with real content for the topic

## Reference Images

The `assets/` directory contains reference images that show the exact visual style to match:

- `assets/reference-rate-limiting.jpeg` — "How Rate Limiting Works" diagram
- `assets/reference-linux-processes.jpeg` — "How Linux Processes Work" diagram
- `assets/reference-kafka.jpeg` — "How Kafka Works" diagram

Always pass **all three** reference images via `--ref` flags to `generate-diagram.ts` so Gemini gets maximum visual context for style-matching.

## HTML Template

The template is at `assets/template.html`. It uses placeholders (filled in Step 4) and contains:
- **Top-left**: Tech icon `{{ICON_PATH}}` (80px, from lobehub/devicon CDN, or the brand `logoPath` for generic topics, or removed for long titles)
- **Top-right**: Title `{{TITLE}}` in bold uppercase Inter font (right-aligned)
- **Center**: The diagram image `{{DIAGRAM_SRC}}` (`object-fit: contain`)
- **Bottom-left**: Footer text `{{FOOTER_TEXT}}` (Epilogue font, regular weight), from `config.json`
- **Bottom-center**: Brand wordmark `{{LOGO_PATH}}` (38px height), from `config.json`

The bundled brand asset is `assets/amigoscode-wordmark.svg` (default `logoPath`). Point `config.json` at your own file to rebrand.

Tech icon sources for `{{ICON_PATH}}` (in priority order):
1. **Lobehub CDN**: `https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/{name}-color.png`
2. **Devicon CDN**: `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/{name}/{name}-original.svg`
3. **Brand fallback**: the `logoPath` from `config.json` (local, for generic topics)
