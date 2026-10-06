"""
Red30 Tech financial dashboard.

Reads the workbooks in ../Spreadsheets and renders an interactive Streamlit
dashboard. Run with:

    streamlit run scripts/dashboard.py

Edit any of the PAGE_* functions below to change what a given tab shows, or
add a new function + entry in PAGES to add a tab.
"""

import datetime as dt
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio
import streamlit as st

DATA_DIR = Path(__file__).resolve().parent.parent / "Spreadsheets"

# ---------------------------------------------------------------------------
# Palette & chart styling (see dataviz skill: fixed categorical order, single
# hue for magnitude/ranked bars, legend for every multi-series chart).
# ---------------------------------------------------------------------------
CATEGORICAL = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834", "#4a3aa7", "#e34948"]
BLUE, GREEN, MAGENTA, YELLOW, AQUA, ORANGE, VIOLET, RED = CATEGORICAL
GOOD, CRITICAL = "#0ca30c", "#d03b3b"
SURFACE, GRID, AXIS, INK, INK2 = "#fcfcfb", "#e1e0d9", "#c3c2b7", "#0b0b0b", "#52514e"

pio.templates["red30"] = go.layout.Template(
    layout=go.Layout(
        font=dict(family="system-ui, -apple-system, Segoe UI, sans-serif", color=INK, size=13),
        paper_bgcolor=SURFACE,
        plot_bgcolor=SURFACE,
        colorway=CATEGORICAL,
        xaxis=dict(gridcolor=GRID, linecolor=AXIS, zerolinecolor=AXIS, tickfont=dict(color=INK2)),
        yaxis=dict(gridcolor=GRID, linecolor=AXIS, zerolinecolor=AXIS, tickfont=dict(color=INK2)),
        legend=dict(bgcolor="rgba(0,0,0,0)"),
        hoverlabel=dict(bgcolor=SURFACE, font_color=INK, bordercolor=AXIS),
        margin=dict(l=10, r=10, t=30, b=10),
    )
)
pio.templates.default = "red30"

MONTH_ORDER = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]
MONTHS = set(MONTH_ORDER)


# ---------------------------------------------------------------------------
# Generic parsing helpers
#
# The five-year-summary / annual-forecast / expense workbooks all share the
# same shape: a few title rows, then a header row (years, month names, or
# month timestamps), then labeled data rows. `_find_header_row` locates that
# header row by content rather than a hardcoded row number, since the title
# block is a slightly different number of rows in different files.
# ---------------------------------------------------------------------------

def _is_year_sequence(vals) -> bool:
    """True if vals look like a short run of consecutive calendar years
    (e.g. 2014..2018) rather than ordinary dollar figures that happen to
    fall in the same numeric range."""
    ints = [int(v) for v in vals if isinstance(v, (int, float)) and float(v).is_integer()]
    if len(ints) < 2:
        return False
    ints = sorted(set(ints))
    span = ints[-1] - ints[0]
    return 2000 <= ints[0] and ints[-1] <= 2100 and span == len(ints) - 1 and span <= 6


def _find_header_row(raw: pd.DataFrame) -> int:
    for i in range(len(raw)):
        vals = raw.iloc[i].dropna().tolist()
        if len(vals) < 3:
            continue
        ts_like = sum(1 for v in vals if isinstance(v, dt.datetime))
        month_like = sum(1 for v in vals if isinstance(v, str) and v.strip() in MONTHS)
        if ts_like >= 3 or month_like >= 3 or _is_year_sequence(vals):
            return i
    raise ValueError("Could not locate a header row in sheet")


def _load_titled_sheet(path: Path, sheet_name: str) -> pd.DataFrame:
    """Load one of the title-block workbooks into a long 'Item' + period
    columns frame. Section-header rows (e.g. 'Assets', 'Executive') are kept
    with all-NaN values; filter them out via dropna on a data column."""
    raw = pd.read_excel(path, sheet_name=sheet_name, header=None)
    h = _find_header_row(raw)
    header = raw.iloc[h].tolist()
    header[0] = "Item"
    df = raw.iloc[h + 1:].copy()
    df.columns = header
    df["Item"] = df["Item"].astype(str).str.strip()
    df = df[df["Item"].notna() & (df["Item"] != "nan") & (df["Item"] != "")]
    return df.reset_index(drop=True)


