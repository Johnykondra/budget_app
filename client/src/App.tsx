import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, CalendarDays,
  Check, ChevronDown, CircleDollarSign, CreditCard, Download, FileSpreadsheet, Filter, LayoutDashboard,
  LogOut, Menu, Moon, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sun, Target, Trash2,
  TrendingUp, Wallet, X
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import { toast } from "sonner";
import {
  api, authFormSchema, budgetFormSchema, categoryFormSchema, contributionFormSchema, currencyOptions, errorMessage,
  goalFormSchema, money, transactionFormSchema, type Budget, type Category, type Goal, type Transaction
} from "./api";

type Screen = "Overview" | "Transactions" | "Budgets" | "Reports" | "Savings goals" | "Categories";
type User = { id: string; email: string };
type Summary = {
  incomeMinor: number; expenseMinor: number; balanceMinor: number; savingsRate: number;
  byCategory: Array<{ name: string; color: string; amountMinor: number }>;
  trend: Array<{ period: string; incomeMinor: number; expenseMinor: number }>;
  recentTransactions: Transaction[];
};
type TxForm = {
  type: "EXPENSE" | "INCOME"; amount: string; currency: string; categoryId: string; date: string;
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "WALLET"; subCategory: string; description: string;
  tags: string; recurrence?: string;
};
const emptyTx: TxForm = {
  type: "EXPENSE", amount: "", currency: "AED", categoryId: "", date: new Date().toISOString().slice(0, 10),
  paymentMethod: "CARD", subCategory: "", description: "", tags: ""
};
const navItems: Array<{ name: Screen; icon: typeof LayoutDashboard }> = [
  { name: "Overview", icon: LayoutDashboard }, { name: "Transactions", icon: ArrowLeftRight },
  { name: "Budgets", icon: Wallet }, { name: "Reports", icon: BarChart3 },
  { name: "Savings goals", icon: Target }, { name: "Categories", icon: Settings2 }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("Overview");
  const [dark, setDark] = useState(localStorage.getItem("budget-theme") === "dark");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("budget-token");
    setUser(null);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("budget-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const token = localStorage.getItem("budget-token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem("budget-token"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading your workspace</span></div>;
  if (!user) return <AuthPage onAuthenticated={setUser} />;

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><CircleDollarSign size={23} /></div>
          <div><strong>Karcha Roz</strong><small>PERSONAL FINANCE</small></div>
          <button className="icon-btn sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${screen === name ? "active" : ""}`} onClick={() => { setScreen(name); setMobileMenu(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{name}</span>
              {name === "Overview" && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><ShieldCheck size={18} /></div>
            <strong>Your money, in focus.</strong>
            <span>Every small step adds up.</span>
            <div className="upgrade-art"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="profile-row">
            <div className="avatar">{user.email.slice(0, 1).toUpperCase()}</div>
            <div className="profile-info"><strong>{user.email.split("@")[0]}</strong><span>Personal account</span></div>
            <button className="icon-btn logout-btn" onClick={logout} title="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{screen}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="today-label"><CalendarDays size={15} />{new Date().toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" })}</span>
            <button className="icon-btn theme-toggle" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="top-avatar">{user.email.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-content">
          {screen === "Overview" && <Dashboard setScreen={setScreen} />}
          {screen === "Transactions" && <TransactionsPage />}
          {screen === "Budgets" && <BudgetsPage />}
          {screen === "Reports" && <ReportsPage />}
          {screen === "Savings goals" && <GoalsPage />}
          {screen === "Categories" && <CategoriesPage />}
        </div>
      </main>
    </div>
  );
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = authFormSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details"); return; }
    setBusy(true);
    try {
      const { data } = await api.post(register ? "/auth/register" : "/auth/login", parsed.data);
      localStorage.setItem("budget-token", data.token);
      onAuthenticated(data.user);
      toast.success(register ? "Your account is ready" : "Welcome back");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><div className="brand-mark"><CircleDollarSign size={23} /></div><strong>Karcha Roz</strong></div>
        <div className="auth-visual-copy">
          <div className="auth-eyebrow"><span /> YOUR FINANCES, SIMPLIFIED</div>
          <h1>Make every<br />dirham <em>count.</em></h1>
          <p>One clear view of your money. Spend with intention, save with confidence.</p>
          <div className="auth-preview">
            <div className="preview-top"><span>Monthly overview</span><MoreHorizontal size={18} /></div>
            <div className="preview-value">AED 12,840 <small>+8.2%</small></div>
            <div className="preview-chart"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            <div className="preview-labels"><span>JAN</span><span>APR</span><span>AUG</span><span>DEC</span></div>
          </div>
        </div>
        <div className="auth-footnote">A calmer way to manage your money.</div>
      </section>
      <section className="auth-form-side">
        <form className="auth-form" onSubmit={submit}>
          <div className="mobile-brand"><div className="brand-mark"><CircleDollarSign size={23} /></div><strong>Karcha Roz</strong></div>
          <div className="form-eyebrow">{register ? "GET STARTED" : "WELCOME BACK"}</div>
          <h2>{register ? "Create your account" : "Sign in to Karcha Roz"}</h2>
          <p className="form-subtitle">{register ? "Start building healthier money habits today." : "Your financial snapshot is waiting for you."}</p>
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={register ? "new-password" : "current-password"} /></label>
          <button className="primary-btn auth-submit" disabled={busy}>{busy ? "Please wait..." : register ? "Create account" : "Sign in"}<ArrowUpRight size={17} /></button>
          <div className="auth-switch">{register ? "Already have an account?" : "New to Karcha Roz?"}<button type="button" onClick={() => setRegister(!register)}>{register ? "Sign in" : "Create account"}</button></div>
          <div className="auth-security"><ShieldCheck size={15} /> Your data is encrypted and private.</div>
        </form>
      </section>
    </div>
  );
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Dashboard({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<Array<{ month: number; incomeMinor: number; expenseMinor: number }>>([]);
  const [busy, setBusy] = useState(true);
  const refresh = useCallback(() => {
    setBusy(true);
    Promise.all([
      api.get("/reports/summary", { params: { period, year: new Date().getFullYear(), month: new Date().getMonth() + 1 } }),
      api.get("/reports/monthly", { params: { year: new Date().getFullYear() } })
    ]).then(([overview, trend]) => { setSummary(overview.data); setMonthly(trend.data.months); })
      .catch((error) => toast.error(errorMessage(error))).finally(() => setBusy(false));
  }, [period]);
  useEffect(() => { refresh(); }, [refresh]);
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <>
      <PageTitle eyebrow="YOUR FINANCIAL SNAPSHOT" title="Good things are adding up." subtitle="Here’s how your money is moving this month."
        action={<select className="select period-select" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="month">This month</option><option value="year">This year</option></select>} />
      {busy && !summary ? <LoadingCard /> : <>
        <div className="stats-grid">
          <StatCard title="Total income" value={money(summary?.incomeMinor ?? 0)} icon={<ArrowDownLeft size={18} />} tone="green" caption="Money in" />
          <StatCard title="Total expenses" value={money(summary?.expenseMinor ?? 0)} icon={<ArrowUpRight size={18} />} tone="rose" caption="Money out" />
          <StatCard title="Net balance" value={money(summary?.balanceMinor ?? 0)} icon={<Wallet size={18} />} tone="violet" caption="Income minus expenses" />
          <StatCard title="Savings rate" value={`${summary?.savingsRate ?? 0}%`} icon={<TrendingUp size={18} />} tone="amber" caption="Of income saved" />
        </div>
        <div className="dashboard-grid">
          <section className="card chart-card balance-chart">
            <div className="card-heading"><div><h3>Income vs. expenses</h3><p>Your monthly cash flow</p></div><span className="period-chip">{new Date().getFullYear()}</span></div>
            <div className="chart-legend"><span><i className="legend-dot income-dot" />Income</span><span><i className="legend-dot expense-dot" />Expenses</span></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly.map((item) => ({ ...item, name: monthLabels[item.month - 1] }))} barGap={5}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 6" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis hide /><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)" }} />
              <Bar dataKey="incomeMinor" name="Income" fill="#33ad87" radius={[5, 5, 0, 0]} maxBarSize={18} /><Bar dataKey="expenseMinor" name="Expenses" fill="#f1a189" radius={[5, 5, 0, 0]} maxBarSize={18} />
            </BarChart></ResponsiveContainer></div>
          </section>
          <section className="card chart-card category-chart">
            <div className="card-heading"><div><h3>Where it goes</h3><p>Expenses by category</p></div><button className="text-link" onClick={() => setScreen("Reports")}>View report <ArrowUpRight size={14} /></button></div>
            {summary?.byCategory.length ? <div className="donut-layout">
              <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.byCategory} dataKey="amountMinor" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">{summary.byCategory.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(summary.expenseMinor)}</strong><span>Total spent</span></div></div>
              <div className="category-legend">{summary.byCategory.slice(0, 5).map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{Math.round(item.amountMinor * 100 / Math.max(summary.expenseMinor, 1))}%</strong></div>)}</div>
            </div> : <EmptyState icon={<BarChart3 />} title="No expenses yet" text="Add a transaction to see your spending breakdown." />}
          </section>
          <section className="card chart-card trend-card">
            <div className="card-heading"><div><h3>Balance trend</h3><p>Daily income and spending</p></div><span className="chart-note"><span className="trend-line-dot" /> Net balance</span></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary?.trend ?? []}>
              <defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7466e8" stopOpacity={0.2} /><stop offset="100%" stopColor="#7466e8" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 6" /><XAxis dataKey="period" tickFormatter={(value: string) => value.slice(-2)} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis hide /><Tooltip formatter={(value, name) => [money(Number(value)), name === "incomeMinor" ? "Income" : "Expenses"]} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="incomeMinor" stroke="#7669e8" strokeWidth={2.5} fill="url(#balanceFill)" />
              <Area type="monotone" dataKey="expenseMinor" stroke="#33ad87" strokeWidth={2} fill="transparent" />
            </AreaChart></ResponsiveContainer></div>
          </section>
          <section className="card recent-card">
            <div className="card-heading"><div><h3>Recent activity</h3><p>Your latest transactions</p></div><button className="text-link" onClick={() => setScreen("Transactions")}>See all <ArrowUpRight size={14} /></button></div>
            <TransactionList transactions={summary?.recentTransactions ?? []} compact />
          </section>
        </div>
      </>}
    </>
  );
}

