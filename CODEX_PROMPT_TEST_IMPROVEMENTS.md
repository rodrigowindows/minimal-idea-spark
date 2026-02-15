# Codex Task: Night Worker Test Suite - Reorganize, Document & Expand

## Context

The `minimal-idea-spark` project has a Night Worker (NW) feature that manages AI prompt pipelines across multiple providers (Claude, Codex, Gemini, OpenAI). There are currently **113 NW-specific tests** spread across 6 test files, plus **119 other tests** in the project. All 232 tests pass. The test runner is **Vitest 3.2.4** with **jsdom** environment and **@testing-library/react**.

## Current Test Files

```
src/lib/nightworker/__tests__/providerStatus.test.ts    (42 tests, 539 lines)
src/lib/nightworker/__tests__/pipelineE2E.test.ts       (22 tests, 736 lines)
src/lib/nightworker/__tests__/pipelineTemplates.test.ts  (15 tests, 182 lines)
src/components/night-worker/__tests__/StatusBadge.test.tsx   (14 tests, 69 lines)
src/components/night-worker/__tests__/ProviderBadge.test.tsx (10 tests, 58 lines)
src/components/night-worker/__tests__/NightWorkerContext.test.tsx (10 tests, 111 lines)
```

## Problems to Fix

### 1. EXTRACT SHARED TEST UTILITIES (HIGH PRIORITY)

Both `providerStatus.test.ts` and `pipelineE2E.test.ts` define duplicate types and helpers inline. Extract them to a shared module.

**Create file:** `src/test/mocks/night-worker.ts`

Extract these shared items:
- Types: `ProviderName`, `PromptStatus`, `ProviderResult`, `PromptRecord`, `PipelineStep`, `PipelineConfig`
- Helper functions: `detectProviderResult()`, `mapResultToStatus()`, `formatPrompt()`, `detectCodexStdinMode()`
- Pipeline helpers: `chainNextStep()` (from pipelineE2E), `getNextPipelineStep()` (from providerStatus)
- Factory functions: `createMockPrompt(overrides?)` that returns a full `PromptRecord` with sensible defaults
- Constants: `RATE_LIMIT_KEYWORDS`, `MAX_RESULT_LENGTH` (120000), `MAX_STORE_LENGTH` (500000)

Then update both test files to import from `@/test/mocks/night-worker` instead of defining inline.

**Important:** Do NOT break any existing tests. All 232 tests must still pass after refactoring.

### 2. CREATE TESTING DOCUMENTATION (HIGH PRIORITY)

**Create file:** `src/test/TESTING.md`

Contents:
- **Overview**: Test stack (Vitest + jsdom + @testing-library/react), how to run (`npm run test`, `npm run test:coverage`, `npx vitest run --reporter=verbose`)
- **Directory structure**: Explain where tests live (`__tests__/` folders colocated with source, `src/test/` for shared utilities)
- **Shared mocks**: Document `src/test/mocks/supabase.ts`, `src/test/mocks/contexts.tsx`, `src/test/mocks/night-worker.ts`
- **How to add NW tests**: Step-by-step guide with example
- **Test categories**: Unit tests (provider logic), E2E pipeline flow (data between models), Component tests (UI), Hook tests (React Query)
- **CI**: GitHub Actions runs on every push, coverage uploaded as artifact
- **Conventions**: File naming (`*.test.ts`/`*.test.tsx`), describe block naming, Portuguese test descriptions for NW tests

### 3. ADD HOOK TESTS FOR useNightWorkerApi (HIGH PRIORITY)

**Create file:** `src/hooks/__tests__/useNightWorkerApi.test.ts`

The file `src/hooks/useNightWorkerApi.ts` has 15 hooks and 465 lines with ZERO tests. This is the most critical gap.

Tests needed (use `@tanstack/react-query` testing utilities with `renderHook` from `@testing-library/react`):

**For `normalizePromptItem()`** (pure function, easy to test):
- Normalizes a complete API response correctly
- Fills defaults for missing fields (`queue_stage` defaults to 'prioritized' for pending)
- Handles legacy `filename` field → `name` fallback (removes `.txt`)
- Handles legacy `result` → `result_content` and `path` → `result_path`
- Sets `has_result` from `result` field when `has_result` is missing
- Handles `project_id` field (null by default)
- Handles all pipeline fields with null defaults

**For `normalizeProjectItem()`** (pure function):
- Normalizes a complete project response
- Default name is 'sem-nome' when missing
- Status defaults to 'active' unless explicitly 'archived'
- Stats are properly coerced to numbers
- Handles missing stats (undefined)
- Handles missing created_at/updated_at with fallback to now

**For hooks** (need NightWorkerContext mock wrapper):

Create a test helper `renderNWHook(hook)` that wraps in QueryClientProvider + NightWorkerContext with a mock `apiFetch`:

```typescript
// Pattern to use:
const mockApiFetch = vi.fn()
function renderNWHook<T>(hook: () => T) {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      <NightWorkerContext.Provider value={{
        apiFetch: mockApiFetch,
        config: { baseUrl: 'http://localhost:7777' },
        isConnected: true,
        // ... other required values
      }}>
        {children}
      </NightWorkerContext.Provider>
    </QueryClientProvider>
  )
  return renderHook(hook, { wrapper })
}
```