def _period_label(col) -> str:
    if isinstance(col, dt.datetime):
        return col.strftime("%b %Y")
    if isinstance(col, (int, float)):
        return str(int(col))
    return str(col)


def _to_long(df: pd.DataFrame, items=None, drop_total=True) -> pd.DataFrame:
    """Melt a labeled sheet to long form: Item, Period, Value (USD)."""
    value_cols = [c for c in df.columns if c != "Item"]
    if drop_total and value_cols and str(value_cols[-1]).lower().startswith("total"):
        value_cols = value_cols[:-1]
    d = df if items is None else df[df["Item"].isin(items)]
    long = d.melt(id_vars="Item", value_vars=value_cols, var_name="Period", value_name="Value")
    long["PeriodLabel"] = long["Period"].map(_period_label)
    long = long.dropna(subset=["Value"])
    return long


def _row(df: pd.DataFrame, item: str, value_cols=None) -> pd.Series:
    """Return one item's values indexed by readable period label."""
    match = df[df["Item"] == item]
    if match.empty:
        return pd.Series(dtype=float)
    if value_cols is None:
        value_cols = [c for c in df.columns if c != "Item"]
    s = match.iloc[0][value_cols]
    s.index = [_period_label(c) for c in value_cols]
    return s.astype(float)


def fmt_usd(value: float) -> str:
    sign = "-" if value < 0 else ""
    value = abs(value)
    if value >= 1_000_000:
        return f"{sign}${value / 1_000_000:,.1f}M"
    if value >= 1_000:
        return f"{sign}${value / 1_000:,.1f}K"
    return f"{sign}${value:,.0f}"


# ---------------------------------------------------------------------------
# Cached data loaders — one per workbook. Values in the five-year / expense
# workbooks are stored "in thousands" per the sheet titles; we scale to plain
# dollars here so every page works in the same units.
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False)
def load_financial_statement():
    df = _load_titled_sheet(DATA_DIR / "Financial Statement.xlsx", "Sheet1")
    idx_bs = df.index[df["Item"] == "Balance Sheet"][0]
    idx_cf = df.index[df["Item"] == "Cash Flow Statement"][0]
    income = df.iloc[:idx_bs].reset_index(drop=True)
    cashflow = df.iloc[idx_cf + 1:].reset_index(drop=True)
    value_cols = [c for c in income.columns if c != "Item"]
    income[value_cols] = income[value_cols] * 1000
    cashflow[value_cols] = cashflow[value_cols] * 1000
    return income, cashflow


@st.cache_data(show_spinner=False)
def load_balance_sheet_5yr():
    df = _load_titled_sheet(DATA_DIR / "Balance Sheet.xlsx", "5 year review")
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_balance_sheet_monthly(year: str):
    df = pd.read_excel(DATA_DIR / "Balance Sheet.xlsx", sheet_name=year)
    df = df.rename(columns={"Balance Sheet": "Item"})
    df["Item"] = df["Item"].astype(str).str.strip()
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_budget():
    df = _load_titled_sheet(DATA_DIR / "Budget.xlsx", "Sheet1")
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_labor(year: str):
    df = _load_titled_sheet(DATA_DIR / "Labor Expenses.xlsx", year)
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_marketing(year: str):
    df = _load_titled_sheet(DATA_DIR / "Marketing Expenses.xlsx", year)
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_overhead(year: str):
    df = _load_titled_sheet(DATA_DIR / "Overhead Costs.xlsx", year)
    value_cols = [c for c in df.columns if c != "Item"]
    df[value_cols] = df[value_cols] * 1000
    return df


@st.cache_data(show_spinner=False)
def load_product_line():
    path = DATA_DIR / "Product Line.xlsx"
    sales = pd.read_excel(path, sheet_name="Sales Revenue")
    revenue_chart = pd.read_excel(path, sheet_name="Revenue Chart").rename(columns={" Total": "Total"})
    inventory = pd.read_excel(path, sheet_name="Inventory")
    inventory_chart = pd.read_excel(path, sheet_name="Inventory Chart").rename(columns={" Total": "Total"})
    return sales, revenue_chart, inventory, inventory_chart


@st.cache_data(show_spinner=False)
def load_online_sales():
    df = pd.read_excel(DATA_DIR / "US Online Retail Sales.xlsx", sheet_name="Sheet1")
    df["Month"] = df["OrderDate"].dt.to_period("M").dt.to_timestamp()
    return df