function StatCard({ title, value, icon, tone, caption }: { title: string; value: string; icon: React.ReactNode; tone: string; caption: string }) {
  return <div className="card stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{title}</div><strong className="stat-value">{value}</strong><div className="stat-caption"><span className="caption-dot" />{caption}</div></div>;
}

function TransactionList({ transactions, compact = false, onDelete }: { transactions: Transaction[]; compact?: boolean; onDelete?: (id: string) => void }) {
  if (!transactions.length) return <EmptyState icon={<Activity />} title="Nothing here yet" text="Your transactions will show up here." />;
  return <div className={`transaction-list ${compact ? "compact-list" : ""}`}>
    {transactions.map((transaction) => (
      <div className="transaction-row" key={transaction.id}>
        <div className="category-icon" style={{ background: `${transaction.category.color}19`, color: transaction.category.color }}>
          {transaction.type === "INCOME" ? <ArrowDownLeft size={17} /> : <CreditCard size={16} />}
        </div>
        <div className="transaction-detail"><strong>{transaction.description || transaction.category.name}</strong><span>{transaction.category.name}{transaction.subCategory ? ` · ${transaction.subCategory}` : ""} · {new Date(transaction.date).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}</span></div>
        <strong className={`transaction-amount ${transaction.type === "INCOME" ? "positive" : ""}`}>{transaction.type === "INCOME" ? "+" : "−"}{money(transaction.amountMinor, transaction.currency)}</strong>
        {onDelete && <button className="icon-btn delete-inline" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction"><Trash2 size={15} /></button>}
      </div>
    ))}
  </div>;
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [tag, setTag] = useState("");
  const [period, setPeriod] = useState("month");
  const [sortBy, setSortBy] = useState("date");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const dateFilters = useMemo(() => {
    const now = new Date();
    if (period === "month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    }
    if (period === "lastMonth") {
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    }
    if (period === "year") {
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    }
    if (period === "custom") {
      return {
        from: customFrom ? new Date(`${customFrom}T00:00:00`) : undefined,
        to: customTo ? new Date(`${customTo}T23:59:59.999`) : undefined
      };
    }
    return { from: undefined, to: undefined };
  }, [period, customFrom, customTo]);
  const filters = useMemo(() => ({
    search: search || undefined, type: type || undefined, categoryId: categoryId || undefined,
    paymentMethod: paymentMethod || undefined, tag: tag || undefined,
    from: dateFilters.from?.toISOString(), to: dateFilters.to?.toISOString()
  }), [search, type, categoryId, paymentMethod, tag, dateFilters]);
  const load = useCallback(() => {
    setLoading(true);
    api.get("/transactions", { params: { ...filters, page, pageSize: 10, sortBy } })
      .then(({ data }) => { setTransactions(data.data); setPages(data.pages || 1); })
      .catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false));
  }, [page, filters, sortBy]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data.categories)).catch((error) => toast.error(errorMessage(error))); }, []);
  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    try { await api.delete(`/transactions/${id}`); toast.success("Transaction deleted"); load(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  async function exportFile(format: "csv" | "excel") {
    try {
      const { data } = await api.get(`/transactions/export/${format}`, { params: filters, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = format === "csv" ? "transactions.csv" : "transactions.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { toast.error(errorMessage(error)); }
  }
  return <>
    <PageTitle eyebrow="YOUR MONEY, EVERY MOVE" title="Transactions" subtitle="Every little detail, all in one place."
      action={<button className="primary-btn" onClick={() => { setEditing(null); setModal(true); }}><Plus size={17} /> Add transaction</button>} />
    <div className="card table-card">
      <div className="filters-row">
        <div className="search-field"><Search size={16} /><input placeholder="Search transactions" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="filters-right">
          <select className="select" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}><option value="month">This month</option><option value="lastMonth">Last month</option><option value="year">This year</option><option value="custom">Custom range</option><option value="all">All time</option></select>
          <select className="select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All types</option><option value="EXPENSE">Expenses</option><option value="INCOME">Income</option></select>
          <select className="select category-filter" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select className="select payment-filter" value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}><option value="">All payments</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="WALLET">Wallet</option></select>
          <input className="tag-filter" placeholder="Filter tag" value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} />
          <select className="select sort-filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="date">Sort: date</option><option value="amountMinor">Sort: amount</option></select>
          <div className="export-menu"><button className="icon-btn" title="Export CSV" onClick={() => exportFile("csv")}><Download size={16} /></button><button className="icon-btn" title="Export Excel" onClick={() => exportFile("excel")}><FileSpreadsheet size={16} /></button></div>
          <button className="secondary-btn import-btn" onClick={() => setImportOpen(true)}>Import CSV</button>
        </div>
        {period === "custom" && <div className="custom-date-range"><label>From<input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} /></label><label>To<input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} /></label></div>}
      </div>
      {loading ? <LoadingCard /> : transactions.length ? <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th /></tr></thead><tbody>
        {transactions.map((transaction) => <tr key={transaction.id}>
          <td><div className="table-tx"><div className="category-icon small" style={{ background: `${transaction.category.color}19`, color: transaction.category.color }}>{transaction.type === "INCOME" ? <ArrowDownLeft size={15} /> : <CreditCard size={14} />}</div><div><strong>{transaction.description || transaction.category.name}</strong><span>{transaction.type === "INCOME" ? "Income" : "Expense"}</span></div></div></td>
          <td><span className="category-cell"><i style={{ background: transaction.category.color }} />{transaction.category.name}</span></td>
          <td>{new Date(transaction.date).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}</td>
          <td><span className="payment-badge">{transaction.paymentMethod.replace("_", " ").toLowerCase()}</span></td>
          <td className={`amount-cell ${transaction.type === "INCOME" ? "positive" : ""}`}>{transaction.type === "INCOME" ? "+" : "−"}{money(transaction.amountMinor, transaction.currency)}</td>
          <td><div className="row-actions"><button className="icon-btn" onClick={() => { setEditing(transaction); setModal(true); }} title="Edit"><Settings2 size={15} /></button><button className="icon-btn danger" onClick={() => remove(transaction.id)} title="Delete"><Trash2 size={15} /></button></div></td>
        </tr>)}
      </tbody></table></div> : <EmptyState icon={<ArrowLeftRight />} title="No transactions found" text="Try changing your filters or add your first transaction." />}
      <div className="pagination"><span>Page {page} of {pages}</span><div><button className="secondary-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="secondary-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </div>
    {modal && <TransactionModal categories={categories} initial={editing} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    {importOpen && <ImportModal categories={categories} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); load(); }} />}
  </>;
}

