# Testing Guide - Minimal Idea Spark

## Stack

- **Test Runner**: [Vitest 3.2.4](https://vitest.dev/) with `jsdom` environment
- **UI Testing**: [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **User Events**: [@testing-library/user-event](https://testing-library.com/docs/user-event/intro)
- **E2E**: [Playwright 1.49.0](https://playwright.dev/)
- **CI**: GitHub Actions (`.github/workflows/test.yml`)

## Running Tests

```bash
# Run all tests
npm run test

# Run with verbose output
npx vitest run --reporter=verbose

# Run with coverage
npm run test:coverage

# Run specific file
npx vitest run src/lib/nightworker/__tests__/pipelineE2E.test.ts

# Run all Night Worker tests
npx vitest run src/lib/nightworker/ src/components/night-worker/ src/hooks/__tests__/useNightWorkerApi.test.ts

# Watch mode
npx vitest --watch
```

## Directory Structure

```
src/
├── test/                                    # Shared test infrastructure
│   ├── setup.ts                             # Global vitest setup (matchMedia, etc.)
│   ├── TESTING.md                           # This file
│   └── mocks/
│       ├── supabase.ts                      # Supabase client mock
│       ├── contexts.tsx                     # TestProviders wrapper (QueryClient + Router)
│       └── night-worker.ts                  # NW types, helpers, factories
│
├── lib/nightworker/__tests__/               # NW core logic tests
│   ├── providerStatus.test.ts               # Provider I/O, status detection, retry logic
│   ├── pipelineE2E.test.ts                  # Cross-model pipeline flow tests
│   └── pipelineTemplates.test.ts            # Template CRUD and validation
│
├── components/night-worker/__tests__/       # NW component tests
│   ├── StatusBadge.test.tsx                 # Status badge rendering
│   ├── ProviderBadge.test.tsx               # Provider badge rendering
│   ├── NightWorkerContext.test.tsx           # Context and hooks
│   ├── KanbanCard.test.tsx                  # Kanban card component
│   ├── MetricCard.test.tsx                  # Metric card component
│   └── WorkerCard.test.tsx                  # Worker card component
│
├── hooks/__tests__/                         # Hook tests
│   └── useNightWorkerApi.test.ts            # All NW API hooks and normalizers
│
└── pages/                                   # Page-level tests (colocated)
    ├── Auth.test.tsx
    ├── Journal.test.tsx
    └── Opportunities.test.tsx
```

## Shared Mocks

### `src/test/mocks/night-worker.ts`

Contains all shared Night Worker test utilities:

- **Types**: `ProviderName`, `PromptStatus`, `ProviderResult`, `PromptRecord`, `PipelineConfig`, `PipelineStep`
- **Constants**: `MAX_RESULT_INJECT` (120k), `MAX_STORE_LENGTH` (500k), `CODEX_STDIN_THRESHOLD` (8k), etc.
- **Helpers**: `detectProviderResult()`, `mapResultToStatus()`, `formatPrompt()`, `shouldUseStdin()`, `getWorkerStatus()`, `chainNextStep()`, `getNextPipelineStep()`
- **Simulators**: `simulateProviderExecution()`, `simulateProviderFailure()`
- **Factories**: `createMockPrompt()`, `createMockPipelineConfig()`, `createMockNightWorkerContext()`

Usage:
```typescript
import { createMockPrompt, detectProviderResult } from '@/test/mocks/night-worker'

const prompt = createMockPrompt({ provider: 'gemini', status: 'pending' })
```

### `src/test/mocks/contexts.tsx`

Provides `TestProviders` wrapper for page tests:
```typescript
import { TestProviders } from '@/test/mocks/contexts'

render(
  <TestProviders initialRoute="/nw/submit">
    <MyPage />
  </TestProviders>
)
```

### `src/test/mocks/supabase.ts`

Full Supabase client mock:
```typescript
vi.mock('@/integrations/supabase/client', () => supabaseMock)
```

## Test Categories

### 1. Unit Tests (Provider Logic)
Test pure functions that mirror Python worker behavior. Located in `src/lib/nightworker/__tests__/`.

### 2. E2E Pipeline Flow Tests
Test data flowing between different AI models (Gemini -> Codex -> Claude). Validate propagation of `project_id`, `pipeline_id`, `target_folder` across steps.

### 3. Component Tests
Test UI components in isolation with mock data. Use `@testing-library/react`.

### 4. Hook Tests
Test React Query hooks with mocked `apiFetch`. Use `renderHook` from `@testing-library/react`.

## Adding a New NW Test

1. Import shared utilities:
   ```typescript
   import { createMockPrompt, type PromptRecord } from '@/test/mocks/night-worker'
   ```

2. Use `describe` blocks grouped by feature:
   ```typescript
   describe('My Feature', () => {
     it('faz algo esperado', () => {
       const prompt = createMockPrompt({ provider: 'claude' })
       // ... assertions
     })
   })
   ```

3. Test descriptions in **Portuguese** for NW tests (project convention).

4. Run to verify: `npx vitest run path/to/test.test.ts --reporter=verbose`

## Conventions

- File naming: `*.test.ts` / `*.test.tsx`
- Tests colocated with source in `__tests__/` directories
- Use `vi.mock()` for module mocking, `vi.fn()` for functions
- Use `it.each()` for parametrized tests
- One assertion concept per `it()` block
- Shared helpers/types go in `src/test/mocks/`

## CI

Tests run automatically on every push and PR via GitHub Actions:
- **Unit tests**: `npm run test:coverage` with coverage report
- **E2E tests**: Playwright (depends on unit tests passing)
- Coverage report uploaded as artifact (14 day retention)