@st.cache_data(show_spinner=False)
def load_regional_sales():
    path = DATA_DIR / "US Sales by Region.xlsx"
    sales = pd.read_excel(path, sheet_name="US Sales by Region")
    sales["Month"] = sales["OrderDate"].dt.to_period("M").dt.to_timestamp()
    employees = pd.read_excel(path, sheet_name="Employee Info")
    regions = pd.read_excel(path, sheet_name="Sales Regions")
    return sales, employees, regions


@st.cache_data(show_spinner=False)
def load_customers():
    path = DATA_DIR / "Customer Lists.xlsx"
    sheet_names = pd.ExcelFile(path).sheet_names
    individual_sheet = next(s for s in sheet_names if s.strip() == "Individual")
    business_sheet = next(s for s in sheet_names if s.strip() == "Business")
    individual = pd.read_excel(path, sheet_name=individual_sheet)
    business = pd.read_excel(path, sheet_name=business_sheet)
    return individual, business


# ---------------------------------------------------------------------------
# Chart builders
# ---------------------------------------------------------------------------

def ranked_bar(series: pd.Series, top_n: int = None, currency=True):
    """Horizontal ranked bar for a single magnitude measure. One hue by
    design — the categories are already identified by the axis labels."""
    s = series.dropna().sort_values(ascending=True)
    if top_n:
        s = s.tail(top_n)
    fig = px.bar(x=s.values, y=s.index, orientation="h", color_discrete_sequence=[BLUE], text=s.values)
    fig.update_traces(texttemplate="$%{text:,.0f}" if currency else "%{text:,.0f}",
                       textposition="outside", marker_line_width=0, cliponaxis=False)
    fig.update_layout(showlegend=False)
    fig.update_xaxes(title=None, tickprefix="$" if currency else "", tickformat="~s")
    fig.update_yaxes(title=None)
    return fig


def multi_line(long_df: pd.DataFrame, category_order, currency=True):
    fig = px.line(long_df, x="PeriodLabel", y="Value", color="Item", markers=True,
                  category_orders={"Item": category_order, "PeriodLabel": long_df["PeriodLabel"].unique().tolist()},
                  color_discrete_sequence=CATEGORICAL)
    fig.update_traces(line_width=2)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                       hovermode="x unified")
    fig.update_yaxes(title=None, tickprefix="$" if currency else "", tickformat="~s")
    fig.update_xaxes(title=None)
    return fig


def stacked_bar(long_df: pd.DataFrame, category_order, currency=True, barmode="stack"):
    fig = px.bar(long_df, x="PeriodLabel", y="Value", color="Item",
                 category_orders={"Item": category_order, "PeriodLabel": long_df["PeriodLabel"].unique().tolist()},
                 color_discrete_sequence=CATEGORICAL)
    fig.update_traces(marker_line_width=0)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                       barmode=barmode, bargap=0.2)
    fig.update_yaxes(title=None, tickprefix="$" if currency else "", tickformat="~s")
    fig.update_xaxes(title=None)
    return fig


def single_line(x, y, currency=True, name=None):
    fig = go.Figure(go.Scatter(x=x, y=y, mode="lines+markers", line=dict(width=2, color=BLUE), name=name or ""))
    fig.update_layout(showlegend=False, hovermode="x unified")
    fig.update_yaxes(title=None, tickprefix="$" if currency else "", tickformat="~s" if currency else None,
                      ticksuffix="%" if not currency else None)
    fig.update_xaxes(title=None)
    return fig


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