function TransactionModal({ categories, initial, onClose, onSaved }: { categories: Category[]; initial: Transaction | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<TxForm>(initial ? {
    ...emptyTx, type: initial.type, amount: (initial.amountMinor / 100).toFixed(2), currency: initial.currency,
    categoryId: initial.categoryId, date: initial.date.slice(0, 10), paymentMethod: initial.paymentMethod as TxForm["paymentMethod"],
    subCategory: initial.subCategory ?? "", description: initial.description ?? "", tags: initial.tags.map((item) => item.tag.name).join(", ")
  } : emptyTx);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const availableCategories = categories.filter((category) => category.type === form.type);
  function update<K extends keyof TxForm>(key: K, value: TxForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = transactionFormSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your transaction details"); return; }
    setBusy(true);
    const body = new FormData();
    const values = {
      ...parsed.data, amountMinor: Math.round(parsed.data.amount * 100), tags: parsed.data.tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
      date: new Date(`${parsed.data.date}T12:00:00`).toISOString()
    };
    Object.entries(values).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value ?? "")));
    if (form.recurrence) body.append("recurrence", form.recurrence);
    if (receipt) body.append("receipt", receipt);
    try {
      if (initial) {
        const updateBody = { ...values };
        await api.patch(`/transactions/${initial.id}`, updateBody);
      } else {
        await api.post("/transactions", body);
      }
      toast.success(initial ? "Transaction updated" : "Transaction saved");
      onSaved();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "Edit transaction" : "Add a transaction"} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="segmented-control"><button type="button" className={form.type === "EXPENSE" ? "selected expense-selected" : ""} onClick={() => { update("type", "EXPENSE"); update("categoryId", ""); }}>Expense</button><button type="button" className={form.type === "INCOME" ? "selected income-selected" : ""} onClick={() => { update("type", "INCOME"); update("categoryId", ""); }}>Income</button></div>
      <div className="form-grid"><label>Amount<input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={(e) => update("amount", e.target.value)} required /></label><label>Currency<select value={form.currency} onChange={(e) => update("currency", e.target.value)}>{currencyOptions.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}</select></label></div>
      <div className="form-grid"><label>Category<select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} required><option value="">Select category</option>{availableCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required /></label></div>
      <div className="form-grid"><label>Payment method<select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value as TxForm["paymentMethod"])}><option value="CARD">Card</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="WALLET">Wallet</option></select></label><label>Sub-category<input placeholder="Optional" value={form.subCategory} onChange={(e) => update("subCategory", e.target.value)} /></label></div>
      <label>Description<input placeholder="What was this for?" value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
      <label>Tags<input placeholder="e.g. essentials, family (comma separated)" value={form.tags} onChange={(e) => update("tags", e.target.value)} /></label>
      {!initial && <div className="form-grid"><label>Repeat<select value={form.recurrence ?? ""} onChange={(e) => update("recurrence", e.target.value || undefined)}><option value="">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label><label>Receipt image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} /></label></div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving..." : initial ? "Save changes" : "Save transaction"}<Check size={16} /></button></div>
    </form>
  </Modal>;
}

