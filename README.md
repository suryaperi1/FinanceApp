# FinanceApp — Red30 Tech dashboards

Three views of the same Red30 Tech financial data:

| Path | What it is |
|---|---|
| `Spreadsheets/` | Source workbooks (financial statements, budget, expenses, sales, products, customers) |
| `mobile/` | React Native (Expo + TypeScript) mobile app — see [mobile/README.md](mobile/README.md) |
| `dashboard.py` | Interactive Streamlit web dashboard (`streamlit run dashboard.py`) |
| `Web/Red30 Tech Dashboard.html` | Static HTML snapshot of the consolidated dashboard |

## Mobile app quick start

```bash
cd mobile
npm install
npm start
```

Then scan the QR code with Expo Go. The app reads `Spreadsheets/` at build time.
