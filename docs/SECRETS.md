# Secrets in this repository

The full rule lives in the bot repository (`JonnyBot/docs/ECOSYSTEM.md`, "Secrets"; setup in `JonnyBot/docs/DEV-SETUP.md`, "Secret scan"). Short version:

- Never commit, print or paste a real secret (Discord OAuth client secret, `NEXTAUTH_SECRET`, `JONNYBOT_INTERNAL_API_SECRET`, tokens, DB URLs). `.env*` files stay local (`.env.example` only has names).
- Never grep `.env*` wholesale; read one key and never echo it.
- Test secrets are built at runtime or obviously fake. Literals that look like real tokens fail GitGuardian and the CI "Secret Scan" job.
- Install the pre-commit hook once per clone: `sh tools/install-hooks` (needs the pinned gitleaks 8.30.1 binary on `PATH` or in `GITLEAKS_BIN`, kept outside the repository). It prints only rule id, file and line.
- Allow-list entries go in `.gitleaks.toml`, specific and with a reason. Never use `--no-verify`.
- A real secret ever committed: stop, tell Drake (rotation and history cleaning are his call).
