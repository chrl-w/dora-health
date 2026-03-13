# Dora Health — Design System

> Read this file at the start of every Claude Code session before writing any UI code.
> Do not deviate from these tokens without explicit instruction.

---

## Quality bar

> "A vet clinic designed by the team behind Headspace — warm, trustworthy, quietly delightful."

The demographic is pet owners in their 30s. Every detail should feel considered. Warm colours, characterful copy, delightful moments — but never childlike or amateur.

---

## Fonts

| Role | Family | Import |
|------|--------|--------|
| Display + headings | Bricolage Grotesque | Google Fonts |
| Body, labels, badges | DM Sans | Google Fonts |

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
```

Tailwind config:
```js
fontFamily: {
  bricolage: ['"Bricolage Grotesque"', 'sans-serif'],
  'dm-sans': ['"DM Sans"', 'sans-serif'],
}
```

---

## Type scale

| Role | Font | Size | Weight | Tailwind class |
|------|------|------|--------|----------------|
| Display | Bricolage | 28px | 700 | `font-bricolage font-bold text-[28px]` |
| Heading 1 | Bricolage | 22px | 600 | `font-bricolage font-semibold text-[22px]` |
| Heading 2 | Bricolage | 17px | 600 | `font-bricolage font-semibold text-[17px]` |
| Metric | Bricolage | 24px | 700 | `font-bricolage font-bold text-[24px]` |
| Body | DM Sans | 15px | 400 | `font-dm-sans font-normal text-[15px]` |
| Label | DM Sans | 13px | 500 | `font-dm-sans font-medium text-[13px]` |
| Caption | DM Sans | 12px | 400 | `font-dm-sans font-normal text-[12px]` |
| Badge | DM Sans | 11px | 500 | `font-dm-sans font-medium text-[11px]` |

**Rules:**
- Sentence case everywhere — no ALL CAPS labels
- No font sizes below 11px
- Section labels use Label style in text-secondary colour

---

## Colour tokens

### Foundations

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#FDFAF7` | Page background |
| Surface | `#FAF6F0` | Cards, bottom sheets |
| Surface raised | `#F0E8DA` | Input fields, inner panels, form areas |
| Border | `#E4D9CC` | Card borders, dividers, progress tracks |
| Border strong | `#D4C8BA` | Hover states, drag handles |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| Text primary | `#1C1917` | Headings, primary content |
| Text secondary | `#78716C` | Labels, metadata, icons |
| Text tertiary | `#A8A29E` | Placeholders, hints, empty states |

### Primary action

| Token | Hex | Use |
|-------|-----|-----|
| Primary | `#C4623A` | Buttons (filled), toggles on, links, focus rings |
| Primary hover | `#A8502E` | Button hover / pressed state |
| Primary surface | `#FDF0EB` | Icon pill backgrounds, selected tag backgrounds |

### Medication accents

Assigned in order as medications are added. Each medication gets one accent + surface pair.

| Name | Accent | Surface | Assignment |
|------|--------|---------|------------|
| Terracotta | `#C4623A` | `#FDF0EB` | Slot 0 (first medication) |
| Sage | `#7D9E7E` | `#EDF5ED` | Slot 1 |
| Warm brown | `#8B7355` | `#F5EDE0` | Slot 2 |
| Muted olive | `#7A8C6E` | `#EBF0E8` | Slot 3 |
| Dusty rose | `#A07060` | `#F5EAE6` | Slot 4 |
| Slate blue | `#6B8FA8` | `#E8F0F5` | Slot 5 |

### Status

| Token | Text hex | Surface hex | Use |
|-------|----------|-------------|-----|
| Positive | `#5F7F60` | `#EDF5ED` | On track, check icons, toggle on |
| Caution | `#7A6A3A` | `#FBF3DC` | Due within 14 days |
| Warning | `#B36B00` | `#FFF5DC` | Due within 5 days |
| Overdue | `#C4393A` | `#FDE8E8` | Past due date |
| Destructive | `#D4536D` | `#FDEAEE` | Remove actions only |

---

## Spacing

Base unit: 4px. Use multiples of 4.

| Token | Value | Use |
|-------|-------|-----|
| xs | 4px | Icon gaps, tight inline spacing |
| sm | 8px | Between related elements |
| md | 12px | Card internal gap, between list items |
| lg | 16px | Card padding, section gaps |
| xl | 24px | Sheet padding horizontal |
| 2xl | 32px | Sheet padding bottom |

---

## Border radius

