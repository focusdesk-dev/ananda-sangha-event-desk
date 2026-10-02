# ANANDA SANGHA EVENT DESK — PHASE 2 NGO DATABASE

Baseline: Phase 1 stable v1.0.129.
Development branch: phase2-development.

This Phase 2 scope carries forward the decisions from the prior “Design NGO Database Flow” discussion through the requested cutoff.

## 1. One integrated Ananda application

The Event Desk and meditation-class database remain in one desktop application.

Main navigation will include:
- Dashboard
- Events & Classes
- Attendee Master
- Volunteer Master
- Student Progress
- Kriyaban Master
- Reports

Events retain the Phase 1 event-registration workflow. Meditation classes use a separate class/batch workflow inside the same application and share the same people data.

## 2. Permanent Student Master

Use one permanent student identity per person. Do not create a new student for each course or repeat batch.

A student may also already exist as an Attendee, Volunteer, or Kriyaban. Search/matching uses name/mobile and should link identities rather than duplicate them.

Student record keeps the complete history across Level 1, Level 2, Level 3, Level 4 and Kriya.

The student record must show:
- Name
- Mobile
- linked Attendee/Volunteer/Kriyaban identity where applicable
- level history
- batch history
- attendance history
- level completion dates
- progression history
- Kriya status/year when known
- notes

Historical students may be entered even when the exact old batch or year is unknown. Unknown historical batch/year is allowed and must not prevent the person becoming a Kriyaban.

## 3. Course structure and progression

Meditation progression is:
Level 1 → Level 2 → Level 3 → Level 4 → Kriya / Complete.

A level and a batch are different concepts. Each level can have many batches over many years.

Progression must never erase the earlier level/batch history.

## 4. Recurring batches

Each batch has its own permanent record.

Batch fields include:
- Level
- Batch number/name
- start date
- end date
- start year grouping
- status: Upcoming / Current / Completed
- assigned Acharya(s)
- assigned assisting Volunteer(s)
- class/session dates
- roster
- notes

Cross-year batches belong to the year in which the batch STARTED. Example: a December 2026 batch finishing January 2027 remains grouped under 2026.

Current/upcoming records remain prominent. Past records are collapsible/filterable by year, level, status and search.

## 5. Enrolment / attempts

A student can have separate enrolment attempts for the same level.

Each enrolment stores:
- student
- batch
- level
- enrolment date
- attendance by class/session
- classes attended
- classes missed
- outcome
- completion date
- progressed-to-next-level status/date
- follow-up/contact history

Approved outcomes include:
- Completed
- Did Not Complete / Incomplete
- Withdrew

Repeating a level creates another enrolment attempt; it does not overwrite the old one.

## 6. Attendance

Attendance is per class/session, not only a final yes/no.

For every batch and every student show:
- total classes
- attended count
- missed count
- attendance detail by date
- completion/outcome
- progressed status

Batch summary must show enrolled, completed, missed/incomplete and progressed counts.

## 7. Outreach / progression lists

The system automatically creates stage-specific outreach lists.

When a new Level 2 batch starts: show students who completed Level 1 but have NOT progressed to Level 2.

When a new Level 3 batch starts: show students who completed Level 2 but have NOT progressed to Level 3.

When a new Level 4 batch starts: show students who completed Level 3 but have NOT progressed to Level 4.

For Kriya outreach: show students who completed Level 4 but have NOT received/progressed to Kriya.

A person who already progressed must never continue appearing in the outreach list for the previous stage.

Outreach tracking stores:
- Not Contacted
- Contacted
- Interested
- Declined / Not Interested
- Registered
- contact date
- notes

Contacting someone does NOT auto-enrol them in a batch. Registration is a separate action.

Outreach reports can be downloaded/exported.

## 8. Example progression logic to preserve

Example Level 1 Batch 1:
Ram, Ankit, Sahil, Hriday.
Ram, Ankit and Sahil progress toward Level 2; Hriday does not complete.

Later Level 1 batch:
Nikhil, Urvashi, Poonam.
Nikhil and Urvashi progress.

