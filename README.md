# EduLearn: educational content and adaptive learning platform

A full-stack web app (Node 22, Express, SQLite, WebSocket, vanilla ES-module front end, no build step) for learners from Pre-Nursery to A-Level, plus vocational, language and regional-curriculum courses.

## Run it
```bash
npm install
ADMIN_EMAIL=you@school.example ADMIN_PASSWORD='choose-a-strong-one' npm start   # first run creates your admin account
# open http://localhost:3000
npm test                      # API tests (use a built-in sample-data fixture, never loaded by the server)
```
There are no demo or sample accounts. A fresh install is empty: sign in with the admin account above, then people register themselves (with email confirmation).
Requires Node 22 or newer (uses the built-in `node:sqlite`).

## What is in it
| Area | What it does |
|---|---|
| Onboarding | Email/password with show/hide eye and strength meter, **email confirmation link before first sign-in** (domain/MX check, typo hints, throwaway domains blocked), optional on-device face enrolment (face-api.js; only a 128-number template reaches the server, encrypted), head-turn liveness, optional ID-photo match, guardian consent for under-18s, educators pick or create a school and generate class codes |
| Content | Courses by grade and subject; text, video, PDF, SCORM 1.2/2004, 3D/AR (model-viewer) and VR (A-Frame) lessons; creator studio with moderator review |
| Assessment | Practice, adaptive, test and exam; MCQ, multi-select (partial credit), true/false, short answer; auto-grading; compulsory tests enforced server-side; deadlines auto-submit; **tests and exams can be taken once, and only the teacher can allow a retake** (logged, one extra attempt per grant); CSV export of results |
| Adaptive engine | Per-topic mastery ratings (Elo style); next question chosen by difficulty gap |
| AI feedback | Study Buddy chat after a result. Uses Claude if `ANTHROPIC_API_KEY` is set, otherwise a rule-based tutor. Never reveals hidden answers. Detects distress and alerts staff |
| Proctoring | Pre-exam check (face, hands, surroundings with motion and object detection), then continuous monitoring (second face, identity mismatch, objects, tab leaving). The system flags; a teacher reviews every flag; learners can appeal; snapshots deleted after 30 days |
| Gamification | XP, levels, daily streaks, 15 badges, leaderboards (opt-out) |
| Community | Class chat rooms (WebSocket), forums, moderation (profanity, personal-info blocking for minors, reports, mutes), under-13s limited to class rooms |
| Study hub | **Planner** (daily goal, focus timer, weekly chart, streak), **flashcards** with spaced repetition (Again/Hard/Good/Easy, bulk import), **notes** (search, pin), **tasks** with due dates and priorities |
| Calendar | Month view of personal events, class events set by teachers, assessment open/close dates and task deadlines |
| Messages | Direct messages between learners and their own teachers (learner-to-learner private chat is off for safety), moderated, unread badges, rate limited |
| Class tools (teachers) | **Attendance** (present/absent/late/excused, rates), **gradebook** (class matrix, averages, learners needing support, CSV), **announcements** (pinned, notify the class) |
| Parent view | Parents register as "Parent" and link a child with a one-time code the child creates in Settings (works once, expires in 48 hours, child can remove access any time). They see results, attendance, deadlines, courses, topic strengths and notices, can message the child's teachers, and never see messages, Study Buddy chats or camera images |
| Loading feedback | A progress bar at the top and skeleton placeholders whenever data is loading, plus a "still loading, your connection may be slow" hint after 5 seconds |
| Notice board | Learners see announcements and their own attendance |
| Platform | Accessibility settings, dark theme, en/fr/rw/sw interface, installable PWA, audit log, rate limiting, CSP, health and metrics endpoints |

## Deploy
See `.env.example`, `Dockerfile` and `deploy/` (docker compose and nginx). Read `docs/ARCHITECTURE.md` before relying on it at scale.

