# Isaak v3.0 - Enhanced Intelligence System

## Overview

**Isaak v3.0** adds five critical capabilities to transform the AI assistant from reactive to **proactive, intelligent, and user-centric**:

1. **Analytics** - Track which messages work and user engagement patterns
2. **Conversation History** - Persistent chat storage with export/search capabilities
3. **Voice Integration** - Text-to-speech with Web Speech API (ES, EN, PT, FR)
4. **Deadline Alerts** - Automated reminders for fiscal deadlines
5. **User Preferences** - Complete customization of Isaak's behavior

---

## Architecture

### New Hooks (5 total)

```
apps/app/hooks/
├── useIsaakAnalytics.ts         (Events tracking & summary)
├── useConversationHistory.ts    (Chat session management)
├── useDeadlineNotifications.ts  (Fiscal calendar integration)
├── useIsaakVoice.ts             (Web Speech API wrapper)
└── useIsaakPreferences.ts       (localStorage persistence)
```

### New Components (3 total)

```
apps/app/components/isaak/
├── IsaakPreferencesModal.tsx        (Settings UI with 5 tabs)
├── IsaakDeadlineNotifications.tsx   (Animated deadline alerts)
└── [Modified] IsaakSmartFloating.tsx (Enhanced with v3 features)
```

### Data Flow

```
User Interaction
    ↓
IsaakSmartFloating (detects & dispatches)
    ├→ trackEvent() [useIsaakAnalytics]
    ├→ addToHistory() [useConversationHistory]
    ├→ speak() [useIsaakVoice]
    └→ preferences check [useIsaakPreferences]
    ↓
localStorage (persistent across sessions)
```

---

## Feature Details

### 1. Analytics (useIsaakAnalytics)

**What It Tracks:**
- `bubble_view` - When a proactive message appears
- `bubble_click` - When user interacts with it
- `bubble_dismiss` - When user closes it
- `chat_open` / `chat_close` - Chat window lifecycle
- `suggestion_click` - Which suggestions work
- `message_sent` - User engagement frequency
- `voice_start` / `voice_end` - Voice usage patterns

**Key Methods:**
```typescript
trackEvent(event) - Log single event
getAnalyticsSummary() - Get KPIs (bubble views, chat opens, etc.)
getTopMessages() - Find best performing suggestions
exportAnalytics() - Download CSV for analysis
clearOldEvents(daysToKeep) - Maintain history
```

**Storage:** localStorage (max 500 events, auto-rotating)

**Use Case:** Product team can see "Suggestion #3 has 45% click-through rate"

---

### 2. Conversation History (useConversationHistory)

**Features:**
- Auto-creates session on chat open
- Saves every message (user + assistant)
- Tracks metadata (context, role, duration)
- Searchable by title/content
- Exportable as JSON

**Key Methods:**
```typescript
startNewSession(context, role) - Begin tracked conversation
addMessage(message, sessionId) - Store message with timestamp
getRecentSessions(10) - Last N conversations
searchSessions(query) - Full-text search
exportSession(id) - Download as JSON
getHistoryStats() - Total messages, date range, etc.
```

**Storage:** localStorage (max 50 sessions)

**Auto-Features:**
- First message becomes session title (auto-truncated)
- Session title updates as timestamp + context
- Auto-cleanup of old sessions

**Use Case:** User can "Continue our conversation from yesterday" with full context

---

### 3. Voice Integration (useIsaakVoice)

**Technologies:**
- Browser's native `SpeechSynthesisUtterance` API
- No external dependencies
- Automatic language detection

**Supported Languages:**
- Spanish (es-ES)
- English (en-US)
- Portuguese (pt-BR)
- French (fr-FR)

**Configurable Parameters:**
```typescript
voiceRate: 0.5 - 2.0x (speed)
voicePitch: 0.5 - 2.0x (tone)
voiceVolume: 0 - 1 (amplitude)
voiceLanguage: es | en | pt | fr
```

**Key Methods:**
```typescript
speak(text, language) - Speak text with current settings
stop() - Interrupt speaking
pause() / resume() - Control playback
isSpeaking() - Check if currently speaking
speakWithEmphasis(parts) - Array-based speaking (future)
```

**In IsaakSmartFloating:** Automatically speaks assistant responses when `voiceEnabled: true`

**Use Case:** User reads emails while Isaak explains tax calculations aloud

---

### 4. Deadline Alerts (useDeadlineNotifications)

