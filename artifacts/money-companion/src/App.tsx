import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Check,
  CircleHelp, Clock3, Coffee, FileText, Home, LoaderCircle, LogOut, Mic, Plus, Search,
  Sparkles, Trash2, Wallet, X,
} from 'lucide-react';
import {
  Route, Switch, useLocation, Router as WouterRouter, Link,
} from 'wouter';
import { useAuthSession, signInWithPassword, signUpWithPassword, signOut, useDashboardSummary, useCategories, useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useFinance';
import type { CategoryRow, TransactionInput, TransactionRow, TransactionType, TransactionUpdate } from '@/lib/database.types';
import type { ReactNode, FormEvent } from 'react';

const queryClient = new QueryClient();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());
const money = (amount: number, currency = 'NPR') => new Intl.NumberFormat('en-NP', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kathmandu' }).format(new Date(date));
const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || 'there';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <Link href="/" className={`flex items-center gap-3 no-underline ${dark ? 'text-[hsl(var(--sidebar-foreground))]' : 'text-foreground'}`} data-testid="link-brand">
    <span className={`grid h-10 w-10 place-items-center rounded-2xl ${dark ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'bg-primary text-primary-foreground'}`}><Wallet size={19}/></span>
    <span className="leading-tight"><span className="block text-[16px] font-bold tracking-[-.04em]">money companion</span><span className={`block text-[10px] tracking-[.16em] uppercase ${dark ? 'text-white/45' : 'text-muted-foreground'}`}>a little more at ease</span></span>
  </Link>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuthSession();
  const [, navigate] = useLocation();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';
  const current = typeof window !== 'undefined' ? window.location.pathname : '/';
  const active = current.startsWith('/transactions') ? 'transactions' : 'home';
  const logout = async () => { await signOut(); navigate('/'); };
  return <div className="grain min-h-[100dvh] md:flex">
    <aside className="hidden md:flex w-[252px] shrink-0 flex-col bg-[hsl(var(--sidebar))] px-5 py-7 text-[hsl(var(--sidebar-foreground))]">
      <Brand dark/>
      <div className="mt-14 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-white/35">Your space</div>
      <nav className="space-y-1">
        <Link href="/" className={`nav-link ${active === 'home' ? 'nav-active' : ''}`} data-testid="link-dashboard"><Home size={17}/>Overview</Link>
        <Link href="/transactions" className={`nav-link ${active === 'transactions' ? 'nav-active' : ''}`} data-testid="link-transactions"><FileText size={17}/>Transactions</Link>
      </nav>
      <div className="mt-auto rounded-[20px] border border-white/10 bg-white/[.045] p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-white/55"><CircleHelp size={14}/>A gentle reminder</div>
        <p className="serif text-[18px] leading-[1.18] text-white/90">Small notes make a clearer picture.</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">No perfect bookkeeping needed. Just start where you are.</p>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d99b70] text-sm font-bold text-[#33251e]">{firstName(name).slice(0,1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-[10px] text-white/40">{user?.email}</p></div>
        <button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white" data-testid="button-sign-out"><LogOut size={16}/></button>
      </div>
    </aside>
    <main className="min-w-0 flex-1 pb-24 md:pb-8">
      <header className="flex items-center justify-between px-5 py-4 md:hidden">
        <Brand/><button className="rounded-full p-2 text-muted-foreground" onClick={logout} aria-label="Sign out" data-testid="button-sign-out-mobile"><LogOut size={18}/></button>
      </header>
      <div className="mx-auto w-full max-w-[1180px] px-5 py-3 md:px-10 md:py-9">{children}</div>
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 px-5 py-2 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <Link href="/" className={`mobile-nav ${active === 'home' ? 'mobile-active' : ''}`} data-testid="mobile-dashboard"><Home size={19}/><span>Home</span></Link>
      <Link href="/transactions" className={`mobile-nav ${active === 'transactions' ? 'mobile-active' : ''}`} data-testid="mobile-transactions"><FileText size={19}/><span>Activity</span></Link>
      <Link href="/transactions/new" className="mobile-nav mobile-add" data-testid="mobile-add"><span><Plus size={20}/></span><span>Add</span></Link>
    </nav>
  </div>;
}

function PageHead({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#9a7455]">{eyebrow}</p><h1 className="serif text-[38px] leading-[1.06] tracking-[-.035em] text-foreground sm:text-[46px]">{title}</h1>{subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}</div>{children}</div>;
}

function QueryState({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="rounded-[22px] border border-border bg-card p-8 text-center">
    <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f3e1d4] text-[#986c4d]"><CircleHelp size={20}/></div>
    <p className="font-semibold">We couldn't bring this in</p><p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Please check your connection and try again.'}</p>
    <button onClick={retry} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="button-retry">Try again</button>
  </div>;
}

function Dashboard() {
  const { user, isLoading: authLoading } = useAuthSession();
  const summary = useDashboardSummary(!!user);
  const rows = useTransactions({ page: 0, pageSize: 5 }, !!user);
  const categories = useCategories(undefined, !!user);
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map(c => [c.id, c])), [categories.data]);
  const name = user?.user_metadata?.full_name;
  if (authLoading) return <div className="mx-auto max-w-4xl py-16"><div className="h-10 w-56 animate-pulse rounded-xl bg-muted"/><div className="mt-8 grid gap-4 md:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-36 animate-pulse rounded-3xl bg-muted"/>)}</div></div>;
  if (!user) return <PublicHome/>;
  const s = summary.data;
  return <div className="page-enter">
    <div className="mb-8 flex items-start justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#9a7455]">Your money, in your own words</p><h1 className="serif text-[40px] leading-[1.02] tracking-[-.035em] sm:text-[52px]">A good day to begin,<br className="hidden sm:block"/> {firstName(name)}.</h1><p className="mt-3 text-sm text-muted-foreground">A clear little view of what you've recorded.</p></div>
      <Link href="/transactions/new" className="hidden shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 sm:flex" data-testid="button-add-transaction"><Plus size={17}/>Add a note</Link>
    </div>
    {summary.isError ? <QueryState error={summary.error} retry={() => void summary.refetch()}/> : <section className="relative mb-7 overflow-hidden rounded-[28px] bg-[#203d35] p-6 text-[#f7f1e6] sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/[.09]"/><div className="pointer-events-none absolute -right-1 -top-16 h-56 w-56 rounded-full border border-white/[.09]"/><div className="pointer-events-none absolute -right-20 -bottom-44 h-72 w-72 rounded-full bg-[#d8a66f]/10"/>
      <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs tracking-wide text-white/55">Recorded balance</p>{summary.isLoading ? <div className="mt-3 h-12 w-60 animate-pulse rounded-lg bg-white/10"/> : <p className="mono mt-2 text-[35px] font-medium tracking-[-.06em] sm:text-[46px]" data-testid="text-recorded-balance">{money(s?.recorded_balance ?? 0)}</p>}<div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70"><Clock3 size={13}/>Across all your notes</div></div>
        <div className="relative grid grid-cols-2 gap-3 md:min-w-[380px]"><Metric label="Income this month" amount={s?.month_income} icon={<ArrowDownLeft size={16}/>} positive loading={summary.isLoading}/><Metric label="Spent this month" amount={s?.month_expenses} icon={<ArrowUpRight size={16}/>} loading={summary.isLoading}/></div>
      </div>
      <div className="relative mt-7 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/55"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#dbab77]/20 text-[#e8bd8d]"><Sparkles size={13}/></span>{s?.month_transaction_count ?? 0} notes added this month <span className="text-white/25">·</span> Simply what you've recorded, nothing more.</div>
    </section>}
    <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9a7455]">Recently noted</p><h2 className="serif mt-1 text-[27px] tracking-[-.025em]">Your latest activity</h2></div><Link href="/transactions" className="flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all" data-testid="link-all-transactions">See all <ArrowRight size={14}/></Link></div>
    <div className="overflow-hidden rounded-[23px] border border-border bg-card soft-shadow">
      {rows.isLoading ? <div className="space-y-4 p-5">{[0,1,2].map(n=><div key={n} className="flex items-center gap-4"><div className="h-10 w-10 animate-pulse rounded-2xl bg-muted"/><div className="h-4 flex-1 animate-pulse rounded bg-muted"/><div className="h-4 w-20 animate-pulse rounded bg-muted"/></div>)}</div> : rows.isError ? <div className="p-4"><QueryState error={rows.error} retry={() => void rows.refetch()}/></div> : rows.data?.items.length ? rows.data.items.map(t=><TransactionLine key={t.id} item={t} category={categoryMap.get(t.category_id || '')}/>) : <div className="px-6 py-11 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#e9e1d1] text-[#4c6558]"><Coffee size={21}/></div><h3 className="serif text-xl">Your page is still quiet</h3><p className="mt-1 text-sm text-muted-foreground">Add your first income or expense when you're ready.</p><Link href="/transactions/new" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground" data-testid="empty-add-transaction"><Plus size={15}/>Record something</Link></div>}
    </div>
  </div>;
}

