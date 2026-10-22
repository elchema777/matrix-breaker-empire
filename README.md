# Matrix Leaf (tobacco trade tracker)

A second installable PWA lives in this repo at `/tobacco/` (source in `src/tobacco/`, entry `tobacco/index.html`).
Live URL once merged to `main`: `https://elchema777.github.io/matrix-breaker-empire/tobacco/`

- Log buys, sales, payments, IOUs and expenses (grams or oz, 1 oz = 28 g by default)
- Stock at weighted-average cost, profit per sale, cash vs. accrual, who owes you (FIFO aging)
- Customer profiles with tiers (VIP / Regular / New / Cold), behavior stats and history
- Charts: cumulative profit, revenue vs profit, $/g spread, stock, best weekdays, top customers, ticket sizes
- Access-code lock screen (privacy gate, not encryption). Data is stored on-device in `localStorage` (`tobacco_v1`); use Settings → Export Backup.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