## What you must know before real use
- **Scale is designed for, not proven.** The code runs as one process on SQLite. Multi-region, millions of concurrent users and a managed database are an architecture path (documented), not something tested here.
- **Object detection** (phones, books in the room scan) needs the COCO-SSD model. Set `COCO_MODEL_URL` to a copy you host; otherwise the room scan runs in motion-only mode and says so.
- **Face recognition is probabilistic.** It will have false matches and false rejects, worse for some lighting and skin tones. That is why it flags for human review and never fails a learner automatically.
- **Children and biometrics.** Face data of minors needs a lawful basis and guardian consent. Rwanda's data-protection law (Law No. 058/2021) and your school's policies apply. Have them reviewed before launch.
- **Camera proctoring is deterrence, not proof.** A determined cheater can use a second device out of frame.

## Deploy with Netlify (front end) + a backend host
Netlify cannot run this server (it needs a long-running process, a disk and WebSockets), so split it:
1. Deploy the backend where a disk is available (`render.yaml` is a ready example; the `Dockerfile` works anywhere). Note its URL. Back up `DATA_KEY`: losing it makes face templates unreadable.
2. In `netlify.toml` replace `BACKEND` with that host. In `public/config.js` set `wsUrl` to `wss://<that host>/ws`.
3. Connect the repo to Netlify (publish directory `public`, no build command), or run `netlify deploy --prod --dir=public`.
The browser talks only to your Netlify domain for pages and `/api`; chat connects straight to the backend. Netlify proxied requests have size and time limits, so very large video or SCORM uploads may fail through the proxy; test with your biggest file.

## Email confirmation (read this before going live)
New accounts get a confirmation link and cannot sign in until they click it. Set `SMTP_*`, `MAIL_FROM` and `APP_URL` (see `.env.example`). A Gmail address with an App password works. In production the server refuses sign-ups if SMTP is not configured, rather than pretending to send. In development the link is printed in the server console. The MX check only catches made-up domains; the link is what proves the mailbox is real. Gmail limits sending to roughly 500 messages a day, so use a mail service (Brevo, Mailgun, SES) for a large school.

## Retakes
Tests and exams allow one attempt. After a learner submits, the Start button is replaced by "Completed". The teacher opens Results, finds the learner and presses **Allow retake** (optionally with a reason). That adds exactly one attempt and notifies the learner. Practice and adaptive quizzes stay open for repeat practice.

## GitHub
Push the project to a repository: `.github/workflows/ci.yml` runs the tests on every push. GitHub Pages only serves static files, so it cannot run the server; deploy as described above (Netlify for the front end, a Docker host for the API).


## Question bank and personalisation

- **Maths question bank**: 2,613 generated questions across 34 topics, plus 34 lessons and 3 practice courses. Answers are computed by code (deterministic seed), so each key is correct. It is seeded automatically; run `npm run seed:bank` to add it to an existing database. It covers maths only. Other subjects need content from your teachers.
- **Personalise** (`#/customize`): 16 colour themes, 23 backgrounds, 144 avatars (12 shapes x 12 colours), 9 avatar frames, 5 page transitions, 7 celebration effects and 3 hover styles. Students unlock some of them as they level up. Choices are saved to the account and respect the reduced-motion setting.

## Offline mode and Firebase (Settings → Data & sync, `#/sync`)

- **Offline**: pages you have opened are cached on the device. Notes, tasks, flashcards, planner, calendar and study time can be saved with no internet. They sit in the browser's localStorage and upload automatically when the connection returns. Tests, exams, sign-in and messages always need the server (by design, for exam integrity and privacy). Notes created offline appear in lists after they upload.
- **Firebase**: paste the `firebaseConfig` block from the Firebase console on the Data & sync page. While online, a copy of the person's notes, decks, planner and calendar is written to Firestore (`edulearn_users/{userId}/data/*`) every few minutes and after each upload. The platform database stays the source of truth; Firebase is an extra online copy. To set one config for every user, put it in `public/config.js` as `firebase: { ... }`.
- Enable Firestore and Anonymous sign-in, and use rules that require a signed-in session. Never use open rules.