def page_overview():
    st.header("Overview")
    income, _ = load_financial_statement()
    bs5 = load_balance_sheet_5yr()
    _, revenue_chart, _, _ = load_product_line()

    years = [c for c in income.columns if c != "Item"]
    latest, prior = years[-1], years[-2]

    revenue = _row(income, "Gross Revenue")
    net_income = _row(income, "Net Income")
    total_assets = _row(bs5, "Total Assets")
    cash = _row(bs5, "Cash")

    latest_label, prior_label = _period_label(latest), _period_label(prior)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric(f"Gross Revenue ({latest_label})", fmt_usd(revenue[latest_label]),
              fmt_usd(revenue[latest_label] - revenue[prior_label]))
    c2.metric(f"Net Income ({latest_label})", fmt_usd(net_income[latest_label]),
              fmt_usd(net_income[latest_label] - net_income[prior_label]))
    c3.metric(f"Total Assets ({latest_label})", fmt_usd(total_assets[latest_label]),
              fmt_usd(total_assets[latest_label] - total_assets[prior_label]))
    c4.metric(f"Cash ({latest_label})", fmt_usd(cash[latest_label]),
              fmt_usd(cash[latest_label] - cash[prior_label]))

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Revenue, COGS & Gross Profit (5-year)")
        long = _to_long(income, items=["Gross Revenue", "Cost of Goods Sold", "Gross Profit"], drop_total=False)
        st.plotly_chart(multi_line(long, ["Gross Revenue", "Cost of Goods Sold", "Gross Profit"]),
                         width="stretch")
    with col2:
        st.subheader("Product Revenue by Category")
        s = revenue_chart.set_index("Category")["Total"]
        st.plotly_chart(ranked_bar(s), width="stretch")

    st.caption("Financial figures sourced from Financial Statement.xlsx / Balance Sheet.xlsx (5-year review, "
               "originally reported in US$ thousands, scaled to whole dollars here).")


def page_income_statement():
    st.header("Income Statement")
    income, _ = load_financial_statement()
    years = [c for c in income.columns if c != "Item"]
    year_labels = [_period_label(y) for y in years]

    st.subheader("Revenue, COGS & Gross Profit")
    long = _to_long(income, items=["Gross Revenue", "Cost of Goods Sold", "Gross Profit"], drop_total=False)
    st.plotly_chart(multi_line(long, ["Gross Revenue", "Cost of Goods Sold", "Gross Profit"]), width="stretch")

    opex_items = ["Research and Development", "Sales and Marketing", "General and Administrative",
                  "Salaries and Wages", "Interest", "Rent and Utilities", "Other"]
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Operating Expense Breakdown")
        long_opex = _to_long(income, items=opex_items, drop_total=False)
        st.plotly_chart(stacked_bar(long_opex, opex_items), width="stretch")
    with col2:
        st.subheader("Net Income")
        ni = _row(income, "Net Income")
        st.plotly_chart(single_line(year_labels, ni.reindex(year_labels).values), width="stretch")

    st.subheader("Margins")
    revenue = _row(income, "Gross Revenue").reindex(year_labels)
    gross_profit = _row(income, "Gross Profit").reindex(year_labels)
    net_income = _row(income, "Net Income").reindex(year_labels)
    margins = pd.DataFrame({
        "Gross Margin %": gross_profit / revenue * 100,
        "Net Margin %": net_income / revenue * 100,
    })
    fig = px.line(margins, markers=True, color_discrete_sequence=[BLUE, GREEN])
    fig.update_traces(line_width=2)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                       hovermode="x unified")
    fig.update_yaxes(title=None, ticksuffix="%")
    fig.update_xaxes(title=None)
    st.plotly_chart(fig, width="stretch")

    with st.expander("Show raw income statement"):
        st.dataframe(income, width="stretch")


