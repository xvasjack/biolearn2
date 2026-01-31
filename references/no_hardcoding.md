## Never hardcode filesystem entries

The terminal filesystem is dynamic. It is scanned from `template/{category}/{storyline}/` on disk.

To add/remove files or directories: edit the files on disk under `template/`. The API picks them up automatically. Do NOT add file listings to frontend TypeScript.

### How it flows

1. `template/{category}/{storyline}/` on disk — single source of truth
2. `frontend/src/routes/api/templates/[...path]/+server.ts` — `/filesystem` endpoint recursively scans that dir, skips `.gitkeep`, appends `/` to subdirs, returns `{ data_dir, filesystem }` JSON
3. `frontend/src/lib/services/templateService.ts` — `fetchFilesystemStructure()` calls the endpoint, stores result in `templateFilesystem`
4. `frontend/src/lib/terminal/filesystem.ts` — `baseFilesystem` is `{}` (empty fallback). `getFilesystem()` merges `templateFilesystem` into it. `o_*` entries are filtered client-side (only shown after tool execution)