function Metric({ label, amount, icon, positive, loading }: { label: string; amount?: number; icon: ReactNode; positive?: boolean; loading: boolean }) {
  return <div className="rounded-[18px] border border-white/10 bg-white/[.075] p-4"><div className="flex items-center gap-2 text-[11px] text-white/60"><span className={positive ? 'text-[#b9d2b9]' : 'text-[#e7b39b]'}>{icon}</span>{label}</div>{loading ? <div className="mt-3 h-7 w-28 animate-pulse rounded bg-white/10"/> : <p className="mono mt-2 text-lg font-medium tracking-[-.04em] text-white">{money(amount ?? 0)}</p>}</div>;
}

function TransactionLine({ item, category }: { item: TransactionRow; category?: CategoryRow }) {
  const income = item.type === 'income';
  return <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 last:border-0 sm:gap-4 sm:px-5" data-testid={`row-transaction-${item.id}`}>
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${income ? 'bg-[#e4eee2] text-[#557c60]' : 'bg-[#f4e8dc] text-[#a27653]'}`}>{income ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</div>
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{item.description || category?.name || (income ? 'Income' : 'Expense')}</p>{item.source !== 'manual' && <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[9px] capitalize text-muted-foreground sm:inline">{item.source}</span>}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{item.merchant || category?.name || 'Uncategorised'} <span className="mx-1 text-border">·</span>{dateLabel(item.transaction_date)}</p></div>
    <p className={`mono shrink-0 text-sm font-medium ${income ? 'text-[#557c60]' : 'text-foreground'}`}>{income ? '+' : '−'}{money(item.amount, item.currency)}</p>
  </div>;
}

function TransactionsPage() {
  const { user } = useAuthSession();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);
  const [notice, setNotice] = useState('');
  const rows = useTransactions({ page, pageSize: 12, search, type }, !!user);
  const categories = useCategories(undefined, !!user);
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map(c => [c.id, c])), [categories.data]);
  const maxPage = Math.max(0, Math.ceil((rows.data?.count ?? 0) / 12) - 1);
  const saveEdit = (values: TransactionUpdate) => editing && update.mutate({ id: editing.id, values }, { onSuccess: () => { setEditing(null); setNotice('Your note was updated.'); }, onError: e => setNotice(e instanceof Error ? e.message : 'Could not update this note.') });
  const confirmDelete = () => deleting && remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setNotice('Note removed.'); }, onError: e => setNotice(e instanceof Error ? e.message : 'Could not remove this note.') });
  return <div className="page-enter">
    <PageHead eyebrow="The everyday details" title="Transactions" subtitle="Everything you've chosen to jot down, all in one place."><Link href="/transactions/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5" data-testid="button-new-transaction"><Plus size={17}/>Add a note</Link></PageHead>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/><input className="field pl-11" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Find a note or shop…" aria-label="Search transactions" data-testid="input-search-transactions"/></label>
      <div className="flex rounded-full border border-border bg-card p-1" aria-label="Filter transaction type">{(['all','expense','income'] as const).map(f=><button key={f} onClick={()=>{setType(f);setPage(0);}} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${type===f?'bg-primary text-primary-foreground':'text-muted-foreground hover:text-foreground'}`} data-testid={`filter-${f}`}>{f==='all'?'Everything':f}</button>)}</div>
    </div>
    {notice && <div role="status" className="mb-4 flex items-center justify-between rounded-xl bg-[#e6eee3] px-4 py-3 text-sm text-[#466548]" data-testid="status-transaction">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss" data-testid="dismiss-notice"><X size={16}/></button></div>}
    <div className="overflow-hidden rounded-[23px] border border-border bg-card soft-shadow">
      {rows.isLoading ? <div className="space-y-4 p-5">{[0,1,2,3].map(n=><div key={n} className="flex gap-4"><div className="h-10 w-10 animate-pulse rounded-xl bg-muted"/><div className="h-4 flex-1 animate-pulse rounded bg-muted"/></div>)}</div> : rows.isError ? <div className="p-4"><QueryState error={rows.error} retry={() => void rows.refetch()}/></div> : rows.data?.items.length ? rows.data.items.map(t=><div key={t.id} className="group flex items-center"><div className="min-w-0 flex-1"><TransactionLine item={t} category={categoryMap.get(t.category_id || '')}/></div><div className="mr-3 flex gap-1 sm:mr-5"><button onClick={()=>setEditing(t)} title="Edit note" className="rounded-lg p-2 text-muted-foreground opacity-100 transition hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100" data-testid={`button-edit-${t.id}`}><FileText size={16}/></button><button onClick={()=>setDeleting(t)} title="Delete note" className="rounded-lg p-2 text-muted-foreground opacity-100 transition hover:bg-[#f5e1dc] hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100" data-testid={`button-delete-${t.id}`}><Trash2 size={16}/></button></div></div>) : <div className="px-5 py-14 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#e9e1d1] text-[#4c6558]"><Search size={20}/></div><h2 className="serif text-xl">{search || type !== 'all' ? 'Nothing matched that search' : 'No notes here yet'}</h2><p className="mt-1 text-sm text-muted-foreground">{search || type !== 'all' ? 'Try a different word or filter.' : 'When you record something, it will show up here.'}</p>{!search && type==='all' && <Link href="/transactions/new" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground" data-testid="empty-transactions-add"><Plus size={15}/>Add your first note</Link>}</div>}
    </div>
    {rows.data && rows.data.count > 12 && <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{page*12+1}–{Math.min((page+1)*12,rows.data.count)} of {rows.data.count} notes</span><div className="flex gap-2"><button disabled={page===0} onClick={()=>setPage(page-1)} className="rounded-full border border-border p-2 disabled:opacity-40" aria-label="Previous page" data-testid="button-page-prev"><ArrowLeft size={15}/></button><button disabled={page>=maxPage} onClick={()=>setPage(page+1)} className="rounded-full border border-border p-2 disabled:opacity-40" aria-label="Next page" data-testid="button-page-next"><ArrowRight size={15}/></button></div></div>}
    {editing && <EditDialog item={editing} categories={categories.data ?? []} busy={update.isPending} onClose={()=>setEditing(null)} onSave={saveEdit}/>}
    {deleting && <ConfirmDialog title="Remove this note?" message="This will permanently remove this transaction from your record." busy={remove.isPending} onClose={()=>setDeleting(null)} onConfirm={confirmDelete}/>}
  </div>;
}

function EditDialog({ item, categories, busy, onClose, onSave }: { item: TransactionRow; categories: CategoryRow[]; busy: boolean; onClose: () => void; onSave: (v: TransactionUpdate) => void }) {
  const [type, setType] = useState<TransactionType>(item.type);
  const relevant = categories.filter(c=>c.type===type);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); onSave({ type, amount: Number(f.get('amount')), description: String(f.get('description')||'').trim() || null, merchant: String(f.get('merchant')||'').trim() || null, transaction_date: String(f.get('date')), category_id: String(f.get('category')||'') || null }); };
  return <Modal onClose={onClose}><h2 className="serif text-2xl">Edit your note</h2><p className="mt-1 text-sm text-muted-foreground">Make it match what happened.</p><form onSubmit={submit} className="mt-5 space-y-4"><TypeSwitch value={type} onChange={setType}/><label className="block text-xs font-semibold">Amount<input name="amount" required min="0.01" step="0.01" type="number" defaultValue={item.amount} className="field mt-1.5" data-testid="edit-amount"/></label><label className="block text-xs font-semibold">What was it?<input name="description" defaultValue={item.description || ''} className="field mt-1.5" data-testid="edit-description"/></label><label className="block text-xs font-semibold">Shop or person<input name="merchant" defaultValue={item.merchant || ''} className="field mt-1.5" data-testid="edit-merchant"/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold">Category<select name="category" defaultValue={item.category_id || ''} className="field mt-1.5"><option value="">Choose one</option>{relevant.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block text-xs font-semibold">Date<input name="date" type="date" defaultValue={item.transaction_date.slice(0,10)} required className="field mt-1.5"/></label></div><div className="flex gap-2 pt-1"><button type="button" onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Cancel</button><button disabled={busy} className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60" data-testid="button-save-edit">{busy?'Saving…':'Save changes'}</button></div></form></Modal>;
}

