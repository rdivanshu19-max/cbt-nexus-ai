# Architecture decisions

- AI test and short-note generation call Gemini directly with the server-only `GEMINI_API_KEY`, avoiding dependency on shared gateway credits.