**Built-in Spanish Calendar:**
```
Q1 VAT    → April 20
Q2 VAT    → July 20
Q3 VAT    → October 20
Annual Tax → June 30
Societies  → April 25
```

**Features:**
- Auto-initializes at first load
- Automatic repeat for next year
- Custom deadline support
- Smart notifications (14 days out, 7 days, 1 day, day of)
- Color-coded urgency (blue → orange → red)

**Key Methods:**
```typescript
addDeadline(deadline) - Add custom deadline
getUpcomingDeadlines(30) - Next 30 days
checkDeadlineNotifications() - Find items needing alert
getDeadlineStatus(deadline) - "Hoy", "En 3 días", etc.
```

**Component Behavior:**
- Shows at top-right, below Topbar
- Dismissible per deadline
- Shows date in Spanish format
- Updates hourly

**Use Case:** Accountant never misses a filing deadline

---

### 5. Preferences Modal (useIsaakPreferences)

**5 Preference Tabs:**

#### Tab 1: Burbujas
- Toggle on/off
- Frequency: Always / Daily / Weekly / Never
- Position: 4 corners
- Auto-dismiss tracking

#### Tab 2: Chat
- Toggle on/off
- Theme: Light / Dark / Auto
- Keep history: yes/no
- Position: bottom-right/left

#### Tab 3: Voz
- Toggle on/off
- Rate slider (0.5-2x)
- Pitch slider (0.5-2x)
- Language selector
- Test button (plays sample)

#### Tab 4: Notificaciones
- Deadline alerts
- Email notifications (future)

#### Tab 5: Privacidad
- Allow analytics
- Per-context enabling (landing/dashboard/admin)
- Export preferences JSON
- Import preferences JSON
- Reset to defaults

**Storage Key:** `isaak_preferences` in localStorage

**Default Values:**
```typescript
{
  bubblesEnabled: true,
  bubbleFrequency: "always",
  chatEnabled: true,
  voiceEnabled: false,
  voiceRate: 1.0,
  voicePitch: 1.0,
  deadlineNotificationsEnabled: true,
  analyticsEnabled: true,
  // ... 12 more settings
}
```

---

## Component Integrations

### IsaakSmartFloating (Enhanced)

**New Features:**
- ✅ Conversation history auto-saving
- ✅ Voice response playback
- ✅ Export conversation button
- ✅ Quick preferences row
- ✅ Analytics tracking
- ✅ Respects preference disable flags

**New Buttons in Header:**
```
[Settings icon] - Quick prefs toggle
[Download icon] - Export this conversation
[X icon] - Close (existing)
```

### IsaakProactiveBubbles (Enhanced)

**New Features:**
- ✅ Respects `bubblesEnabled` preference
- ✅ Honors `bubbleFrequency` setting
- ✅ Tracks bubble views/dismissals
- ✅ Loads previous dismissed list

### IsaakDeadlineNotifications (New)

**Behavior:**
- Mounted in dashboard layout via Suspense
- Auto-initializes with Spanish fiscal calendar
- Shows top-right notifications
- Color-coded by urgency
- Updates hourly

---

## User Flow: "Power User Day"

```
09:00 AM - User logs in
  └─ IsaakProactiveBubbles shows 3 messages (tracked: bubble_view x3)
  └─ User clicks one (tracked: suggestion_click)

10:30 AM - User opens chat
  └─ Session starts (tracked: chat_open)
  └─ IsaakSmartFloating loads with greeting
  └─ User sends message (tracked: message_sent)
  └─ Response auto-spoken (voiceEnabled: true)
  └─ Both stored in ConversationHistory

11:00 AM - Top-right notification appears
  └─ "IVA Q2 due in 7 days"
  └─ IsaakDeadlineNotifications shows alert

12:00 PM - User exports chat
  └─ Clicks [Download] button
  └─ JSON file with all messages + metadata saved

01:00 PM - User adjusts preferences
  └─ Opens Footer > "Preferencias Isaak"
  └─ Disables bubbles for today (bubbleFrequency: "daily")
  └─ Exports preferences as JSON backup

Next Day:
  └─ User imports their preferences
  └─ Settings restored exactly as saved
```

---

## Data Privacy & Storage

**localStorage Limits:**
- `isaak_analytics`: 500 events max
- `isaak_conversation_history`: 50 sessions max
- `isaak_deadlines`: ~50-100 entries
- `isaak_preferences`: Single object
- `isaak_voice_config`: Single object

**Total footprint:** ~2-3 MB per user

