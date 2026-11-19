@AGENTS.md
@docs/OVERVIEW.md

# Project docs

`docs/OVERVIEW.md` (imported above) is the map of this app. Read the matching file in `docs/architecture/` before changing an area (listings/unlocks/payments, chat/push, maps, auth/roles, database, UI system), and check `docs/DECISIONS.md` before reversing a choice.

When a task changes behavior, schema, routes, prices or conventions, update the matching doc **in the same commit** and refresh its "verified against commit" line. Point at files instead of pasting code, and record non-obvious reasons in `docs/DECISIONS.md`. If a doc and the code disagree, trust the code and fix the doc.
