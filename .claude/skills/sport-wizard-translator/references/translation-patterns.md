# Swedish Translation Patterns

This guide provides patterns for natural Swedish translations that go beyond word-for-word conversion.

## Core Principles

1. **Natural word order over literal translation**
2. **Context-appropriate phrasing**
3. **Concise over verbose**
4. **Consistent with existing translations**

## Common Patterns

### Settings & Configuration

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Settings menu | Application Language | Applikationsspråk | Språk i appen | More natural, conversational |
| Settings label | Language | Språk | Språk | Keep simple |
| Config screen | Game & Squad Configuration | Spel & Trupp Konfiguration | Spel- och Lagkonfiguration | Use hyphens, natural conjunction |
| Button | Save Configuration | Spara Konfiguration | Spara Konfiguration | Literal works here |
| Duration | Period Duration (minutes) | Periodlängd (minuter) | Periodlängd (minuter) | Literal works, keep unit in parens |

### Action Buttons & Commands

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Add action | Add Player | Addera Spelare | Lägg till Spelare | "Lägg till" is natural Swedish |
| Remove action | Remove Player | Ta bort Spelare | Ta bort Spelare | Literal works |
| Delete action | Delete | Radera | Ta bort | "Ta bort" more common in UI |
| Edit action | Edit | Editera | Redigera | "Redigera" is proper Swedish |
| Confirm action | Confirm | Bekräfta | Bekräfta | Literal works |
| Cancel action | Cancel | Avbryt | Avbryt | Literal works |

### Selection & Status

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Squad selection | Select Squad (5-15 Players) - Selected: {{count}} | Välj Trupp (5-15 Spelare) - Valt: {{count}} | Välj Trupp (5-15 Spelare) - Valda: {{count}} | "Valda" agrees with plural spelare |
| All selected | All Selected | Alla Valda | Alla Valda | Literal works |
| No items | No Players Added Yet | Inga Spelare Adderade Än | Inga Spelare Tillagda Än | "Tillagda" more natural than "Adderade" |
| Empty state | Your team roster is empty | Din laglista är tom | Din laglista är tom | Literal works |

### Descriptions & Labels

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Input label | Opponent Team Name | Motståndarlagets Namn | Motståndarlags Namn | No possessive needed |
| Placeholder | Enter opponent team name (optional) | Skriv in motståndarlags namn (valfritt) | Ange motståndarlags namn (valfritt) | "Ange" more formal/appropriate |
| Helper text | Optional - select a team captain | Valfritt - välj en lagkapten | Valfritt - välj en lagkapten | Literal works |
| Dropdown option | No Captain | Ingen Kapten | Ingen Kapten | Literal works |

### Error & Warning Messages

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Validation error | You have selected {{count}} players, which exceeds the {{format}} limit | Du har valt {{count}} spelare, vilket överstiger {{format}}-gränsen | Du har valt {{count}} spelare, vilket överstiger {{format}}-gränsen på {{max}} | Add concrete limit number |
| Warning | Update the match format or adjust the squad | Uppdatera matchformatet eller justera truppen | Uppdatera matchformatet eller justera truppen | Literal works |

### Status & Progress

| Context | English | ❌ Literal Swedish | ✅ Natural Swedish | Why |
|---------|---------|-------------------|-------------------|-----|
| Loading | Saving... | Sparar... | Sparar... | Use present tense with ellipsis |
| Loading | Syncing team roster... | Synkroniserar laglista... | Synkroniserar laglista... | Present tense |
| Success | ✅ {{message}} | ✅ {{message}} | ✅ {{message}} | Keep emoji, works universally |
| Button state | Creating Link... | Skapar Länk... | Skapar Länk... | Present tense |

## Word Order Guidelines

### Noun + Adjective vs Adjective + Noun

Swedish and English often differ in word order:

```
English: "Tactical Formation"
Swedish: "Taktisk Formation" ✅ (adjective before noun works)

English: "Substitution Alert"
Swedish: "Bytesvarning" ✅ (compound word) or "Varning för byte" (but keep it simple)

English: "Live Match Link"
Swedish: "Live Match-länk" ✅ (keep "Live" as is, hyphenate compound)
```

### Compound Words

Swedish loves compound words. Combine when natural:

```
English: "match format"
Swedish: "matchformat" ✅ (one word)

English: "team captain"
Swedish: "lagkapten" ✅ (one word)

English: "playing time"
Swedish: "speltid" ✅ (one word)

English: "squad size"
Swedish: "truppstorlek" ✅ (one word)
```

But don't force it when readability suffers:
```
English: "opponent team name"
Swedish: "motståndarlags namn" ✅ (NOT "motståndarlagsnamn" - too long)
```

## Capitalization Rules

### Title Case vs Sentence Case

Swedish uses less capitalization than English:

```
English Headers: "Assign Goalies"
Swedish Headers: "Tilldela Målvakter" ✅ (capitalize first word + nouns)

English Labels: "Team Captain"
Swedish Labels: "Lagkapten" ✅ (capitalize as one word/concept)

English Buttons: "Save Configuration"
Swedish Buttons: "Spara Konfiguration" ✅ (capitalize both words)
```

## Interpolation & Variables

When translations include variables ({{variable}}), maintain natural Swedish grammar:

```
English: "Selected: {{count}}"
Swedish: "Valda: {{count}}" ✅ (plural form to match "spelare")

English: "Period {{period}} Goalie"
Swedish: "Period {{period}} Målvakt" ✅ (same structure works)

English: "You have selected {{count}} players"
Swedish: "Du har valt {{count}} spelare" ✅ (natural flow)
```

## Context-Dependent Translations

Some words translate differently based on context:

### "Setup"
- Configuration screen: "Konfiguration" or "Inställning"
- Action to set up: "Ställ in" or "Konfigurera"
- Initial setup: "Första inställning"

### "Select"
- Action: "Välj"
- State: "Vald" (singular) / "Valda" (plural)

### "Add"
- Action: "Lägg till"
- Past tense: "Tillagd" (NOT "Adderad")

### "Remove" / "Delete"
- General removal: "Ta bort"
- Permanent deletion: "Ta bort" (same - Swedish doesn't distinguish as strongly)

## Common Mistakes to Avoid

❌ **Overly literal**: "Application Language" → "Applikationsspråk"
✅ **Natural**: "Application Language" → "Språk i appen"

❌ **Wrong soccer term**: "Defender" → "Försvarare"
✅ **Correct**: "Defender" → "Back"

❌ **Wrong compound**: "opponent team name" → "motståndarlagsnamn"
✅ **Readable**: "opponent team name" → "motståndarlags namn"

❌ **Wrong word**: "Add Player" → "Addera Spelare"
✅ **Natural**: "Add Player" → "Lägg till Spelare"

❌ **English mixing**: "Live match link" → "Live matchlänk"
✅ **Proper**: "Live match link" → "Live Match-länk" (hyphenate when keeping English word)
