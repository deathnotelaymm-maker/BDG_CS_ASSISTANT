# Technical Analysis — v1.15.4-r2

## Exact inference failure

The original expression produced a Map without explicit generic parameters:

```ts
const sectionRuntime = new Map(
  (runtime?.section_snapshot || []).map((item: any) => [Number(item.id), item]),
);
```

With the surrounding `any` expression and array tuple inference, TypeScript selected a value type of `{}`. Therefore:

```ts
compiled?.clipped
compiled?.hash
```

were invalid under `strict: true`.

## Corrected contract

```ts
type PromptRuntimeSectionSnapshot = {
  id: number;
  section_key: string;
  title: string;
  content: string;
  priority: number;
  clipped: boolean;
  hash: string;
};
```

The map is now explicitly constructed as:

```ts
new Map<number, PromptRuntimeSectionSnapshot>(...)
```

## Risk assessment

- Runtime logic: unchanged
- API contract: unchanged
- Database: unchanged
- Migration: none
- Prompt publication: unchanged
- Chat memory reset: unchanged
- Security behavior: unchanged
- Rollback: restore the single previous TSX file or use the installer backup