function ConfirmDialog({ title, message, busy, onClose, onConfirm }: { title: string; message: string; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal onClose={onClose}><h2 className="serif text-2xl">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p><div className="mt-6 flex gap-2"><button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Keep it</button><button onClick={onConfirm} disabled={busy} className="flex-1 rounded-full bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60" data-testid="button-confirm-delete">{busy?'Removing…':'Remove note'}</button></div></Modal>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17251f]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="max-h-[92dvh] w-full max-w-[500px] overflow-y-auto rounded-t-[28px] border border-border bg-background p-6 shadow-2xl sm:rounded-[28px]"><div className="mb-3 flex justify-end"><button onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-dialog"><X size={18}/></button></div>{children}</div></div>;
}

function TypeSwitch({ value, onChange }: { value: TransactionType; onChange: (v: TransactionType) => void }) {
  return <div className="grid grid-cols-2 rounded-full bg-muted p-1">{(['expense','income'] as const).map(t=><button key={t} type="button" onClick={()=>onChange(t)} className={`rounded-full py-2 text-sm font-semibold capitalize transition ${value===t?'bg-card text-foreground shadow-sm':'text-muted-foreground'}`} data-testid={`type-${t}`}>{t}</button>)}</div>;
}

type EntryMode = 'manual'|'text'|'voice';
type Draft = { type: TransactionType; amount: string; description: string; merchant: string; category_id: string; transaction_date: string; source: TransactionInput['source'] };
function blankDraft(mode: EntryMode = 'manual'): Draft { return { type:'expense', amount:'', description:'', merchant:'', category_id:'', transaction_date:today(), source:mode==='manual'?'manual':mode==='text'?'text':'voice' }; }
function categoryLoadError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST205') {
    return 'The connected Supabase project is missing the categories table. Run lib/db/supabase-core-schema.sql in that project’s SQL Editor, then refresh this page.';
  }
  return 'Categories could not load from Supabase. Check the project connection and refresh this page.';
}