Hook tests:
- `useHealthQuery`: returns data on success, returns edge fallback on 404, disabled when not connected
- `usePromptsQuery`: fetches and normalizes items, handles both array and `{ prompts: [] }` response formats, refetch interval changes based on active prompts
- `usePromptStatusQuery`: fetches single prompt, falls back to `/status` endpoint on 404, disabled when no id
- `usePipelinePromptsQuery`: sorts by pipeline_step then by updated_at desc
- `useProjectsQuery`: fetches with status filter, normalizes items
- `useProjectPromptsQuery`: clamps limit 1-100, disabled when no projectId
- `useCreatePromptMutation`: posts correct body, invalidates prompt queries on success
- `useCreateProjectMutation`: posts correct body, invalidates project queries on success
- `useMovePromptMutation`: posts to `/move` endpoint, invalidates both list and detail queries
- `useLogsQuery`: disabled on supabase URLs, handles 404 silently

### 4. ADD PAGE COMPONENT TESTS (MEDIUM PRIORITY)

**Create file:** `src/pages/__tests__/NWProjects.test.tsx`

Mock the hooks (`useProjectsQuery`, `useCreateProjectMutation`, etc.) and test:
- Renders project list when data available
- Shows "Nenhum projeto ainda" alert when empty
- Shows loading state
- Create project form validation (name < 3 chars shows error)
- Clicking project selects it (highlights with blue border)
- Template selector populates from `loadPipelineTemplates()`
- Submit button disabled when no project selected
- Shows prompts list for selected project

**Create file:** `src/pages/__tests__/NWSubmit.test.tsx`

- Renders provider selection and form fields
- Form validation (content min 10 chars, target_folder min 3 chars)
- Submits prompt with correct data
- Navigates to detail page on success
- Shows error toast on failure

### 5. ADD COMPONENT TESTS FOR KANBAN (MEDIUM PRIORITY)

**Create file:** `src/components/night-worker/__tests__/KanbanCard.test.tsx`

- Renders prompt name, provider badge, status badge
- Shows time-ago text
- Shows error snippet for failed prompts
- Shows result snippet for done prompts
- Reprocess button visible for done/failed status

**Create file:** `src/components/night-worker/__tests__/MetricCard.test.tsx`

- Renders title, value, icon
- Applies gradient based on accent color
- Shows hint text when provided

**Create file:** `src/components/night-worker/__tests__/WorkerCard.test.tsx`

- Renders worker name, provider, status (active/inactive)
- Shows interval and time window
- Shows target folder
- Shows queue count

### 6. IMPROVE CI PIPELINE (LOW PRIORITY)

**Edit file:** `.github/workflows/test.yml`

Add a coverage threshold check step after the test run:

```yaml
- name: Check coverage threshold
  run: |
    npx vitest run --coverage --coverage.thresholds.lines=60 --coverage.thresholds.functions=50
```

Add a separate NW test summary step:

```yaml
- name: Night Worker test summary
  if: always()
  run: |
    echo "## Night Worker Tests" >> $GITHUB_STEP_SUMMARY
    npx vitest run src/lib/nightworker/ src/components/night-worker/ src/hooks/__tests__/useNightWorkerApi.test.ts --reporter=verbose 2>&1 | tail -30 >> $GITHUB_STEP_SUMMARY
```

## Existing Test Infrastructure (Reference)

### vitest.config.ts
```typescript
environment: "jsdom"
globals: true
setupFiles: ["./src/test/setup.ts"]
include: ["src/**/*.{test,spec}.{ts,tsx}"]
coverage: { provider: "v8", reporter: ["text", "json", "html"] }
alias: { "@": "./src" }
```

### src/test/mocks/contexts.tsx
Provides `TestProviders` wrapper with `QueryClientProvider`, `TooltipProvider`, `MemoryRouter`. Use this for all page/component tests.

### src/test/mocks/supabase.ts
Provides `mockSupabaseClient` with full auth mock. Use when testing components that touch Supabase directly.

### Key Types (src/types/night-worker.ts)
- `PromptItem`: id, name, provider, status, queue_stage, content, target_folder, pipeline_*, project_id
- `NightWorkerProject`: id, name, description, default_target_folder, status, stats
- `PipelineConfig`, `PipelineTemplate`, `PipelineStep`

## Rules

1. **Do NOT delete or rename any existing test files** - only refactor imports
2. **All 232 existing tests must still pass** after changes
3. **Use the existing patterns**: `describe/it/expect` from vitest, `render/screen/userEvent` from @testing-library
4. **Test descriptions in Portuguese** for NW tests (matching existing convention)
5. **Use `vi.mock()` for module mocking**, `vi.fn()` for function mocks
6. **Each test file should have a JSDoc comment at the top** explaining what it covers
7. **Import shared NW mocks from `@/test/mocks/night-worker`** after creating it
8. Run `npx vitest run --reporter=verbose` at the end to verify everything passes

## Expected Final State

```
src/test/
├── TESTING.md                          (NEW - documentation)
├── setup.ts                            (existing)
├── mocks/
│   ├── supabase.ts                     (existing)
│   ├── contexts.tsx                    (existing)
│   └── night-worker.ts                 (NEW - shared NW types, helpers, factories)

src/lib/nightworker/__tests__/
├── providerStatus.test.ts              (REFACTORED - imports from shared mocks)
├── pipelineE2E.test.ts                 (REFACTORED - imports from shared mocks)
├── pipelineTemplates.test.ts           (unchanged)

src/components/night-worker/__tests__/
├── StatusBadge.test.tsx                (unchanged)
├── ProviderBadge.test.tsx              (unchanged)
├── NightWorkerContext.test.tsx          (unchanged)
├── KanbanCard.test.tsx                 (NEW)
├── MetricCard.test.tsx                 (NEW)
├── WorkerCard.test.tsx                 (NEW)

src/hooks/__tests__/
├── useNightWorkerApi.test.ts           (NEW - biggest addition)

src/pages/__tests__/
├── NWProjects.test.tsx                 (NEW)
├── NWSubmit.test.tsx                   (NEW)
```

Target: from 232 tests to ~320+ tests, all passing.
