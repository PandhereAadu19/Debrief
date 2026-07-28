# Debrief

**Turn meeting recordings into AI summaries and trackable, assignable action items.**

Debrief takes a recorded or uploaded meeting and automatically produces a transcript, a structured AI-generated summary (executive summary, key decisions, risks, and open questions), and an assignable action item checklist — shared with the right teammates, without anyone manually taking notes.

---

## The Problem

Teams have meetings constantly — standups, client calls, planning sessions. Two things consistently go wrong:

- Decisions and action items get lost because nobody writes clean notes during a live conversation.
- Follow-up is inconsistent — "who was supposed to do X?" becomes a guessing game days later.

Debrief solves this with a real, working pipeline: audio in, structured intelligence out.

---

## Existing Solutions & Honest Positioning

| Tool | Approach | Difference from Debrief |
|---|---|---|
| **Fireflies.ai** | Auto-joins live calls (Zoom/Meet/Teams), real-time transcription, 50+ integrations | Debrief is upload/record-after-the-fact, not live-call-integrated — a smaller, focused slice of the same pipeline |
| **Confluence (Atlassian Intelligence)** | Manual, human-typed collaborative meeting notes; AI optionally extracts action items from that typed text | No audio transcription at all — works from text humans already wrote, not from speech |
| **Otter.ai / Fathom** | Real-time call recording + transcription | Same live-infrastructure gap as Fireflies |

**This project does not claim to replace these tools.** It demonstrates the same core technical pipeline — audio → transcript → AI-extracted structured output — built end-to-end with real authentication, a relational database, and access control, as a deliberately scoped, honest, and fully understood system rather than a live-integrated commercial platform.

---

## Features

- **Authentication** — email and Google sign-in (Clerk)
- **Meeting capture** — upload an audio file or record directly in-browser
- **Automatic transcription** — AssemblyAI
- **Structured AI output** — Google Gemini extracts an Executive Summary, Key Decisions, Risks, Open Questions, and a structured Action Item list (task, owner name, priority, due date where mentioned)
- **Retry on failure** — if AI processing fails, a retry button re-triggers the pipeline on the stored audio
- **Task tracking** — each action item is independently marked pending/done by a human, not auto-detected
- **Cross-meeting task dashboard** — a single view aggregating all of a user's open action items across every meeting they're part of, not buried inside individual meeting pages
- **Meeting Creator / Participant roles** — the meeting creator can invite specific teammates to view a shared meeting; participants can check off tasks assigned to them, with an optional `canEdit` permission for editing the summary
- **Dark / light mode**, fully responsive across devices

---

## Roles & Access Model

A simplified, per-meeting role model rather than a global org hierarchy:

| Role | Determined by | Can do |
|---|---|---|
| **Creator** | Created the meeting (uploaded/recorded the audio) | Edit summary/action items, delete meeting, invite/remove participants |
| **Participant** | Invited to a specific meeting | View transcript/summary, check off tasks assigned to them, edit if granted `canEdit` |

There is a single sign-up flow for everyone — no "choose your role" step. Role is contextual per meeting, not a global user attribute, which keeps the permission model simple and correct without building a full organizational hierarchy.

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Clerk (authentication)
- next-themes (dark/light mode)

**Backend**
- Node.js + Express (TypeScript)
- Drizzle ORM
- Neon (serverless Postgres)
- Clerk backend SDK (token verification)

**External APIs**
- AssemblyAI — speech-to-text transcription
- Google Gemini — summarization and structured extraction

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: Neon

---

## Complete Workflow

```
1. User signs up / logs in
2. Dashboard shows: meetings they own, meetings shared with them,
   and a cross-meeting task list of everything assigned to them
3. User creates a new meeting: uploads or records audio, gives it a title
   → meeting record created, status = "uploading"
4. Backend sends audio to AssemblyAI → transcript returned and saved,
   status = "transcribing"
5. Backend sends transcript to Gemini → executive summary, key decisions,
   risks, open questions, and action items (with owners/priority where
   mentioned) returned and saved → status = "completed" (or "failed")
6. Creator opens the meeting: reviews the structured output,
   invites teammates by email if the meeting should be shared
7. Invited Participants see the same meeting, check off their own
   assigned tasks as they complete them in real life
8. Anyone can revisit the Tasks page to see everything still open
   across all their meetings
9. If processing fails at any point, a Retry button re-triggers
   the pipeline on the stored audio
```

This is intentionally **not real-time** — processing happens after the meeting ends, not during a live call. Live-call integration (joining Zoom/Meet, streaming transcription, bot infrastructure) requires infrastructure far beyond what's realistic for this project's timeline, and is the reason products like Fireflies represent a mature, multi-year, funded engineering effort rather than something to replicate in a portfolio project.

---

## Data Model

```ts
meetings: {
  id: uuid
  creatorId: text            // Clerk user id
  title: text
  transcript: text            // AssemblyAI output
  audioUrl: text
  summary: text                 // Gemini-generated executive summary
  keyDecisions: text
  risks: text
  openQuestions: text
  status: text                    // "uploading" | "transcribing" | "completed" | "failed"
  createdAt, updatedAt: timestamp
}

action_items: {
  id: uuid
  meetingId: uuid              // FK -> meetings.id
  task: text
  ownerName: text
  priority: text                  // "high" | "medium" | "low"
  dueDate: timestamp
  status: text                      // "pending" | "done"
  createdAt, updatedAt: timestamp
}

meeting_participants: {
  id: uuid
  meetingId: uuid              // FK -> meetings.id
  userId: text                   // Clerk user id of invited participant
  canEdit: boolean
  invitedAt: timestamp
}
```

Access control: every backend route checks whether the requesting `userId` is either the meeting's `creatorId` or present in `meeting_participants` for that `meetingId` before returning data — this is the enforcement point for the Creator/Participant role model above.

---

## Why This Project

Demonstrates: authenticated full-stack architecture, relational data modeling with a join table for shared access, authorization logic beyond simple per-user ownership, integration of two distinct external APIs (speech-to-text and an LLM) into a real processing pipeline, and honest, deliberate scope decisions explained and defended rather than left implicit.

---

## Future Improvements

Deliberately left out of this project's scope, in the interest of shipping a smaller, fully-working system rather than a larger, unfinished one:

- **Live call integration** — joining Zoom/Meet directly, streaming transcription, bot infrastructure. A multi-week effort on its own; the reason tools like Fireflies represent years of funded engineering.
- **Automatic task-completion detection** — would require monitoring external systems (GitHub, email, calendar) to infer when a task is actually done. Replaced with an honest manual checkbox, consistent with how even mature tools like Confluence handle task completion.
- **Full organizational role hierarchy** — replaced with a simpler, correctly-scoped Creator/Participant model tied to individual meetings rather than a global org structure.
- **Version history** for edited summaries/action items.
- **Notifications** (email/in-app) for new invites or assigned tasks.
- **Analytics dashboard** beyond the basic stats already shown.
- **Granular per-meeting permission settings UI** — the `canEdit` boolean already covers the core need; a full settings panel would be polish on top of polish.

---

## Local Setup

> _Fill in exact commands once finalized — placeholder structure below._

**Prerequisites:** Node.js 18+, a Neon Postgres database, Clerk account, AssemblyAI API key, Google Gemini API key.

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, CLERK_SECRET_KEY, ASSEMBLYAI_API_KEY, GEMINI_API_KEY
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL, Clerk publishable key
npm run dev
```

---

## Live Demo

_Add deployed frontend/backend links here once deployed._