def page_balance_sheet():
    st.header("Balance Sheet")
    bs5 = load_balance_sheet_5yr()
    _, cashflow = load_financial_statement()
    years = [c for c in bs5.columns if c != "Item"]
    year_labels = [_period_label(y) for y in years]

    asset_items = ["Cash", "Accounts Receivable", "Inventories", "Prepaid Expenses",
                   "Property Plant and Equipment (PP&E)", "Investments", "Goodwill", "Other Assets"]
    liab_equity_items = ["Accounts Payable", "Deferred Revenue", "Accrued Expenses", "Long Term Debt",
                          "Deferred Income Taxes", "Common Stock", "Retained Earnings"]

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Asset Composition")
        st.plotly_chart(stacked_bar(_to_long(bs5, items=asset_items, drop_total=False), asset_items),
                         width="stretch")
    with col2:
        st.subheader("Liabilities & Equity Composition")
        st.plotly_chart(stacked_bar(_to_long(bs5, items=liab_equity_items, drop_total=False), liab_equity_items),
                         width="stretch")

    st.subheader("Total Assets vs. Total Liabilities & Equity")
    ta = _row(bs5, "Total Assets").reindex(year_labels)
    tle = _row(bs5, "Total Liabilities & Equity").reindex(year_labels)
    check_df = pd.DataFrame({"Total Assets": ta, "Total Liabilities & Equity": tle})
    fig = px.line(check_df, markers=True, color_discrete_sequence=[BLUE, GREEN])
    fig.update_traces(line_width=2)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                       hovermode="x unified")
    fig.update_yaxes(title=None, tickprefix="$", tickformat="~s")
    fig.update_xaxes(title=None)
    st.plotly_chart(fig, width="stretch")

    st.subheader("Cash Flow by Activity")
    cf_items = ["Net Cash Flow From Operations", "Net Cash From Investments", "Net Cash Flow From Financial Activities"]
    long_cf = _to_long(cashflow, items=cf_items, drop_total=False)
    st.plotly_chart(stacked_bar(long_cf, cf_items, barmode="group"), width="stretch")

    st.subheader("Monthly Drill-down")
    year = st.selectbox("Year", ["2014", "2015", "2016", "2017", "2018"], index=4)
    monthly = load_balance_sheet_monthly(year)
    drill_items = ["Cash", "Accounts Receivable", "Inventories"]
    month_cols = [c for c in monthly.columns if c not in ("Item", "Total")]
    long_monthly = monthly[monthly["Item"].isin(drill_items)].melt(
        id_vars="Item", value_vars=month_cols, var_name="PeriodLabel", value_name="Value").dropna(subset=["Value"])
    st.plotly_chart(multi_line(long_monthly, drill_items), width="stretch")

    with st.expander("Show raw 5-year balance sheet"):
        st.dataframe(bs5, width="stretch")


def page_budget():
    st.header("2019 Budget Forecast")
    budget = load_budget()
    month_labels = MONTH_ORDER

    st.subheader("Revenue, COGS & Gross Profit (Forecast)")
    long = _to_long(budget, items=["Gross Revenue", "Cost of Goods Sold", "Gross Profit"])
    st.plotly_chart(multi_line(long, ["Gross Revenue", "Cost of Goods Sold", "Gross Profit"]), width="stretch")

    opex_items = ["Research and Development", "Sales and Marketing", "General and Administrative",
                  "Salaries and Wages", "Interest", "Rent and Utilities", "Other"]
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Operating Expense Breakdown (Forecast)")
        long_opex = _to_long(budget, items=opex_items)
        st.plotly_chart(stacked_bar(long_opex, opex_items), width="stretch")
    with col2:
        st.subheader("Net Income (Forecast)")
        ni = _row(budget, "Net Income").reindex(month_labels)
        st.plotly_chart(single_line(month_labels, ni.values), width="stretch")

    with st.expander("Show raw budget"):
        st.dataframe(budget, width="stretch")


def page_expenses():
    st.header("Labor, Marketing & Overhead Expenses")
    year = st.radio("Year", ["2017", "2018"], horizontal=True, index=1)

    labor = load_labor(year)
    marketing = load_marketing(year)
    overhead = load_overhead(year)
    month_cols = [c for c in labor.columns if c not in ("Item", "Totals")]
    month_labels = [_period_label(c) for c in month_cols]

    tab1, tab2, tab3 = st.tabs(["Labor", "Marketing", "Overhead"])

    with tab1:
        dept_totals = labor[labor["Item"].str.startswith("Total ") & labor["Item"].str.endswith(" Labor")
                             & ~labor["Item"].isin(["Total Labor Expenses"])].copy()
        dept_totals["Department"] = dept_totals["Item"].str.replace("Total ", "", regex=False).str.replace(" Labor", "", regex=False)
        s = dept_totals.set_index("Department")["Totals"]
        st.subheader(f"Labor Cost by Department ({year})")
        st.plotly_chart(ranked_bar(s), width="stretch")

        st.subheader(f"Total Labor Cost — Monthly Trend ({year})")
        total_row = labor[labor["Item"] == "Total Labor Expenses"].iloc[0]
        st.plotly_chart(single_line(month_labels, total_row[month_cols].astype(float).values), width="stretch")

    with tab2:
        cat_items = ["Total Labor", "Total Advertising", "Total Social Media", "Total Public Relations", "Total Market Research"]
        cats = marketing[marketing["Item"].isin(cat_items)].copy()
        cats["Category"] = cats["Item"].str.replace("Total ", "", regex=False)
        s = cats.set_index("Category")["Totals"]
        st.subheader(f"Marketing Spend by Category ({year})")
        st.plotly_chart(ranked_bar(s), width="stretch")

        st.subheader(f"Total Marketing Spend — Monthly Trend ({year})")
        total_row = marketing[marketing["Item"] == "Marketing Totals"].iloc[0]
        st.plotly_chart(single_line(month_labels, total_row[month_cols].astype(float).values), width="stretch")

    with tab3:
        leaf_items = ["Utilities", "Maintenance", "Salaries and Wages", "Marketing and Advertising", "Travel",
                      "Interest", "Supplies", "Research and Development", "Phone and Internet",
                      "Rent", "Insurance", "Taxes", "Depreciation"]
        s = overhead[overhead["Item"].isin(leaf_items)].set_index("Item")["Totals"]
        st.subheader(f"Overhead Cost by Line Item ({year})")
        st.plotly_chart(ranked_bar(s), width="stretch")

        st.subheader(f"Total Overhead Cost — Monthly Trend ({year})")
        total_row = overhead[overhead["Item"] == "Overhead Costs Total"].iloc[0]
        st.plotly_chart(single_line(month_labels, total_row[month_cols].astype(float).values), width="stretch")


