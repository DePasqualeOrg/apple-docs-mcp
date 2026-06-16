# Apple Docs MCP Tests

This directory contains comprehensive tests for the Apple Docs MCP server.

## Test Structure

```
tests/
├── helpers/        # Shared test data and helpers (test-helpers.ts)
├── mocks/          # Reusable module mocks (cache, http-client)
├── fixtures/       # Captured real API/JSON responses used by tests
├── tools/          # Per-tool tests (incl. tools/wwdc/ for the WWDC handlers)
├── utils/          # Utility tests (cache, http-client, url-converter, etc.)
├── regression/     # Regression tests guarding specific past bugs
├── response-format.test.ts  # Cross-tool MCP response-shape checks
├── index.test.ts            # Server surface checks
└── setup.ts                 # Jest setup
```

All tests are hermetic: `setup.ts` replaces `global.fetch` with a Jest mock, so
no test reaches the network. Tests drive behavior through mocked
`fetch`/`httpClient` responses or captured fixtures.

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/tools/search-framework-symbols.test.ts

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests with verbose output
pnpm test -- --verbose
```

These tests mock the network for determinism. To exercise the built server against the **live** Apple API (all 18 tools, scanned for rough edges), run the separate real-world check — it is not part of `pnpm test` and needs network egress:

```bash
pnpm run check:live   # see scripts/realworld-check.mjs and CLAUDE.md
```

## Test Coverage Areas

### 1. Unit Tests
- **Tool Functions**: Each tool has comprehensive unit tests covering:
  - Normal operation
  - Error handling
  - Edge cases
  - Input validation
  - Cache behavior

### 2. Cross-tool & regression
- **Response format**: `response-format.test.ts` checks every tool returns a valid MCP shape
- **Regression**: `regression/` guards specific past bugs (e.g. nested responses, dropped enum cases)

## Key Test Patterns

### Mocking
- HTTP requests are mocked to avoid external dependencies
- Cache is mocked to control test data
- File system operations are avoided in tests

### Test Data
- Consistent test data is defined in `helpers/test-helpers.ts`
- Mock responses match actual API response structure

### Assertions
- Tests verify both success and error paths
- Response format is validated
- Edge cases are thoroughly tested

## Adding New Tests

When adding new features:
1. Add unit tests for the core functionality
2. Update integration tests if the feature affects the MCP interface
3. Consider adding E2E tests for user-facing features
4. Ensure all tests pass before committing

## Debugging Tests

To debug failing tests:
1. Run the specific test file with `--verbose`
2. Add `console.log` statements in the test
3. Use `--detectOpenHandles` to find async issues
4. Check mock implementations match actual behavior