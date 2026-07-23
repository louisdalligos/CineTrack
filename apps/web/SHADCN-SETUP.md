# shadcn component installation (E7-S2)

Run from `apps/web`. These fetch canonical component source into
`src/components/ui/` and add their Radix dependencies.

```bash
npx shadcn@latest add \
  button card input label badge select tabs skeleton separator \
  dropdown-menu sheet tooltip alert dialog sonner chart avatar
```

If the CLI asks about overwriting `components.json` or `lib/utils.ts`, decline —
both are already configured for this project.

| Component                       | Used by                                         |
| ------------------------------- | ----------------------------------------------- |
| `button`                        | every screen                                    |
| `card`                          | dashboard stats, watchlist rows, auth forms     |
| `input`, `label`                | login and register forms                        |
| `badge`                         | watchlist status badge                          |
| `select`                        | status selection on watchlist and movie details |
| `tabs`                          | watchlist status filters                        |
| `skeleton`                      | loading states across all data screens          |
| `separator`, `sheet`, `tooltip` | required by `sidebar`                           |
| `dropdown-menu`                 | theme toggle                                    |
| `alert`                         | error states                                    |
| `dialog`                        | remove confirmation                             |
| `sonner`                        | toast feedback on mutations                     |
| `chart`                         | dashboard genre breakdown                       |
| `avatar`                        | sidebar account row                             |

The sidebar itself pulls in the most dependencies, so add it after the above:

```bash
npx shadcn@latest add sidebar
```

That also creates `src/hooks/use-mobile.ts`, which the sidebar needs for its
responsive sheet behaviour.
