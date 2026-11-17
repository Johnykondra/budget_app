import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FilePlus2,
  FolderKanban,
  ListOrdered,
  LogIn,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ActiveView,
  Category,
  CurrencyCode,
  Transaction,
} from './types/budget';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testConnection,
} from './lib/firebase';
import {
  createStarterCategories,
  createStarterTransactions,
  DEFAULT_PROFILE_SETTINGS,
} from './lib/seedData';
import { generateDocumentId, getMonthKey } from './lib/format';
import { OverviewView } from './components/views/OverviewView';
import { TransactionsView } from './components/views/TransactionsView';
import { NewTransactionView } from './components/views/NewTransactionView';
import { CategoriesView } from './components/views/CategoriesView';
import { SettingsView } from './components/views/SettingsView';
import { TransactionModal } from './components/modals/TransactionModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { CurrencySelector } from './components/CurrencySelector';

const SANDBOX_STORAGE_KEY = 'ledgerline_sandbox_v3';
const THEME_STORAGE_KEY = 'ledgerline_theme_v1';

interface SandboxState {
  currency: CurrencyCode;
  monthlyBudgetTarget: number;
  categories: Category[];
  transactions: Transaction[];
}

const EDUCATION_CAT_SANDBOX_MIGRATION_KEY = 'ledgerline_edu_cat_v1';

