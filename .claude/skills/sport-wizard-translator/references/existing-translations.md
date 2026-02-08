# Existing Translations Reference

This file contains examples from the Sport Wizard codebase showing established Swedish translations. **Always check this for consistency** before creating new translations.

## Current Translation Files

Translations are stored in: `src/locales/sv/{namespace}.json`

### Common Namespace (src/locales/sv/common.json)

```json
{
  "buttons": {
    "save": "Spara",
    "cancel": "Avbryt",
    "delete": "Ta bort",
    "edit": "Redigera",
    "add": "Lägg till",
    "close": "Stäng",
    "confirm": "Bekräfta"
  },
  "alerts": {
    "noAlerts": "Inga varningar"
  }
}
```

**Key patterns:**
- "Add" → "Lägg till" (NOT "Addera")
- "Delete" → "Ta bort" (NOT "Radera")
- "Edit" → "Redigera" (NOT "Editera")
- "No alerts" → "Inga varningar"

### Configuration Namespace (src/locales/sv/configuration.json)

```json
{
  "header": {
    "title": "Spel- och Lagkonfiguration"
  },
  "squad": {
    "selectTitle": "Välj Trupp (5-15 Spelare) - Valda: {{count}}",
    "addPlayerTitle": "Lägg till Spelare i Ditt Lag",
    "selectAll": "Välj Alla",
    "allSelected": "Alla Valda",
    "temporaryLabel": "(Tillfällig)",
    "noPlayers": {
      "title": "Inga Spelare Tillagda Än",
      "description": "Din laglista är tom. Lägg till spelare för att börja ställa in ditt spel."
    }
  },
  "matchDetails": {
    "opponentLabel": "Motståndarlags Namn",
    "venueLabel": "Arena"
  },
  "gameSettings": {
    "periodsLabel": "Antal Perioder",
    "durationLabel": "Periodlängd (minuter)",
    "alertLabel": "Bytesvarning"
  },
  "goalies": {
    "header": "Tilldela Målvakter",
    "periodLabel": "Period {{period}} Målvakt",
    "placeholder": "Välj Målvakt"
  },
  "captain": {
    "header": "Tilldela Kapten",
    "label": "Lagkapten",
    "hint": "Valfritt - välj en lagkapten för denna match",
    "noCaptain": "Ingen Kapten"
  },
  "liveLinkNotifications": {
    "authRequired": "Autentisering Krävs",
    "authRequiredMessage": "Du måste vara inloggad med ett lag för att dela en live match-länk.",
    "creating": "Skapar live match-länk...",
    "linkCopied": "Länk Kopierad!",
    "linkCopiedMessage": "Live match-länk kopierad till urklipp!",
    "liveMatchUrl": "Live Match-URL",
    "failed": "Misslyckades med att skapa live match-länk",
    "failedWithError": "Misslyckades med att skapa live match-länk: {{error}}"
  },
  "matchTypes": {
    "league": {
      "label": "Liga",
      "description": "Officiell ligamatch"
    },
    "friendly": {
      "label": "Träningsmatch",
      "description": "Träningsmatch eller vänskapsmatch"
    },
    "cup": {
      "label": "Cup",
      "description": "Turnering eller cupmatch"
    },
    "tournament": {
      "label": "Turnering",
      "description": "Turneringsmatch eller slutspel"
    },
    "internal": {
      "label": "Intern",
      "description": "Intern träning eller övningsmatch"
    }
  },
  "venueTypes": {
    "home": {
      "label": "Hemma",
      "description": "Matchen spelas på hemmaplan med bekanta omgivningar."
    },
    "away": {
      "label": "Borta",
      "description": "Matchen spelas på motståndarens arena."
    },
    "neutral": {
      "label": "Neutral",
      "description": "Matchen spelas på neutral plan för båda lagen."
    }
  }
}
```

**Key patterns:**
- "Squad" → "Trupp"
- "Team" → "Lag"
- "Player" → "Spelare"
- "Match" → "Match"
- "Goalkeeper" → "Målvakt"
- "Captain" → "Kapten"
- "Period" → "Period"
- "Venue" → "Arena"
- "Opponent" → "Motståndare"
- "Select" → "Välj"
- "Assign" → "Tilldela"
- "Authentication" → "Autentisering"
- "Link" → "Länk"
- "Clipboard" → "Urklipp"
- "Failed" → "Misslyckades"

**Match Types:**
- "League" → "Liga"
- "Friendly" → "Träningsmatch"
- "Cup" → "Cup" (unchanged)
- "Tournament" → "Turnering"
- "Internal" → "Intern"

**Venue Types:**
- "Home" → "Hemma"
- "Away" → "Borta"
- "Neutral" → "Neutral" (unchanged)

## Established Terminology

### Sports Terms
- Game/Match → **Match** (always)
- Squad → **Trupp**
- Team → **Lag**
- Roster → **Laglista**
- Player → **Spelare**
- Goalkeeper → **Målvakt**
- Captain → **Kapten**
- Period → **Period**
- Substitution → **Byte**

### Actions
- Add → **Lägg till**
- Remove/Delete → **Ta bort**
- Edit → **Redigera**
- Select → **Välj**
- Assign → **Tilldela**
- Save → **Spara**
- Cancel → **Avbryt**
- Confirm → **Bekräfta**
- Close → **Stäng**

### Status & Labels
- Optional → **Valfritt**
- Temporary → **Tillfällig**
- Selected → **Vald** / **Valda** (plural)
- All → **Alla**

### Compound Terms
- Squad size → **Truppstorlek**
- Team captain → **Lagkapten**
- Match format → **Matchformat**
- Period duration → **Periodlängd**
- Team roster → **Laglista**

## Natural Phrasing Examples

These show how existing translations prioritize natural Swedish over literal translation:

| English | Literal (❌) | Natural (✅ in codebase) |
|---------|-------------|------------------------|
| Game & Squad Configuration | Spel & Trupp Konfiguration | Spel- och Lagkonfiguration |
| Add Players to Your Team | Addera Spelare till Ditt Lag | Lägg till Spelare i Ditt Lag |
| No Players Added Yet | Inga Spelare Adderade Än | Inga Spelare Tillagda Än |
| Your team roster is empty | Din laguppställning är tom | Din laglista är tom |
| Optional - select a team captain | Valfritt - välj en lagkapten | Valfritt - välj en lagkapten för denna match |

## Component Usage Pattern

Components use translations via `useTranslation` hook:

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('configuration');

  return (
    <div>
      <h1>{t('header.title')}</h1>
      <button>{t('buttons.save')}</button>
      <p>{t('squad.selectTitle', { count: selectedCount })}</p>
    </div>
  );
}
```

**Key points:**
- Import `useTranslation` from 'react-i18next'
- Specify namespace: `useTranslation('namespace')`
- Use `t('key.path')` for simple translations
- Use `t('key.path', { variable: value })` for interpolation
- Nested keys use dot notation: `'header.title'`, `'squad.selectTitle'`

## Namespace Organization

Current namespaces:
- **common**: Shared UI elements (buttons, generic labels)
- **configuration**: Configuration/setup screen specific terms

When adding translations, use appropriate namespace:
- Generic buttons/actions → `common`
- Screen-specific terms → screen namespace (e.g., `configuration`, `game`, `profile`)
