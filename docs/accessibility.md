# Accessibility — cc-lens

## Current Status

cc-lens targets WCAG 2.1 Level A compliance for a localhost developer tool.

## Implemented

| Feature              | Status  | Details                                                                |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| Semantic HTML        | Done    | Recharts wrapped with `role="img"` + `aria-label`                      |
| Keyboard navigation  | Done    | All interactive elements focusable via Tab                             |
| Color contrast       | Partial | Dark theme primary palette meets AA; some muted text may fall below    |
| Focus indicators     | Done    | Browser default + Tailwind `focus:ring` on buttons                     |
| Screen reader labels | Done    | Sidebar, bottom-nav, toggle buttons have `aria-label`                  |
| Welcome overlay      | Done    | `role="dialog"` + `aria-modal` + `autoFocus` on dismiss button         |
| Reduced motion       | Partial | CSS transitions respect `prefers-reduced-motion` via Tailwind defaults |

## Known Gaps

| Gap                                    | Severity | Notes                                          |
| -------------------------------------- | -------- | ---------------------------------------------- |
| Data tables missing `aria-sort`        | Low      | Session table uses visual sort indicators only |
| Chart tooltips not keyboard accessible | Low      | Recharts limitation — tooltips require hover   |
| No skip-to-content link                | Low      | Single-page app with sidebar nav               |

## Testing

### Automated

`@axe-core/playwright` is wired into the E2E test suite. Run:

```bash
node scripts/e2e-test.mjs  # includes axe scan on overview page
```

### Manual

1. Tab through all interactive elements — verify focus visible
2. Use screen reader (VoiceOver on macOS: Cmd+F5) on overview page
3. Check color contrast with browser DevTools accessibility panel

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