function parseLocally(text: string, categories: CategoryRow[]): Partial<Draft> {
  const amountMatch = text.replace(/,/g,'').match(/(?:rs\.?|npr|रु\.?)?\s*(\d+(?:\.\d{1,2})?)/i);
  const type: TransactionType = /\b(got|received|salary|earned|income|sold|paid me)\b/i.test(text) ? 'income' : 'expense';
  const category = categories.filter(c=>c.type===type).find(c=>c.name.split(/\s+/).some(w=>w.length>3 && text.toLowerCase().includes(w.toLowerCase())));
  const merchant = text.match(/\b(?:at|from|to)\s+([A-Za-z][A-Za-z0-9 &'’-]{1,28})/i)?.[1]?.trim();
  return { amount: amountMatch?.[1] || '', type, description: text.trim().replace(/^(spent|paid|bought|got|received)\s+/i,'').slice(0,100), merchant: merchant || '', category_id: category?.id || '' };
}

function NewTransactionPage() {
  const { user } = useAuthSession();
  const [, navigate] = useLocation();
  const categoriesQuery = useCategories(undefined, !!user);
  const create = useCreateTransaction();
  const [mode, setMode] = useState<EntryMode>('manual');
  const [draft, setDraft] = useState<Draft>(()=>blankDraft());
  const [sentence, setSentence] = useState('');
  const [transcript, setTranscript] = useState('');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const categories = categoriesQuery.data ?? [];
  const available = categories.filter(c=>c.type===draft.type);
  const categoriesReady = !categoriesQuery.isLoading && !categoriesQuery.isError && available.length > 0;
  const setField = (key: keyof Draft, value: string) => setDraft(d=>({...d,[key]:value}));
  const chooseMode = (next: EntryMode) => { setMode(next); setDraft(blankDraft(next)); setSentence(''); setTranscript(''); setReview(false); setError(''); };
  const parseText = () => { if(!sentence.trim()){setError('Write a few words first, like “Rs 240 lunch at Nima’s”.');return;} const parsed=parseLocally(sentence,categories); setDraft(d=>({...d,...parsed,source:'text'})); setReview(Boolean(parsed.category_id&&categoriesReady)); setError(''); };
  const startSpeech = () => {
    const Speech = (window as Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognizer }).webkitSpeechRecognition;
    if (!Speech) { setError('Speech input is not available in this browser. Type your note instead.'); return; }
    const recognition = new Speech(); recognition.lang='en-NP'; recognition.interimResults=false; recognition.maxAlternatives=1;
    recognition.onstart=()=>{setListening(true);setError('');}; recognition.onend=()=>setListening(false);
    recognition.onerror=()=>{setListening(false);setError('We could not hear that clearly. You can type your note instead.');};
    recognition.onresult=(event)=>{const heard=event.results[0][0].transcript;const parsed=parseLocally(heard,categories);setTranscript(heard);setSentence(heard);setDraft(d=>({...d,...parsed,source:'voice'}));setReview(Boolean(parsed.category_id&&categoriesReady));setError('');};
    recognition.start();
  };
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(''); if(!categoriesReady)return; if(!draft.amount || Number(draft.amount)<=0){setError('Add an amount greater than zero.');return;} if(!draft.category_id){setError('Choose a category before saving.');return;} setReview(true); };
  const save = () => {
    if(!draft.amount || Number(draft.amount)<=0 || !draft.category_id){setError('Please check the amount and category.');setReview(false);return;}
    create.mutate({type:draft.type,amount:Number(draft.amount),currency:'NPR',category_id:draft.category_id,description:draft.description.trim()||null,merchant:draft.merchant.trim()||null,transaction_date:draft.transaction_date,source:draft.source}, {onSuccess:()=>navigate('/transactions'),onError:e=>{setError(e instanceof Error?e.message:'Could not save your note. Please try again.');setReview(false);}});
  };
  return <div className="page-enter mx-auto max-w-[760px]">
    <Link href="/transactions" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground" data-testid="link-back-transactions"><ArrowLeft size={15}/>Back to your notes</Link>
    <PageHead eyebrow="One small note" title="What happened?" subtitle="A quick record is all it takes. Add as much or as little detail as feels useful."/>
    <div className="mb-5 grid grid-cols-3 gap-2 rounded-[20px] border border-border bg-card p-2">
      <ModeButton active={mode==='manual'} icon={<Plus size={16}/>} label="Type it in" onClick={()=>chooseMode('manual')} testId="mode-manual"/>
      <ModeButton active={mode==='text'} icon={<Sparkles size={16}/>} label="A few words" onClick={()=>chooseMode('text')} testId="mode-text"/>
      <ModeButton active={mode==='voice'} icon={<Mic size={16}/>} label="Say it" onClick={()=>chooseMode('voice')} testId="mode-voice"/>
    </div>
    <section className="rounded-[26px] border border-border bg-card p-5 soft-shadow sm:p-7">
      {mode==='text' && <div className="mb-6 rounded-[18px] bg-[#eee8d9] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#44594b]"><Sparkles size={14}/>Describe it simply</div><div className="flex flex-col gap-2 sm:flex-row"><input value={sentence} onChange={e=>setSentence(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();parseText();}}} placeholder="Rs 240 for lunch at Nima's" className="field border-transparent bg-card" data-testid="input-natural-note"/><button onClick={parseText} className="rounded-xl bg-[#29473d] px-5 py-3 text-sm font-semibold text-[#f7f1e6]" data-testid="button-parse-text">Make a draft</button></div><p className="mt-2 text-[10px] leading-relaxed text-[#6e786c]">This is a simple on-device reading of your words, not AI. Check every detail before saving.</p></div>}
      {mode==='voice' && <div className="mb-6 rounded-[18px] bg-[#eee8d9] p-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold text-[#44594b]"><AudioLines size={15}/>Speak a quick note</div><p className="mt-1 text-[10px] text-[#6e786c]">Your browser turns speech into text. Nothing is saved until you confirm.</p></div><button onClick={startSpeech} disabled={listening} className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${listening?'animate-pulse bg-[#b76654] text-white':'bg-[#29473d] text-[#f7f1e6]'}`} aria-label="Start speech transcription" data-testid="button-start-speech">{listening?<AudioLines size={20}/>:<Mic size={19}/>}</button></div>{transcript&&<p className="mt-3 rounded-xl bg-card px-3 py-2 text-sm text-foreground" data-testid="text-transcript">“{transcript}”</p>}</div>}
      {error && <div role="alert" className="mb-4 rounded-xl bg-[#f5e5df] px-4 py-3 text-sm text-[#914e40]" data-testid="status-entry-error">{error}</div>}
      {categoriesQuery.isError && <div role="alert" className="mb-4 rounded-xl bg-[#f5e5df] px-4 py-3 text-sm text-[#914e40]" data-testid="status-categories-error">{categoryLoadError(categoriesQuery.error)}</div>}
      {!categoriesQuery.isLoading && !categoriesQuery.isError && available.length === 0 && <div role="status" className="mb-4 rounded-xl bg-[#f5e5df] px-4 py-3 text-sm text-[#914e40]" data-testid="status-categories-empty">No {draft.type} categories are available. Run lib/db/supabase-core-schema.sql in the Supabase project connected to this app, then refresh.</div>}
      {categoriesQuery.isLoading ? <div className="space-y-4">{[0,1,2].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-muted"/>)}</div> : <form onSubmit={submit} className="space-y-5">
        <div><label className="mb-2 block text-xs font-bold">Is this money in or out?</label><TypeSwitch value={draft.type} onChange={v=>{setField('type',v);setField('category_id','');}}/></div>
        <label className="block text-xs font-bold">How much?<div className="relative mt-1.5"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rs</span><input autoFocus={mode==='manual'} required type="number" min="0.01" step="0.01" value={draft.amount} onChange={e=>setField('amount',e.target.value)} placeholder="0.00" className="field mono pl-12 text-lg" inputMode="decimal" data-testid="input-amount"/></div></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">What was it?<input value={draft.description} onChange={e=>setField('description',e.target.value)} placeholder="Lunch, bus fare, salary…" className="field mt-1.5" data-testid="input-description"/></label><label className="block text-xs font-bold">Where or who?<input value={draft.merchant} onChange={e=>setField('merchant',e.target.value)} placeholder="Shop, person, workplace" className="field mt-1.5" data-testid="input-merchant"/></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">Choose a category<select required disabled={categoriesQuery.isError || available.length === 0} value={draft.category_id} onChange={e=>setField('category_id',e.target.value)} className="field mt-1.5 disabled:cursor-not-allowed disabled:opacity-60" data-testid="select-category"><option value="">{categoriesQuery.isError?'Database setup needed':available.length===0?'No categories available':'Pick one'}</option>{available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-muted-foreground">{categoriesQuery.isError?'See the setup message above.':available.length===0?'Add the database categories, then refresh.':'These are your available categories.'}</span></label><label className="block text-xs font-bold">When?<input required type="date" value={draft.transaction_date} onChange={e=>setField('transaction_date',e.target.value)} className="field mt-1.5" data-testid="input-transaction-date"/></label></div>
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between"><p className="flex items-center gap-2 self-center text-[10px] text-muted-foreground"><Check size={13} className="text-[#638566]"/>You will review before anything is saved.</p><button disabled={!categoriesReady} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-review-entry">Review note <ArrowRight size={16}/></button></div>
      </form>}
    </section>
    <p className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] text-muted-foreground"><CircleHelp size={13}/>Your notes stay private to your account.</p>
    {review && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17251f]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"><div className="w-full max-w-[440px] rounded-t-[28px] border border-border bg-background p-6 shadow-2xl sm:rounded-[28px]"><div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-[#e6eee3] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#4b684d]">Ready to save?</span><button onClick={()=>setReview(false)} aria-label="Close review" className="rounded-full p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-review"><X size={18}/></button></div><h2 className="serif text-[28px]">One last look.</h2><p className="mt-1 text-sm text-muted-foreground">Nothing is saved until you choose to confirm.</p><div className="mt-5 rounded-[18px] bg-[#eee8d9] p-4"><p className="text-xs capitalize text-[#647265]">{draft.type} · {categories.find(c=>c.id===draft.category_id)?.name || 'Choose category'}</p><p className="mono mt-1 text-[30px] font-medium tracking-[-.05em] text-[#253d34]">{draft.amount?money(Number(draft.amount)):'Amount missing'}</p><p className="mt-1 text-sm font-semibold">{draft.description || 'No description'}</p><p className="mt-1 text-xs text-[#647265]">{draft.merchant || 'No shop or person'} <span className="mx-1">·</span>{draft.transaction_date ? dateLabel(draft.transaction_date):'No date'}</p><p className="mt-3 border-t border-[#d8d1c1] pt-3 text-[10px] text-[#7b786b]">Entered by {draft.source==='manual'?'you':draft.source==='voice'?'speech transcription':'local text reading'} — please check for accuracy.</p></div><div className="mt-5 flex gap-2"><button onClick={()=>setReview(false)} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold" data-testid="button-edit-draft">Make changes</button><button onClick={save} disabled={create.isPending} className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60" data-testid="button-confirm-save">{create.isPending?<><LoaderCircle className="mr-2 inline animate-spin" size={15}/>Saving…</>:<>Save note <Check className="ml-1 inline" size={15}/></>}</button></div></div></div>}
  </div>;
}

function ModeButton({ active, icon, label, onClick, testId }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; testId: string }) {
  return <button onClick={onClick} className={`flex min-w-0 items-center justify-center gap-2 rounded-[14px] px-2 py-3 text-xs font-semibold transition sm:text-sm ${active?'bg-primary text-primary-foreground shadow-sm':'text-muted-foreground hover:bg-muted'}`} data-testid={testId}>{icon}<span className="truncate">{label}</span></button>;
}

interface SpeechRecognizer {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onstart: (()=>void)|null; onend: (()=>void)|null; onerror: (()=>void)|null;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;
  start: ()=>void;
}
declare global { interface Window { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer } }

function AuthPage({ signUp = false }: { signUp?: boolean }) {
  const { user, isLoading } = useAuthSession();
  const [, navigate] = useLocation();
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  if(user&&!isLoading){navigate('/');return null;}
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setPending(true);setError('');setMessage('');const f=new FormData(e.currentTarget);const email=String(f.get('email'));const password=String(f.get('password'));try{const result=signUp?await signUpWithPassword(email,password,String(f.get('full_name'))):await signInWithPassword(email,password);if(result.error)throw result.error;if(signUp&&!result.data.session)setMessage('Check your email to confirm your account, then come back to sign in.');else navigate('/');}catch(err){setError(err instanceof Error?err.message:'Something went wrong. Please try again.');}finally{setPending(false);}};
  return <div className="grain flex min-h-[100dvh] items-center justify-center px-5 py-10"><div className="grid w-full max-w-[940px] overflow-hidden rounded-[30px] border border-border bg-card soft-shadow md:grid-cols-[.9fr_1.1fr]">
    <div className="relative hidden min-h-[580px] flex-col justify-between overflow-hidden bg-[#203d35] p-9 text-[#f7f1e6] md:flex"><div className="absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/10"/><div className="absolute -right-12 top-32 h-56 w-56 rounded-full border border-white/10"/><Brand dark/><div className="relative"><p className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#dab384]">Money, without the fuss</p><h1 className="serif max-w-sm text-[43px] leading-[1.03] tracking-[-.04em]">A quieter way to keep track.</h1><p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">Write down what comes in and what goes out. See your own picture, one everyday note at a time.</p></div><div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/50"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><Wallet size={15}/></span>Made for your everyday in Nepal.</div></div>
    <div className="p-6 sm:p-10 md:p-12"><div className="mb-10 md:hidden"><Brand/></div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#9a7455]">{signUp?'A fresh page':'Welcome back'}</p><h2 className="serif text-[36px] tracking-[-.035em]">{signUp?'Make this yours.':'Come on in.'}</h2><p className="mt-2 text-sm text-muted-foreground">{signUp?'Create your private space to keep a note of money.':'Your notes will be right where you left them.'}</p>
      {error&&<div className="mt-5 rounded-xl bg-[#f5e5df] px-4 py-3 text-sm text-[#914e40]" role="alert" data-testid="status-auth-error">{error}</div>}{message&&<div className="mt-5 rounded-xl bg-[#e6eee3] px-4 py-3 text-sm text-[#466548]" role="status" data-testid="status-auth-message">{message}</div>}
      <form className="mt-7 space-y-4" onSubmit={submit}>{signUp&&<label className="block text-xs font-semibold">Your name<input name="full_name" autoComplete="name" required className="field mt-1.5" placeholder="What should we call you?" data-testid="input-full-name"/></label>}<label className="block text-xs font-semibold">Email address<input name="email" type="email" autoComplete="email" required className="field mt-1.5" placeholder="you@example.com" data-testid="input-email"/></label><label className="block text-xs font-semibold">Password<input name="password" type="password" autoComplete={signUp?'new-password':'current-password'} minLength={6} required className="field mt-1.5" placeholder="At least 6 characters" data-testid="input-password"/></label><button disabled={pending} className="mt-2 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-auth-submit">{pending?'Just a moment…':signUp?'Create my space':'Sign in'}</button></form>
      <p className="mt-6 text-center text-xs text-muted-foreground">{signUp?'Already have a space?':'New to Money Companion?'} <Link href={signUp?'/sign-in':'/sign-up'} className="font-bold text-primary underline-offset-4 hover:underline" data-testid="link-auth-switch">{signUp?'Sign in':'Create an account'}</Link></p><p className="mt-8 border-t border-border pt-5 text-center text-[10px] leading-relaxed text-muted-foreground">Your transactions are private to your account.<br/>Money Companion is a simple record, not financial advice.</p>
    </div>
  </div></div>;
}

function PublicHome() {
  return <div className="min-h-[90dvh]"><header className="flex items-center justify-between py-3"><Brand/><div className="flex items-center gap-2"><Link href="/sign-in" className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-public-signin">Sign in</Link><Link href="/sign-up" className="rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground" data-testid="link-public-signup">Get started</Link></div></header><div className="grid items-center gap-12 py-14 md:grid-cols-[1.1fr_.9fr] md:py-24"><div><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d9c8a9] bg-[#f4eddd] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#7d694b]"><span className="h-1.5 w-1.5 rounded-full bg-[#67876b]"/>For the everyday in Nepal</p><h1 className="serif max-w-[700px] text-[54px] leading-[.99] tracking-[-.055em] sm:text-[76px]">Money notes,<br/><span className="text-[#9a7455]">made human.</span></h1><p className="mt-6 max-w-[470px] text-base leading-relaxed text-muted-foreground">A calm little place to write down money in and money out. No accounting words, no big setup. Just your own picture, getting clearer over time.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5" data-testid="button-get-started">Start with a note <ArrowRight size={16}/></Link><Link href="/sign-in" className="rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold" data-testid="button-public-login">I already have an account</Link></div><p className="mt-4 text-[10px] text-muted-foreground">Private to you. In Nepali rupees. Nothing to connect.</p></div><div className="relative mx-auto w-full max-w-[400px]"><div className="absolute -inset-5 rotate-[-4deg] rounded-[36px] border border-[#d7c5a3] bg-[#efe5d0]"/><div className="relative rotate-[2deg] rounded-[28px] border border-[#eee5d7] bg-[#fffaf0] p-6 shadow-[0_28px_70px_-40px_rgba(51,62,49,.42)]"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8d7959]">A note to self</span><span className="rounded-full bg-[#e3ebdd] px-2.5 py-1 text-[9px] font-bold text-[#537453]">TODAY</span></div><p className="serif mt-7 text-[28px] leading-tight">A little more at ease.</p><div className="my-6 h-px bg-[#e7decf]"/><div className="space-y-4"><PreviewLine color="bg-[#dce9d9]" icon={<ArrowDownLeft size={16}/>} title="Pay from the shop" caption="Income · this morning" value="+ Rs 1,850"/><PreviewLine color="bg-[#f1e2d4]" icon={<Coffee size={16}/>} title="Tea & a bun" caption="Food · nearby" value="− Rs 125"/></div><div className="mt-6 rounded-2xl bg-[#eae9dc] p-4"><p className="text-[10px] text-[#68705f]">Your recorded balance</p><p className="mono mt-1 text-2xl font-medium text-[#29473d]">Rs 1,725</p><p className="mt-2 text-[9px] text-[#828371]">A preview, not real transaction data.</p></div></div><div className="absolute -bottom-9 -left-10 hidden h-20 w-20 items-center justify-center rounded-full bg-[#cd8867] text-[#fff5e9] md:flex"><span className="serif -rotate-12 text-center text-[14px] leading-tight">your money<br/>your way</span></div></div></div><div className="grid gap-5 border-t border-border py-8 sm:grid-cols-3"><IntroNote title="Quick to jot down" body="Type a number, say it aloud, or write it in your own words. You always review before saving."/><IntroNote title="No money jargon" body="Record an expense or income in plain language. Choose from your available categories."/><IntroNote title="Only your real notes" body="Your view grows from what you record. No made-up numbers or predictions." /></div></div>;
}
function PreviewLine({ color, icon, title, caption, value }: { color: string; icon: ReactNode; title: string; caption: string; value: string }) { return <div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-[14px] ${color} text-[#4a6951]`}>{icon}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#304036]">{title}</p><p className="text-[10px] text-[#8b8b7d]">{caption}</p></div><span className="mono text-[11px] font-medium text-[#455a49]">{value}</span></div>; }
function IntroNote({ title, body }: { title: string; body: string }) { return <div className="py-1"><p className="serif text-[19px]">{title}</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p></div>; }

function Router() {
  const { user, isLoading } = useAuthSession();
  const [location] = useLocation();
  if ((location==='/transactions'||location==='/transactions/new') && !isLoading && !user) return <AuthRedirect to="/sign-in"/>;
  if (location === '/sign-in' || location.startsWith('/sign-in/')) return <AuthPage/>;
  if (location === '/sign-up' || location.startsWith('/sign-up/')) return <AuthPage signUp/>;
  return <RoutedErrorBoundary><Switch>
    <Route path="/"><AppShell><Dashboard/></AppShell></Route>
    <Route path="/transactions"><AppShell><TransactionsPage/></AppShell></Route>
    <Route path="/transactions/new"><AppShell><NewTransactionPage/></AppShell></Route>
    <Route component={NotFound}/>
  </Switch></RoutedErrorBoundary>;
}
function AuthRedirect({ to }: { to: string }) { const [,navigate]=useLocation(); useEffect(()=>{navigate(to);},[navigate,to]); return <div className="grid min-h-[100dvh] place-items-center"><div className="h-8 w-8 animate-pulse rounded-full bg-primary/20"/></div>; }
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}

export default App;