def page_products():
    st.header("Product Line")
    sales, revenue_chart, inventory, inventory_chart = load_product_line()

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Revenue by Category")
        st.plotly_chart(ranked_bar(revenue_chart.set_index("Category")["Total"]), width="stretch")
    with col2:
        st.subheader("Inventory Value by Category")
        st.plotly_chart(ranked_bar(inventory_chart.set_index("Category")["Total"]), width="stretch")

    st.subheader("Top Products by Revenue")
    top_n = st.slider("Number of products", 5, 30, 15)
    s = sales.set_index("ProdName")["Revenue"]
    st.plotly_chart(ranked_bar(s, top_n=top_n), width="stretch")

    st.subheader("Price vs. Units Sold")
    fig = px.scatter(sales, x="Price", y="Sold", size="Revenue", hover_name="ProdName",
                      hover_data={"ProdCategory": True, "Price": ":$.2f", "Sold": True, "Revenue": ":$,.0f"},
                      color_discrete_sequence=[BLUE])
    fig.update_traces(marker=dict(line=dict(width=1, color=SURFACE)))
    fig.update_xaxes(title="Price", tickprefix="$")
    fig.update_yaxes(title="Units Sold", tickformat="~s")
    st.plotly_chart(fig, width="stretch")

    with st.expander("Show raw product data"):
        st.dataframe(sales, width="stretch")
        st.dataframe(inventory, width="stretch")


def page_online_sales():
    st.header("US Online Retail Sales")
    df = load_online_sales()

    min_date, max_date = df["OrderDate"].min().date(), df["OrderDate"].max().date()
    start, end = st.slider("Date range", min_value=min_date, max_value=max_date, value=(min_date, max_date))
    mask = (df["OrderDate"].dt.date >= start) & (df["OrderDate"].dt.date <= end)
    d = df[mask]

    c1, c2, c3 = st.columns(3)
    c1.metric("Total Revenue", fmt_usd(d["Order Total"].sum()))
    c2.metric("Orders", f"{len(d):,}")
    c3.metric("Avg Order Value", fmt_usd(d["Order Total"].mean()))

    st.subheader("Monthly Revenue Trend")
    monthly = d.groupby("Month")["Order Total"].sum().reset_index()
    st.plotly_chart(single_line(monthly["Month"], monthly["Order Total"]), width="stretch")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Retail vs. Wholesale — Monthly")
        by_type = d.groupby(["Month", "OrderType"])["Order Total"].sum().reset_index()
        fig = px.line(by_type, x="Month", y="Order Total", color="OrderType", markers=True,
                      category_orders={"OrderType": ["Retail", "Wholesale"]}, color_discrete_sequence=CATEGORICAL)
        fig.update_traces(line_width=2)
        fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                           hovermode="x unified")
        fig.update_yaxes(title=None, tickprefix="$", tickformat="~s")
        fig.update_xaxes(title=None)
        st.plotly_chart(fig, width="stretch")
    with col2:
        st.subheader("Revenue by Product Category")
        s = d.groupby("ProdCategory")["Order Total"].sum()
        st.plotly_chart(ranked_bar(s), width="stretch")

    st.subheader("Top 10 States by Revenue")
    s = d.groupby("CustState")["Order Total"].sum()
    st.plotly_chart(ranked_bar(s, top_n=10), width="stretch")

    with st.expander("Show raw orders"):
        st.dataframe(d, width="stretch")