## Sign-in names and Firestore rules

- People can sign in with their **email or a username** (optional, chosen at sign-up: 3 to 20 letters, numbers, dot or underscore, unique) plus their password.
- Fake emails are stopped by the EduLearn server, not by Firestore: format and typo-domain check, disposable-domain list, DNS mail-record check, and a confirmation link that must be clicked before the first sign-in.
- `firebase/firestore.rules` holds the Firestore rules. Paste them in Firebase console → Firestore → Rules → Publish (or `firebase deploy --only firestore:rules`).
- Test the rules before publishing (needs Java): `cd firebase && npm i firebase-tools @firebase/rules-unit-testing && npx firebase emulators:exec --only firestore --project hedu-learn "node rules.test.mjs"`. It checks 15 allowed and refused cases.

## Automatic exam stop (camera-proctored assessments)

Teachers turn it on per assessment ("Stop the exam automatically…", on by default for proctored exams).
- Each separate irregular incident adds points (looking away 2, face missing 3, tab switch 3, second person 6, phone 8, face mismatch 8, and so on). The same kind within 5 seconds counts once.
- At 6 points the learner gets a visible warning. At 12 points the page freezes, the attempt is closed on the server and scored with the answers already saved, and the learner is taken to their result.
- Monitoring that goes silent for 10 minutes also stops the attempt (checked every minute).
- A stopped attempt uses up the learner's attempt, even if the assessment allows several. Only the teacher can allow another try: Proctoring review → "Allow a retake" (or "Keep the points"). The learner can send an appeal with their side of what happened.
- Teachers and class teachers are notified with the evidence timeline. Limits are in `server/routes/proctor.js` (`STOP_PTS`, `WARN_AT`, `STOP_AT`).

## Email on Render (why sign-up said "email not set up")

Free Render instances block SMTP ports, so Gmail SMTP does not work there. Use Brevo (free, 300 emails a day, HTTPS):
1. Create a free Brevo account, open Senders and verify your address (a Gmail address works).
2. In Brevo → SMTP & API → API keys, create a key.
3. In Render → your service → Environment add `BREVO_API_KEY` (the key), `MAIL_FROM` = `EduLearn <your.verified.address@gmail.com>` and `APP_URL` = your site address. Redeploy.

Until email is set up, sign-up still works: accounts are active immediately and nobody is asked to confirm an email (`EMAIL_CONFIRMATION=auto`). Once a provider is set, the confirmation link is required again. Set `EMAIL_CONFIRMATION=on` to always require it (sign-up then pauses if email breaks), or `off` to never require it.

## Account types
Student, General user (an adult learning on their own, no school needed), Parent, Creator and Educator can all create accounts and sign in with email or username. General users get the learner experience: courses, study tools, calendar, community and certificates.

## Accounts in Firebase (online) and email confirmation by Firebase

In production the server uses the Firebase web config already in `public/config.js` (override with `FIREBASE_API_KEY`; `FIREBASE_AUTH=off` turns it off).
- **Sign-up** creates the account in Firebase Authentication (visible in the console under Authentication → Users) and Firebase emails the confirmation link. No SMTP or Brevo is needed. The person cannot sign in until they open that link, so a made-up address never gets in.
- **Sign-in** accepts email or username. If the server's own database was wiped (for example a Render free instance restarting), signing in with email and password rebuilds the account from Firebase.
- Accounts created before this was connected are copied to Firebase the next time their owner signs in.
- Password changes and account deletion are applied in Firebase too.
- **One-time setup in the Firebase console**: Authentication → Get started → Sign-in method → turn on **Email/Password**. Optionally edit Authentication → Templates → Email address verification (sender name, language, message). Until Email/Password is on, the server logs a warning and uses the other email options instead.
- What this does not cover: learning data (progress, results, notes) still lives in the server's database. On Render that needs a paid plan with a persistent disk (see `render.yaml`), otherwise it resets when the instance restarts. The Firestore copy of notes, decks, planner and calendar (Data & sync page) is separate.
