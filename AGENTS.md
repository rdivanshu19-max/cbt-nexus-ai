# Architecture decisions

- AI test and short-note generation call Gemini directly with the server-only `GEMINI_API_KEY`, avoiding dependency on shared gateway credits.- Diwali gift claims and admin-managed gift resources live in separate RLS-protected public tables; downloadable PDFs use a dedicated Storage bucket so student claims persist across devices.