def page_regional_sales():
    st.header("US Sales by Region")
    sales, employees, regions = load_regional_sales()

    st.subheader("Revenue by Sales Region")
    s = sales.groupby("Sales Region")["Order Total"].sum()
    st.plotly_chart(ranked_bar(s), width="stretch")

    st.subheader("Top 15 Employees by Revenue")
    s = sales.groupby("Employee Name")["Order Total"].sum()
    st.plotly_chart(ranked_bar(s, top_n=15), width="stretch")

    st.subheader("Monthly Revenue Trend by Region (Top 7 + Other)")
    totals = sales.groupby("Sales Region")["Order Total"].sum().sort_values(ascending=False)
    top_regions = totals.head(7).index.tolist()
    d = sales.copy()
    d["Region Group"] = d["Sales Region"].where(d["Sales Region"].isin(top_regions), "Other")
    monthly = d.groupby(["Month", "Region Group"])["Order Total"].sum().reset_index()
    order = top_regions + ["Other"]
    fig = px.line(monthly, x="Month", y="Order Total", color="Region Group", markers=True,
                  category_orders={"Region Group": order}, color_discrete_sequence=CATEGORICAL)
    fig.update_traces(line_width=2)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None),
                       hovermode="x unified")
    fig.update_yaxes(title=None, tickprefix="$", tickformat="~s")
    fig.update_xaxes(title=None)
    st.plotly_chart(fig, width="stretch")

    with st.expander("Show region-to-state mapping"):
        st.dataframe(regions, width="stretch")
    with st.expander("Show employee roster"):
        st.dataframe(employees, width="stretch")


def page_customers():
    st.header("Customers")
    individual, business = load_customers()

    c1, c2 = st.columns(2)
    c1.metric("Individual Customers", f"{len(individual):,}")
    c2.metric("Business Customers", f"{len(business):,}")

    combined = pd.concat([
        individual[["CustState"]].assign(CustomerType="Individual"),
        business[["CustState"]].assign(CustomerType="Business"),
    ])

    st.subheader("Top 15 States by Customer Count")
    s = combined.groupby("CustState").size().rename("Customers")
    st.plotly_chart(ranked_bar(s, top_n=15, currency=False), width="stretch")

    st.subheader("Individual vs. Business by State (Top 15 States)")
    top_states = combined["CustState"].value_counts().head(15).index.tolist()
    by_state = combined[combined["CustState"].isin(top_states)].groupby(["CustState", "CustomerType"]).size().reset_index(name="Customers")
    fig = px.bar(by_state, x="CustState", y="Customers", color="CustomerType",
                 category_orders={"CustState": top_states, "CustomerType": ["Individual", "Business"]},
                 color_discrete_sequence=CATEGORICAL, barmode="stack")
    fig.update_traces(marker_line_width=0)
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title=None))
    fig.update_yaxes(title=None)
    fig.update_xaxes(title=None)
    st.plotly_chart(fig, width="stretch")

    with st.expander("Show individual customers"):
        st.dataframe(individual, width="stretch")
    with st.expander("Show business customers"):
        st.dataframe(business, width="stretch")


PAGES = {
    "Overview": page_overview,
    "Income Statement": page_income_statement,
    "Balance Sheet": page_balance_sheet,
    "2019 Budget": page_budget,
    "Expenses": page_expenses,
    "Products": page_products,
    "Online Sales": page_online_sales,
    "Regional Sales": page_regional_sales,
    "Customers": page_customers,
}


def main():
    st.set_page_config(page_title="Red30 Tech Financial Dashboard", layout="wide")
    st.sidebar.title("Red30 Tech")
    st.sidebar.caption("Financial Dashboard")
    choice = st.sidebar.radio("Section", list(PAGES.keys()))
    if st.sidebar.button("Refresh data"):
        st.cache_data.clear()
    st.sidebar.caption(f"Data source: {DATA_DIR}")
    PAGES[choice]()


if __name__ == "__main__":
    main()