function loadSandboxState(): SandboxState {
  try {
    localStorage.removeItem('ledgerline_sandbox_v1');
    localStorage.removeItem('ledgerline_sandbox_v2');
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SandboxState;
      if (
        parsed &&
        Array.isArray(parsed.categories) &&
        Array.isArray(parsed.transactions)
      ) {
        const eduCat = createStarterCategories('sandbox').find(
          (c) => c.id === 'cat_education_fees'
        );
        const alreadyMigrated =
          localStorage.getItem(EDUCATION_CAT_SANDBOX_MIGRATION_KEY) === '1';
        const hasEduCategory = parsed.categories.some(
          (c) => c.id === 'cat_education_fees' || /school|college/i.test(c.name)
        );
        if (eduCat && !alreadyMigrated && !hasEduCategory) {
          localStorage.setItem(EDUCATION_CAT_SANDBOX_MIGRATION_KEY, '1');
          return {
            ...parsed,
            categories: [...parsed.categories, eduCat],
          };
        }
        localStorage.setItem(EDUCATION_CAT_SANDBOX_MIGRATION_KEY, '1');
        return parsed;
      }
    }
  } catch {
    // Fallback to clean starter categories with empty transactions
  }
  return {
    currency: DEFAULT_PROFILE_SETTINGS.currency,
    monthlyBudgetTarget: DEFAULT_PROFILE_SETTINGS.monthlyBudgetTarget,
    categories: createStarterCategories('sandbox'),
    transactions: [],
  };
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sandbox, setSandbox] = useState<SandboxState>(() => loadSandboxState());

  const [cloudCurrency, setCloudCurrency] = useState<CurrencyCode>('USD');
  const [cloudBudgetTarget, setCloudBudgetTarget] = useState<number>(4200);
  const [cloudCategories, setCloudCategories] = useState<Category[]>([]);
  const [cloudTransactions, setCloudTransactions] = useState<Transaction[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  // Persist local sandbox state when signed out
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(sandbox));
    } catch {
      // ignore storage errors
    }
  }, [sandbox, user]);

  // Test Firestore connection & subscribe to Firebase Auth
  useEffect(() => {
    void testConnection();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Ensure new user workspace is seeded atomically, then attach Firestore listeners
  useEffect(() => {
    if (!authReady || !user) {
      setLoadingCloud(false);
      return;
    }

    let cancelled = false;
    setLoadingCloud(true);

    const uid = user.uid;
    const profileRef = doc(db, 'users', uid);

    const bootstrapAndListen = async () => {
      try {
        const snap = await getDoc(profileRef);
        if (!snap.exists() && !cancelled) {
          const batch = writeBatch(db);
          batch.set(profileRef, {
            userId: uid,
            currency: DEFAULT_PROFILE_SETTINGS.currency,
            monthlyBudgetTarget: DEFAULT_PROFILE_SETTINGS.monthlyBudgetTarget,
            seededDemoData: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          for (const cat of createStarterCategories(uid)) {
            batch.set(doc(db, 'users', uid, 'categories', cat.id), {
              ...cat,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          await batch.commit();
          try {
            localStorage.setItem(`ledgerline_edu_cat_cloud_${uid}`, '1');
          } catch {
            // ignore storage errors
          }
        } else if (snap.exists() && !cancelled) {
          if (snap.data()?.seededDemoData === true) {
            // One-time cleanup of legacy auto-seeded sample transactions
            const txSnap = await getDocs(
              query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid))
            );
            const seededDocs = txSnap.docs.filter((d) => d.id.startsWith('tx_seed_'));
            for (let i = 0; i < seededDocs.length; i += 400) {
              const cleanupBatch = writeBatch(db);
              for (const docSnap of seededDocs.slice(i, i + 400)) {
                cleanupBatch.delete(docSnap.ref);
              }
              await cleanupBatch.commit();
            }
            await updateDoc(profileRef, {
              seededDemoData: false,
              updatedAt: serverTimestamp(),
            });
          }

          // One-time addition of School & College Fee category for existing accounts
          const cloudMigrationKey = `ledgerline_edu_cat_cloud_${uid}`;
          let alreadySeededEdu = false;
          try {
            alreadySeededEdu = localStorage.getItem(cloudMigrationKey) === '1';
          } catch {
            alreadySeededEdu = false;
          }

          if (!alreadySeededEdu) {
            const eduCat = createStarterCategories(uid).find(
              (c) => c.id === 'cat_education_fees'
            );
            if (eduCat) {
              const existingCatsSnap = await getDocs(
                query(collection(db, 'users', uid, 'categories'), where('userId', '==', uid))
              );
              const hasEduCat = existingCatsSnap.docs.some(
                (d) =>
                  d.id === eduCat.id ||
                  /school|college/i.test(String(d.data().name ?? ''))
              );
              if (!hasEduCat && !cancelled) {
                await setDoc(doc(db, 'users', uid, 'categories', eduCat.id), {
                  ...eduCat,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            }
            try {
              localStorage.setItem(cloudMigrationKey, '1');
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    };

    void bootstrapAndListen();

    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.currency) setCloudCurrency(data.currency as CurrencyCode);
          if (typeof data.monthlyBudgetTarget === 'number') {
            setCloudBudgetTarget(data.monthlyBudgetTarget);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const catQuery = query(
      collection(db, 'users', uid, 'categories'),
      where('userId', '==', uid)
    );
    const unsubCategories = onSnapshot(
      catQuery,
      (snapshot) => {
        const rows: Category[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id,
            userId: data.userId,
            name: data.name,
            kind: data.kind,
            color: data.color,
            icon: data.icon,
            monthlyLimit: Number(data.monthlyLimit ?? 0),
            isArchived: Boolean(data.isArchived),
          };
        });
        setCloudCategories(rows);
        setLoadingCloud(false);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/categories`)
    );

    const txQuery = query(
      collection(db, 'users', uid, 'transactions'),
      where('userId', '==', uid)
    );
    const unsubTransactions = onSnapshot(
      txQuery,
      (snapshot) => {
        const rows: Transaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id,
            userId: data.userId,
            categoryId: data.categoryId,
            type: data.type,
            amount: Number(data.amount ?? 0),
            merchant: data.merchant,
            note: data.note ?? '',
            date: data.date,
            paymentMethod: data.paymentMethod,
          };
        });
        setCloudTransactions(rows);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`)
    );

    return () => {
      cancelled = true;
      unsubProfile();
      unsubCategories();
      unsubTransactions();
    };
  }, [authReady, user]);

  const currency = user ? cloudCurrency : sandbox.currency;
  const monthlyBudgetTarget = user ? cloudBudgetTarget : sandbox.monthlyBudgetTarget;
  const categories = user ? cloudCategories : sandbox.categories;
  const transactions = user ? cloudTransactions : sandbox.transactions;

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>(['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06']);
    for (const tx of transactions) {
      const mk = getMonthKey(tx.date);
      if (/^\d{4}-\d{2}$/.test(mk)) monthSet.add(mk);
    }
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.'
      );
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    await signOutUser();
    setSelectedCategoryId(null);
  }, []);

  const handleSaveTransaction = useCallback(
    async (payload: Omit<Transaction, 'id' | 'userId'>, existingId?: string) => {
      if (!user) {
        setSandbox((prev) => {
          if (existingId) {
            return {
              ...prev,
              transactions: prev.transactions.map((t) =>
                t.id === existingId ? { ...payload, id: existingId, userId: 'sandbox' } : t
              ),
            };
          }
          const newTx: Transaction = {
            ...payload,
            id: generateDocumentId('tx'),
            userId: 'sandbox',
          };
          return { ...prev, transactions: [newTx, ...prev.transactions] };
        });
        setSelectedMonth(getMonthKey(payload.date));
        return;
      }

      const uid = user.uid;
      if (existingId) {
        const ref = doc(db, 'users', uid, 'transactions', existingId);
        try {
          await updateDoc(ref, {
            categoryId: payload.categoryId,
            type: payload.type,
            amount: payload.amount,
            merchant: payload.merchant,
            note: payload.note,
            date: payload.date,
            paymentMethod: payload.paymentMethod,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/transactions/${existingId}`);
        }
      } else {
        const newId = generateDocumentId('tx');
        const ref = doc(db, 'users', uid, 'transactions', newId);
        try {
          await setDoc(ref, {
            ...payload,
            id: newId,
            userId: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}/transactions/${newId}`);
        }
      }
      setSelectedMonth(getMonthKey(payload.date));
    },
    [user]
  );

  const handleDeleteTransaction = useCallback(
    async (txId: string) => {
      if (!user) {
        setSandbox((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== txId),
        }));
        return;
      }

      const uid = user.uid;
      try {
        await deleteDoc(doc(db, 'users', uid, 'transactions', txId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/transactions/${txId}`);
      }
    },
    [user]
  );

  const handleSaveCategory = useCallback(
    async (payload: Omit<Category, 'id' | 'userId'>, existingId?: string) => {
      if (!user) {
        setSandbox((prev) => {
          if (existingId) {
            return {
              ...prev,
              categories: prev.categories.map((c) =>
                c.id === existingId ? { ...payload, id: existingId, userId: 'sandbox' } : c
              ),
            };
          }
          const newCat: Category = {
            ...payload,
            id: generateDocumentId('cat'),
            userId: 'sandbox',
          };
          return { ...prev, categories: [...prev.categories, newCat] };
        });
        return;
      }

      const uid = user.uid;
      if (existingId) {
        const ref = doc(db, 'users', uid, 'categories', existingId);
        try {
          await updateDoc(ref, {
            name: payload.name,
            kind: payload.kind,
            color: payload.color,
            icon: payload.icon,
            monthlyLimit: payload.monthlyLimit,
            isArchived: payload.isArchived,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/categories/${existingId}`);
        }
      } else {
        const newId = generateDocumentId('cat');
        const ref = doc(db, 'users', uid, 'categories', newId);
        try {
          await setDoc(ref, {
            ...payload,
            id: newId,
            userId: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}/categories/${newId}`);
        }
      }
    },
    [user]
  );

  const handleToggleArchiveCategory = useCallback(
    async (cat: Category) => {
      if (!user) {
        setSandbox((prev) => ({
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === cat.id ? { ...c, isArchived: !c.isArchived } : c
          ),
        }));
        return;
      }

      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid, 'categories', cat.id), {
          isArchived: !cat.isArchived,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/categories/${cat.id}`);
      }
    },
    [user]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      if (!user) {
        setSandbox((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== categoryId),
        }));
        if (selectedCategoryId === categoryId) setSelectedCategoryId(null);
        return;
      }

      const uid = user.uid;
      try {
        await deleteDoc(doc(db, 'users', uid, 'categories', categoryId));
        if (selectedCategoryId === categoryId) setSelectedCategoryId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/categories/${categoryId}`);
      }
    },
    [user, selectedCategoryId]
  );

  const handleSavePreferences = useCallback(
    async (nextCurrency: CurrencyCode, nextTarget: number) => {
      if (!user) {
        setSandbox((prev) => ({
          ...prev,
          currency: nextCurrency,
          monthlyBudgetTarget: nextTarget,
        }));
        return;
      }

      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          currency: nextCurrency,
          monthlyBudgetTarget: nextTarget,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [user]
  );

  const handleChangeCurrency = useCallback(
    async (nextCurrency: CurrencyCode) => {
      if (!user) {
        setSandbox((prev) => ({
          ...prev,
          currency: nextCurrency,
        }));
        return;
      }

      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          currency: nextCurrency,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [user]
  );

  const handleReseedSampleData = useCallback(async () => {
    if (!user) {
      setSandbox({
        currency: DEFAULT_PROFILE_SETTINGS.currency,
        monthlyBudgetTarget: DEFAULT_PROFILE_SETTINGS.monthlyBudgetTarget,
        categories: createStarterCategories('sandbox'),
        transactions: createStarterTransactions('sandbox'),
      });
      setSelectedMonth('2026-11');
      setSelectedCategoryId(null);
      return;
    }

    const uid = user.uid;
    try {
      const batch = writeBatch(db);
      for (const cat of createStarterCategories(uid)) {
        batch.set(doc(db, 'users', uid, 'categories', cat.id), {
          ...cat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const tx of createStarterTransactions(uid)) {
        batch.set(doc(db, 'users', uid, 'transactions', tx.id), {
          ...tx,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setSelectedMonth('2026-11');
      setSelectedCategoryId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  }, [user]);

  const handleClearAllTransactions = useCallback(async () => {
    if (!user) {
      setSandbox((prev) => ({ ...prev, transactions: [] }));
      setSelectedCategoryId(null);
      return;
    }

    const uid = user.uid;
    const txPath = `users/${uid}/transactions`;
    try {
      const txQuery = query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid));
      const snap = await getDocs(txQuery);
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        for (const docSnap of docs.slice(i, i + 400)) {
          batch.delete(docSnap.ref);
        }
        await batch.commit();
      }
      setSelectedCategoryId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, txPath);
    }
  }, [user]);

  const navItems: Array<{ id: ActiveView; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: ListOrdered },
    { id: 'new-transaction', label: 'New Transaction', icon: FilePlus2 },
    { id: 'categories', label: 'Categories', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const activeTitle =
    navItems.find((n) => n.id === activeView)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Wordmark */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              Ledgerline
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-4 space-y-1" aria-label="Workspace sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Currency, Theme & Account */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Currency Type
            </div>
            <CurrencySelector
              currency={currency}
              onChange={handleChangeCurrency}
              compact
            />
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>{darkMode ? 'Dark Appearance' : 'Light Appearance'}</span>
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {user ? (
            <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                {user.displayName || 'Synced Account'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {user.email}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                Local preview active. Sign in to sync budgets to Firestore.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-md hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in with Google
              </button>
              {authError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5">
                  {authError}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap truncate">
              <span className="text-slate-500 dark:text-slate-400">Ledgerline</span>
              <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Transaction
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {loadingCloud ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-6 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
                <div className="xl:col-span-6 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <OverviewView
                  transactions={transactions}
                  categories={categories}
                  currency={currency}
                  monthlyBudgetTarget={monthlyBudgetTarget}
                  selectedMonth={selectedMonth}
                  selectedCategoryId={selectedCategoryId}
                  availableMonths={availableMonths}
                  onSelectMonth={setSelectedMonth}
                  onSelectCategory={setSelectedCategoryId}
                  onChangeCurrency={handleChangeCurrency}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onEditTransaction={(tx) => {
                    setEditingTx(tx);
                    setTxModalOpen(true);
                  }}
                  onOpenCategories={() => setActiveView('categories')}
                  onViewAllTransactions={() => setActiveView('transactions')}
                />
              )}

              {activeView === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  categories={categories}
                  currency={currency}
                  availableMonths={availableMonths}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onClearAllTransactions={handleClearAllTransactions}
                  onEditTransaction={(tx) => {
                    setEditingTx(tx);
                    setTxModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeView === 'new-transaction' && (
                <NewTransactionView
                  categories={categories}
                  transactions={transactions}
                  currency={currency}
                  defaultMonth={selectedMonth}
                  onChangeCurrency={handleChangeCurrency}
                  onSaveTransaction={(payload) => handleSaveTransaction(payload)}
                  onClearAllTransactions={handleClearAllTransactions}
                  onOpenNewCategory={() => {
                    setEditingCat(null);
                    setCatModalOpen(true);
                  }}
                  onNavigateToLedger={() => setActiveView('transactions')}
                />
              )}

              {activeView === 'categories' && (
                <CategoriesView
                  categories={categories}
                  transactions={transactions}
                  currency={currency}
                  monthlyBudgetTarget={monthlyBudgetTarget}
                  selectedMonth={selectedMonth}
                  onCreateCategory={() => {
                    setEditingCat(null);
                    setCatModalOpen(true);
                  }}
                  onEditCategory={(cat) => {
                    setEditingCat(cat);
                    setCatModalOpen(true);
                  }}
                  onToggleArchiveCategory={handleToggleArchiveCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  user={user}
                  currency={currency}
                  monthlyBudgetTarget={monthlyBudgetTarget}
                  transactionCount={transactions.length}
                  onSavePreferences={handleSavePreferences}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                  onReseedSampleData={handleReseedSampleData}
                  onClearAllTransactions={handleClearAllTransactions}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Transaction Create/Edit Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        editingTransaction={editingTx}
        categories={categories}
        currency={currency}
        defaultMonth={selectedMonth}
        onChangeCurrency={handleChangeCurrency}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        onOpenNewCategory={() => {
          setEditingCat(null);
          setCatModalOpen(true);
        }}
      />

      {/* Custom Category Create/Edit Modal */}
      <CategoryModal
        isOpen={catModalOpen}
        editingCategory={editingCat}
        currency={currency}
        onClose={() => {
          setCatModalOpen(false);
          setEditingCat(null);
        }}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