| Token | Value | Use |
|-------|-------|-----|
| sm | 8px | Buttons, badges, small inputs |
| md | 10px | Cards, medication cards |
| lg | 12px | Form panels, inner containers |
| xl | 20px | Bottom sheet top corners |
| full | 9999px | Pills, toggles, icon circles, avatar rings |

---

## Component patterns

### Cards

```
bg-[#FAF6F0] rounded-[10px] border border-[#E4D9CC]
shadow-[0px_1px_4px_rgba(228,217,204,0.5)]
p-[16px]
hover:border-[#D4C8BA]
active:scale-[0.99]
transition-all
```

### Input fields

```
bg-[#F0E8DA] border border-[#E4D9CC] rounded-[10px]
px-[14px] py-[10px]
font-dm-sans text-[15px] text-[#1C1917]
placeholder:text-[#A8A29E]
outline-none focus:border-[#D4C8BA]
transition-colors
```

### Primary button (filled)

```
bg-[#C4623A] rounded-[8px] px-[20px] py-[8px]
font-dm-sans font-semibold text-[13px] text-white
hover:bg-[#A8502E] transition-colors
```

### Ghost button (outline)

```
border border-[#C4623A] rounded-[8px] px-[16px] py-[9px]
font-dm-sans font-semibold text-[13px] text-[#C4623A]
hover:bg-[#FDF0EB] active:scale-[0.99] transition-all
```

### Close button

```
w-[30px] h-[30px] rounded-full border border-[#E4D9CC]
bg-[#FAF6F0] flex items-center justify-center
hover:bg-[#F0E8DA] transition-colors
```

### Icon pill

```
w-[36-40px] h-[36-40px] rounded-full flex items-center justify-center
bg-[medication.surface]  /* use medication accent surface colour */
icon: w-[18px] h-[18px] color: medication.accent
```

### Bottom sheet

```
fixed bottom-0 left-0 right-0 z-50
bg-[#FAF6F0] rounded-t-[20px]
shadow-[0px_-4px_20px_rgba(0,0,0,0.1)]
max-w-[402px] mx-auto max-h-[85vh] flex flex-col
```

Handle:
```
w-[36px] h-[4px] rounded-full bg-[#D4C8BA]
centered, pt-3 pb-2
```

Overlay:
```
fixed inset-0 bg-black/30 z-40
```

### Toggle

```
w-[40px] h-[24px] rounded-full p-[2px]
checked: bg-[#C4623A]
unchecked: bg-[#D4C8BA]
thumb: w-[20px] h-[20px] rounded-full bg-white shadow-sm
animate x: 0 (off) → 16px (on), spring stiffness 500 damping 30
```

### Status badge

```
font-dm-sans font-medium text-[11px]
px-[8px] py-[3px] rounded-full
colour: use status token pair (text + surface)
```

### Section label

```
font-dm-sans font-medium text-[13px] text-[#78716C]
mb-[8-10px]
```

### Form panel (inner container)

```
bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px]
```

---

## Animation

Use Framer Motion for all transitions.

| Element | Animation |
|---------|-----------|
| Bottom sheet open | y: 100% → 0, spring damping 28 stiffness 300 |
| Bottom sheet close | y: 0 → 100% |
| Overlay | opacity 0 → 1, duration 0.2s |
| Content swap (edit/view) | opacity + y: 4px, duration 0.15s, AnimatePresence mode="wait" |
| DatePicker dropdown | opacity + y: -10px, duration 0.15s |
| Button press | active:scale-[0.98] or active:scale-[0.99] |

---

## Data rules

- **Never display fake timestamps.** Only show time if it was captured. If not, show date only.
- **Never let users manually set "next due" dates.** Calculate from "given on" + frequency.
- **Never colour-code health metric deltas** without knowing reference ranges. Show deltas neutrally.
- **Medication colours** are assigned by slot index, not by name. First medication = slot 0 (terracotta).

---

## Mobile frame

The app renders inside a constrained mobile frame:

```
max-w-[402px] min-h-[874px]
bg-[#FDFAF7]
sm:rounded-[40px]
pt-[60px] px-[20px] pb-[40px]
```

All bottom sheets use `max-w-[402px] mx-auto` to stay within this frame.

---

## Do not

- Use purple or blue as primary or accent colours
- Use `ALL CAPS` for any text
- Use native browser date inputs — always use the custom `DatePicker` component
- Use font sizes below 11px
- Add shadows heavier than `shadow-[0px_1px_4px_rgba(228,217,204,0.5)]` on cards
- Hardcode white (`#FFFFFF`) as page background — use `#FDFAF7`
- Add emoji to UI (use Lucide icons or SVG illustrations only)