Level 2 records remain batch-specific. If Ankit and Sahil complete before Ram, Ram remains eligible for Level 2 follow-up until he later completes/progresses. Once progressed, he disappears from the earlier-stage outreach list.

## 9. Kriya / Kriyaban integration

When a student receives Kriya, the person becomes/links to Kriyaban Master automatically.

Kriyaban Master must retain the person’s previous meditation-class history.

For old Kriyabans, previous level/batch details may be unknown. That is acceptable.

Store “Kriya received year/date” when known. Unknown year/date is allowed for historical records.

A Kriyaban may also be a Volunteer or Attendee. These are linked identities, not mutually exclusive types.

## 10. Event integration

The existing event system and the new student system share people lookup.

When registering for an event, searching a person by name/mobile should be able to identify that person’s linked Student and Kriyaban status without creating a duplicate person.

From a Student Progress record provide an action to register that person for an event.

Event records and class records remain separate operational records while using linked master identities.

## 11. Acharya and volunteer assignments

Each meditation batch can have one or more assigned Acharyas and assisting Volunteers.

Reports must be able to show:
- batches taught/assisted by each Acharya
- batches assisted by each Volunteer
- attendance/progression summaries for those batches

## 12. Events & Classes combined view

One combined “Events & Classes” area lists annual events and meditation-class batches.

Useful filters:
- Year
- Type: Event / Class
- Level
- Status
- Search

A class card shows Level and Batch. Event cards continue to show event information.

Past records remain available rather than being deleted.

## 13. Student Progress screen

Student Progress gives one-person history.

Show:
- course progress across L1-L4 and Kriya
- batch history
- completion/incomplete/not-started states
- attendance counts
- completion dates
- progression dates
- current outreach status
- action to enrol/register for next class when eligible
- action to register the person for an event

## 14. Reports / downloads

Provide downloadable/exportable reports for:
- Individual batch roster
- Batch attendance
- Batch completed/incomplete/progressed summary
- Level-wise student register
- Students who completed but did not progress
- Repeat/incomplete students
- Outreach/contact list for next level
- Kriya outreach list
- Student full progress history
- Annual class summary
- Acharya assignment report
- Volunteer assignment report
- Combined Events & Classes annual totals

If “Level 2 Batch 2” is starting, staff must be able to download the relevant Level 1 pool including people who completed but never progressed and people who need repeating/follow-up, while excluding anyone who already progressed to Level 2.

## 15. Data preservation

Phase 2 extends the existing local app data. Existing Phase 1 Volunteers, Attendees, Kriyabans, VIPs, Events and registrations must remain intact.

New class/student structures are additive. No Phase 1 record is to be deleted during migration.

Backups must include the new Student Master, batches, enrolments, attendance, outreach/contact history, Acharya assignments and Kriya progression data.

## 16. Sadhana chart / connected mobile extension

The discussed Sadhana workflow is part of the Phase 2 architecture but requires a connected/cloud component beyond the current local-only desktop database.

Required end-state:
- Student can use a mobile app to fill their own Sadhana chart at home.
- The student record links that chart to the correct class/student identity.
- An authorised Acharya can view the assigned student’s Sadhana chart from a phone when needed.
- The desktop NGO database and connected student/Acharya experience use the same permanent person/student identity.
- Cloud synchronisation is required for cross-device viewing; the local Event Desk alone cannot provide remote phone access.
- Mobile delivery eventually requires Android/iOS packaging/distribution as discussed.

The desktop Phase 2 data model must therefore use stable IDs and fields that can later synchronise to the connected service without rebuilding the Student Master.

## 17. Phase 2 implementation order

1. Shared identity/linking model and Student Master.
2. Levels, recurring batches and year grouping.
3. Enrolment attempts and per-session attendance.
4. Progression and outreach engine.
5. Kriya → Kriyaban automatic linking.
6. Events & Classes combined dashboard.
7. Student Progress screen.
8. Reports/downloads.
9. Acharya/Volunteer assignment views.
10. Backup/migration validation from Phase 1.
11. Connected Sadhana/mobile/cloud layer after the desktop data model is stable.

Phase 1 stable v1.0.129 remains untouched while all work is developed and tested in phase2-development.
