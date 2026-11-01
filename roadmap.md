# Roadmap

## Platform upgrade (10 features, from uploaded brief)
Integrate into the existing NEXUS CBT — upgrade overlapping features, never duplicate.

- [ ] 1. Scoreback Review: question-wise mistake classification, recoverable marks, potential score, detailed explanations (upgrade Results page)
- [ ] 2. Tukkabazi: reattempt mode for skipped questions after submission, verified answers + solutions; original scores untouched
- [ ] 3. My Error Book: auto-save wrong questions, bookmarks, personal/voice notes, subject/chapter filters, mistake tags, revision tracking, reattempt
- [ ] 4. Personalized Boosters: weak-chapter, mistake and speed boosters from real performance
- [ ] 5. Easy Solutions: simplified explanations alongside detailed ones, EN / HI / Hinglish
- [ ] 6. Question Type Practice: MCQ, MSQ, Numerical, Assertion-Reason, Match-the-Following practice modes
- [ ] 7. Smart Test Generation: PYQ-based chapter weightage + difficulty-balanced selection
- [ ] 8. Flashcards: formula / reaction / concept, bookmarking, revision tracking
- [ ] 9. Study Planner: daily tasks, 7-day planning, automatic backlog, JEE Main/Advanced syllabus tracking
- [ ] 10. Mobile Reading Modes: four customizable question-reading themes
- [ ] DB migration supporting all of the above
- [ ] End-to-end verification of each feature


## RankVortex-inspired complete UI
- [ ] Collect desktop and mobile reference screenshots (site blocks automated access)
- [ ] Replace global theme, typography, surfaces, controls, navigation, and motion
- [ ] Restyle landing, auth, dashboard, tests, history, AI tools, notes, results, profile, admin, and exam console
- [ ] Verify desktop and mobile layouts visually

## PDF to CBT AI
- [x] Replace the Gemini runtime key securely
- [ ] Validate PDF conversion end-to-end with a real test PDF

## AI test upgrades
- [x] Multi-subject / multi-chapter / multi-topic selection
- [x] Custom question count + duration
- [x] Difficulty levels (easy / moderate / hard / very hard) that are genuinely calibrated
- [x] Integer-type question option (20% per subject, non-negative integer answers)
- [x] Fix full-syllabus test generation (batched + parallel)
- [x] Progress animation ("12 / 75 questions generated") for tests and notes
- [x] Faster generation

## Bugs
- [x] Account deletion must delete the auth user (currently can log back in)

## UI
- [x] Pill header + chip labels + window cards on Dashboard, Short Notes, Saved Notes, Results
- [x] Admin panel mobile polish
- [x] Mission console phone polish