function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ categoryId: "", amount: "" });
  const [loading, setLoading] = useState(true);
  const date = new Date();
  const refresh = useCallback(() => {
    setLoading(true);
    api.get("/budgets", { params: { year: date.getFullYear(), month: date.getMonth() + 1 } })
      .then(({ data }) => setBudgets(data.budgets)).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false));
  }, [date.getFullYear(), date.getMonth()]);
  useEffect(() => { refresh(); api.get("/categories").then(({ data }) => setCategories(data.categories.filter((c: Category) => c.type === "EXPENSE"))); }, [refresh]);
  async function addBudget(event: FormEvent) {
    event.preventDefault();
    const parsed = budgetFormSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your budget"); return; }
    try {
      await api.post("/budgets", { categoryId: parsed.data.categoryId || null, year: date.getFullYear(), month: date.getMonth() + 1, amountMinor: Math.round(parsed.data.amount * 100), currency: "AED" });
      toast.success("Budget saved"); setForm({ categoryId: "", amount: "" }); refresh();
    } catch (error) { toast.error(errorMessage(error)); }
  }
  async function remove(id: string) {
    try { await api.delete(`/budgets/${id}`); toast.success("Budget removed"); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amountMinor, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentMinor, 0);
  return <>
    <PageTitle eyebrow="PLAN WITH PURPOSE" title="Monthly budgets" subtitle={`Keep your spending aligned with your plans for ${date.toLocaleDateString("en-AE", { month: "long" })}.`} />
    <div className="budget-summary-row">
      <div className="card budget-summary"><span>PLANNED THIS MONTH</span><strong>{money(totalBudget)}</strong><div className="budget-summary-track"><i style={{ width: `${totalBudget ? Math.min(100, totalSpent / totalBudget * 100) : 0}%` }} /></div><small>{money(totalSpent)} spent of {money(totalBudget)}</small></div>
      <form className="card add-budget-form" onSubmit={addBudget}><div><h3>Set a budget</h3><p>Per category or across everything.</p></div><select className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Overall budget</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="inline-input"><span>AED</span><input type="number" min="1" step="0.01" placeholder="Monthly amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div><button className="primary-btn"><Plus size={16} /> Save budget</button></form>
    </div>
    <section className="card budgets-card"><div className="card-heading"><div><h3>Your budget breakdown</h3><p>A little awareness goes a long way.</p></div><span className="period-chip">{date.toLocaleDateString("en-AE", { month: "long", year: "numeric" })}</span></div>
      {loading ? <LoadingCard /> : budgets.length ? <div className="budget-list">{budgets.map((budget) => {
        const percent = Math.min(100, budget.percent);
        const color = budget.warning === "OVER_BUDGET" ? "red" : budget.warning === "NEAR_LIMIT" ? "amber" : "green";
        return <div className="budget-item" key={budget.id}><div className="budget-item-head"><div className="budget-name"><i style={{ background: budget.category?.color ?? "#7566e8" }} />{budget.category?.name ?? "Overall budget"}<button className="icon-btn danger" onClick={() => remove(budget.id)} title="Remove budget"><Trash2 size={14} /></button></div><div className="budget-numbers"><strong>{money(budget.spentMinor, budget.currency)}</strong><span>of {money(budget.amountMinor, budget.currency)}</span></div></div><div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${percent}%` }} /></div><div className="budget-meta"><span>{budget.warning === "OVER_BUDGET" ? "Over budget" : budget.warning === "NEAR_LIMIT" ? "Getting close" : "On track"}</span><span>{budget.percent}% used</span></div></div>;
      })}</div> : <EmptyState icon={<Wallet />} title="Start with a budget" text="Choose an overall or category budget to give your spending a helpful guardrail." />}
    </section>
  </>;
}

function ReportsPage() {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    api.get("/reports/summary", { params: { period, year, month } }).then(({ data }) => setSummary(data))
      .catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false));
  }, [period, year, month]);
  useEffect(() => { refresh(); }, [refresh]);
  return <>
    <PageTitle eyebrow="THE BIGGER PICTURE" title="Reports" subtitle="A thoughtful look at how your money moves." action={<div className="report-selects"><select className="select" value={period} onChange={(e) => setPeriod(e.target.value as "month" | "year")}><option value="month">Monthly</option><option value="year">Yearly</option></select><select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>{[year - 1, year, year + 1].map((item) => <option key={item}>{item}</option>)}</select>{period === "month" && <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{new Date(2020, i, 1).toLocaleString("en", { month: "long" })}</option>)}</select>}</div>} />
    {loading ? <LoadingCard /> : summary && <>
      <div className="stats-grid report-stats"><StatCard title="Income" value={money(summary.incomeMinor)} icon={<ArrowDownLeft size={18} />} tone="green" caption="Total received" /><StatCard title="Expenses" value={money(summary.expenseMinor)} icon={<ArrowUpRight size={18} />} tone="rose" caption="Total spent" /><StatCard title="Net balance" value={money(summary.balanceMinor)} icon={<Wallet size={18} />} tone="violet" caption="Your net position" /><StatCard title="Savings rate" value={`${summary.savingsRate}%`} icon={<TrendingUp size={18} />} tone="amber" caption="Income retained" /></div>
      <div className="report-grid"><section className="card report-chart"><div className="card-heading"><div><h3>{period === "month" ? "Daily cash flow" : "Monthly cash flow"}</h3><p>Income and expenses over time</p></div></div><div className="chart-wrap report-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.trend}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 6" /><XAxis dataKey="period" tickFormatter={(value: string) => period === "year" ? value.slice(-2) : value.slice(-2)} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis hide /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="incomeMinor" name="Income" fill="#33ad87" radius={[4, 4, 0, 0]} /><Bar dataKey="expenseMinor" name="Expenses" fill="#f1a189" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
        <section className="card category-report"><div className="card-heading"><div><h3>Spending by category</h3><p>Where your expenses went</p></div></div>{summary.byCategory.length ? summary.byCategory.map((item) => <div className="category-report-row" key={item.name}><div className="category-report-name"><i style={{ background: item.color }} />{item.name}</div><strong>{money(item.amountMinor)}</strong></div>) : <EmptyState icon={<BarChart3 />} title="No spending to report" text="Expenses will appear here." />}</section></div>
    </>}
  </>;
}

function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", target: "", targetDate: "" });
  const [contribute, setContribute] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const refresh = useCallback(() => {
    setLoading(true);
    api.get("/goals").then(({ data }) => setGoals(data.goals)).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function createGoal(event: FormEvent) {
    event.preventDefault();
    const parsed = goalFormSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your goal"); return; }
    try {
      await api.post("/goals", { name: parsed.data.name, targetMinor: Math.round(parsed.data.target * 100), currency: "AED", targetDate: parsed.data.targetDate || null });
      toast.success("Savings goal created"); setForm({ name: "", target: "", targetDate: "" }); refresh();
    } catch (error) { toast.error(errorMessage(error)); }
  }
  async function saveContribution(event: FormEvent) {
    event.preventDefault();
    if (!contribute) return;
    const parsed = contributionFormSchema.safeParse({ amount });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your contribution"); return; }
    try {
      await api.post(`/goals/${contribute.id}/contributions`, { amountMinor: Math.round(parsed.data.amount * 100) });
      toast.success("Contribution added"); setContribute(null); setAmount(""); refresh();
    } catch (error) { toast.error(errorMessage(error)); }
  }
  async function deleteGoal(goal: Goal) {
    if (!confirm(`Delete the goal "${goal.name}" and its contribution history?`)) return;
    try { await api.delete(`/goals/${goal.id}`); toast.success("Goal deleted"); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  return <>
    <PageTitle eyebrow="A LITTLE CLOSER, EVERY DAY" title="Savings goals" subtitle="Give your future plans a name and a number." />
    <div className="goals-layout">
      <form className="card goal-create" onSubmit={createGoal}><div className="goal-create-icon"><Target size={20} /></div><h3>Create a goal</h3><p>What are you saving for?</p><label>Goal name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. A rainy day fund" required /></label><label>Target amount<input type="number" min="1" step="0.01" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="AED 0.00" required /></label><label>Target date <span className="optional">(optional)</span><input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></label><button className="primary-btn"><Plus size={16} /> Create goal</button></form>
      <section className="goals-list">{loading ? <LoadingCard /> : goals.length ? goals.map((goal, index) => <div className="card goal-card" key={goal.id}><div className={`goal-symbol goal-${index % 4}`}><Target size={19} /></div><button className="icon-btn danger goal-delete" onClick={() => deleteGoal(goal)} title="Delete goal"><Trash2 size={15} /></button><div className="goal-name">{goal.name}</div><div className="goal-target"><strong>{money(goal.contributedMinor, goal.currency)}</strong><span>of {money(goal.targetMinor, goal.currency)}</span></div><div className="progress-track goal-progress"><div className={`progress-fill goal-fill-${index % 4}`} style={{ width: `${goal.progress}%` }} /></div><div className="goal-foot"><span>{goal.progress}% saved{goal.targetDate ? ` · by ${new Date(goal.targetDate).toLocaleDateString("en-AE", { month: "short", year: "numeric" })}` : ""}</span><button className="text-link" onClick={() => setContribute(goal)}><Plus size={14} /> Add money</button></div></div>) : <EmptyState icon={<Target />} title="Your next big thing starts here" text="Create a savings goal and watch your progress grow." />}</section>
    </div>
    {contribute && <Modal title={`Add to ${contribute.name}`} onClose={() => setContribute(null)}><form className="modal-form" onSubmit={saveContribution}><label>Contribution amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="AED 0.00" required /></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setContribute(null)}>Cancel</button><button className="primary-btn">Add contribution <ArrowDownRight size={16} /></button></div></form></Modal>}
  </>;
}

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [color, setColor] = useState("#7566e8");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => { setLoading(true); api.get("/categories").then(({ data }) => setCategories(data.categories)).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false)); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function add(event: FormEvent) {
    event.preventDefault();
    const parsed = categoryFormSchema.safeParse({ name, type, color });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your category"); return; }
    try { await api.post("/categories", { name, type, color }); toast.success("Category created"); setName(""); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  async function rename(category: Category) {
    const next = prompt("Rename this category", category.name);
    if (!next?.trim() || next === category.name) return;
    try { await api.patch(`/categories/${category.id}`, { name: next.trim() }); toast.success("Category renamed"); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  async function recolor(category: Category, nextColor: string) {
    try { await api.patch(`/categories/${category.id}`, { color: nextColor }); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  async function remove(category: Category) {
    if (!confirm(`Delete the category "${category.name}"?`)) return;
    try { await api.delete(`/categories/${category.id}`); toast.success("Category deleted"); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  return <>
    <PageTitle eyebrow="MAKE IT YOURS" title="Categories" subtitle="Organize spending and income in a way that makes sense to you." />
    <div className="categories-layout">
      <form className="card category-create" onSubmit={add}><div className="goal-create-icon"><Settings2 size={19} /></div><h3>Add a category</h3><p>Create a label that works for you.</p><label>Category name<input placeholder="e.g. Pet care" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} /></label><label>Type<select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label><label>Color<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label><button className="primary-btn"><Plus size={16} /> Add category</button></form>
      <section className="card category-manager"><div className="card-heading"><div><h3>Your categories</h3><p>Rename, recolor or remove custom labels.</p></div></div>{loading ? <LoadingCard /> : <div className="category-groups">{(["EXPENSE", "INCOME"] as const).map((group) => <div key={group}><div className="group-heading">{group === "EXPENSE" ? "EXPENSE CATEGORIES" : "INCOME CATEGORIES"}<span>{categories.filter((item) => item.type === group).length}</span></div>{categories.filter((item) => item.type === group).map((item) => <div className="category-manage-row" key={item.id}><i style={{ background: item.color }} /><strong>{item.name}</strong>{item.isDefault && <span className="default-badge">Default</span>}<div className="category-actions"><input type="color" value={item.color} onChange={(e) => recolor(item, e.target.value)} title="Change color" /><button className="icon-btn" onClick={() => rename(item)} title="Rename"><Settings2 size={15} /></button>{!item.isDefault && <button className="icon-btn danger" onClick={() => remove(item)} title="Delete"><Trash2 size={15} /></button>}</div></div>)}</div>)}</div>}</section>
    </div>
  </>;
}

function ImportModal({ categories, onClose, onImported }: { categories: Category[]; onClose: () => void; onImported: () => void }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Array<{ valid: boolean; transaction?: unknown; error?: string }>>([]);
  const [busy, setBusy] = useState(false);
  const fields = ["date", "type", "amount", "currency", "category", "paymentMethod", "description", "tags"];
  async function readFile(file: File) {
    const text = await file.text();
    const rows: string[][] = [];
    let row: string[] = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const clean = rows.map((item) => item.map((value) => value.trim())).filter((item) => item.some(Boolean));
    setHeaders(clean[0] ?? []); setRecords(clean.slice(1));
    const mappingDefaults: Record<string, string> = {};
    for (const field of fields) {
      const matching = clean[0]?.find((header) => header.toLowerCase().replace(/[^a-z]/g, "").includes(field.toLowerCase()));
      if (matching) mappingDefaults[field] = matching;
    }
    setMapping(mappingDefaults);
  }
  async function showPreview() {
    const rows = records.map((row) => {
      const value = (key: string) => row[headers.indexOf(mapping[key] ?? "")] ?? "";
      const category = categories.find((item) => item.name.toLowerCase() === value("category").toLowerCase());
      const amountMinor = Math.round(Number(value("amount").replace(/[^0-9.-]/g, "")) * 100);
      return {
        date: new Date(`${value("date")}T12:00:00`).toISOString(),
        type: value("type").toUpperCase().startsWith("I") || value("type").toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
        amountMinor, currency: value("currency") || "AED", categoryId: category?.id ?? "",
        paymentMethod: (value("paymentMethod").toUpperCase().replace(" ", "_") || "CARD"),
        description: value("description") || undefined, tags: value("tags").split("|").filter(Boolean)
      };
    });
    try {
      const { data } = await api.post("/transactions/import/preview", { rows });
      setPreview(data.preview);
    } catch (error) { toast.error(errorMessage(error)); }
  }
  async function importRows() {
    const rows = preview.filter((item) => item.valid).map((item) => item.transaction);
    if (!rows.length) return;
    setBusy(true);
    try { const { data } = await api.post("/transactions/import", { rows }); toast.success(`${data.imported} transactions imported`); onImported(); }
    catch (error) { toast.error(errorMessage(error)); } finally { setBusy(false); }
  }
  return <Modal title="Import transactions" onClose={onClose} wide><div className="import-content">{!records.length ? <label className="upload-zone"><Download size={23} /><strong>Choose a CSV file</strong><span>Map your columns and review everything before importing.</span><input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} /></label> : <>
    <div className="mapping-grid">{fields.map((field) => <label key={field}>{field}<select value={mapping[field] ?? ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}><option value="">Not mapped</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div>
    <button className="secondary-btn" onClick={showPreview}><EyeIcon /> Preview {records.length} rows</button>
    {!!preview.length && <><div className="preview-table"><div className="preview-header"><span>ROW</span><span>STATUS</span><span>VALIDATION</span></div>{preview.slice(0, 8).map((item, index) => <div className="preview-row" key={index}><span>{index + 1}</span><span className={item.valid ? "positive" : "negative"}>{item.valid ? "Ready" : "Needs attention"}</span><span>{item.error ?? "Looks good"}</span></div>)}</div><button className="primary-btn" disabled={busy || !preview.some((item) => item.valid)} onClick={importRows}>{busy ? "Importing..." : `Import ${preview.filter((item) => item.valid).length} transactions`}<Check size={15} /></button></>}
  </>}</div></Modal>;
}

function EyeIcon() { return <Search size={15} />; }
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className={`modal ${wide ? "modal-wide" : ""}`}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>;
}
function LoadingCard() { return <div className="loading-card"><div className="spinner" /><span>Loading your finances...</span></div>; }
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><span>{text}</span></div>; }