**Cleanup Strategy:**
- Analytics: Auto-rotates oldest when hitting 500
- Sessions: Auto-rotates oldest when hitting 50
- Deadlines: Automatic yearly, manual delete available
- All can be cleared by "Reset Preferences"

**No Server Sync:** Everything stays local (MVP). Future: Cloud backup option.

---

## TypeScript Interfaces

### Core Interfaces

```typescript
// Analytics
interface AnalyticsEvent {
  timestamp: Date;
  type: "bubble_view" | "bubble_click" | ... (8 types)
  messageId?: string;
  context?: "landing" | "dashboard" | "admin";
  role?: "visitor" | "user" | "admin";
  metadata?: Record<string, any>;
}

// History
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ConversationSession {
  id: string;
  title: string;
  context: "landing" | "dashboard" | "admin";
  role: "visitor" | "user" | "admin";
  messages: ConversationMessage[];
  messageCount: number;
}

// Deadlines
interface Deadline {
  id: string;
  title: string;
  date: Date;
  type: "quarterly_vat" | "annual_tax" | "payment" | "custom";
  context: "dashboard" | "admin";
  priority: "critical" | "high" | "normal";
  notified?: boolean;
}

// Preferences
interface IsaakPreferences {
  bubblesEnabled: boolean;
  bubbleFrequency: "always" | "daily" | "weekly" | "never";
  chatEnabled: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceLanguage: string;
  deadlineNotificationsEnabled: boolean;
  analyticsEnabled: boolean;
  // ... 5 more
}

// Voice Config
interface VoiceConfig {
  enabled: boolean;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}
```

---

## Testing Checklist

- [ ] Analytics: Open chat, send 3 messages, check localStorage
- [ ] Analytics: Click suggestions, verify `suggestion_click` events
- [ ] History: Open chat, send message, close, reopen - history persists
- [ ] History: Export JSON, verify structure
- [ ] Voice: Enable voice, send message, hear response
- [ ] Voice: Adjust rate/pitch, test different languages
- [ ] Deadlines: Check top-right on dashboard, verify Spanish fiscal dates
- [ ] Deadlines: Add custom deadline, verify sorting
- [ ] Preferences: Disable bubbles, refresh - no bubbles appear
- [ ] Preferences: Change frequency to "weekly", verify delay
- [ ] Preferences: Export/import prefs, verify restoration
- [ ] Mobile: All components responsive on iPhone 12 width

---

## Next Evolution (v4.0)

1. **Server-side Sync** - Cloud backup of history + analytics
2. **AI Insights** - "Your top question type is taxes" reports
3. **Voice Commands** - "Isaak, what's my next deadline?"
4. **Multi-language Context** - Spanish AI in Spanish, English AI in English
5. **Advanced Scheduling** - Users define "show bubble at 9 AM only"
6. **Analytics Dashboard** - New `/dashboard/isaak/analytics` page for admins
7. **A/B Testing Framework** - Test different proactive messages against each other

---

## Files Created

```
hooks/
├── useIsaakAnalytics.ts              (200 lines)
├── useConversationHistory.ts         (260 lines)
├── useDeadlineNotifications.ts       (220 lines)
├── useIsaakVoice.ts                  (180 lines)
└── useIsaakPreferences.ts            (240 lines)

components/isaak/
├── IsaakPreferencesModal.tsx         (350 lines)
├── IsaakDeadlineNotifications.tsx    (110 lines)
├── IsaakSmartFloating.tsx            (ENHANCED - 380 lines)
└── IsaakProactiveBubbles.tsx         (ENHANCED - 140 lines)

layouts/
└── app/dashboard/layout.tsx          (ENHANCED - 58 lines)
```

**Total new code:** ~2,100 lines
**Breaking changes:** None (backward compatible)
**Dependencies added:** None (all browser APIs)

---

## Deployment Notes

1. No environment variables needed
2. No database schema changes
3. No API endpoints added (uses existing `/api/chat`)
4. localStorage is sufficient for MVP
5. Safe to deploy in feature branch first
6. Users' existing preferences auto-initialize with defaults

---

## Summary

Isaak v3.0 transforms from a generic chatbot into a **personal AI assistant** that:

✅ **Learns** (analytics tracking user engagement)  
✅ **Remembers** (conversation history with search/export)  
✅ **Communicates** (voice synthesis in 4 languages)  
✅ **Protects** (deadline alerts for fiscal compliance)  
✅ **Respects** (complete user customization via preferences)  

All while staying **100% private** (localStorage), **zero-dependency** (browser APIs), and **production-ready**.
