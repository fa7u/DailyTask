import { useState, useEffect, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun,
  Moon,
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  History, 
  X,
  Wallet,
  Tag,
  BarChart3,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Pencil,
  Repeat,
  Delete,
  Download,
  CreditCard,
  Banknote,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// --- Types ---
type TaskStatus = 'pending' | 'completed' | 'postponed' | 'analytics';
type GroupBy = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  price?: number;
  currency?: string;
  category?: string;
  paymentMethod?: 'cash' | 'card';
  date?: string;
  createdAt: string;
  tags?: string[];
}

// --- Constants ---
const STATUS_LABELS = {
  pending: 'المهام المطلوبة',
  completed: 'المهام المنجزة',
  postponed: 'المهام المؤجلة',
  analytics: 'التقارير والإحصائيات'
};

const CATEGORIES = [
  'المنزل',
  'شخصي',
  'أخرى'
];

const GROUP_LABELS: Record<GroupBy, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي'
};

const CURRENCIES = [
  { code: 'ر.ي', label: 'ريال يمني' },
  { code: '⃁', label: 'ريال سعودي' },
  { code: '$', label: 'دولار' }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('masrofati_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load from local storage:', e);
      return [];
    }
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('masrofati_dark_mode');
    return saved === 'true';
  });
  const [isInitialized, setIsInitialized] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskStatus>('pending');
  const [newTaskText, setNewTaskText] = useState('');
  const [showPriceModal, setShowPriceModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [showDeleteModal, setShowDeleteModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0]);
  const [currencyInput, setCurrencyInput] = useState(CURRENCIES[0].code);
  const [analyticsCurrency, setAnalyticsCurrency] = useState(CURRENCIES[0].code);
  const [customCategory, setCustomCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupBy, setGroupBy] = useState<GroupBy>('daily');

  // --- Filtering States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  const [filterTag, setFilterTag] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'cash' | 'card'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-high' | 'price-low'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('masrofati_budgets');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  // --- Handlers ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('masrofati_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    // Save to local storage
    localStorage.setItem('masrofati_tasks', JSON.stringify(tasks));

    // Sync to server as a backup
    const syncTasks = async () => {
      setIsSyncing(true);
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tasks),
        });
      } catch (e) {
        console.error('Failed to save to server:', e);
      } finally {
        setIsSyncing(false);
      }
    };

    const timeoutId = setTimeout(syncTasks, 1000); // Debounce syncing
    return () => clearTimeout(timeoutId);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('masrofati_budgets', JSON.stringify(monthlyBudgets));
  }, [monthlyBudgets]);

  // --- Handlers ---
  const toggleGroup = (date: string) => {
    setCollapsedGroups(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newTaskText,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
  };

  const deleteTask = (id: string) => {
    setShowDeleteModal({ isOpen: true, taskId: id });
  };

  const confirmDelete = () => {
    if (showDeleteModal.taskId) {
      setTasks(prev => prev.filter(t => t.id !== showDeleteModal.taskId));
      setShowDeleteModal({ isOpen: false, taskId: null });
    }
  };

  const duplicateTask = (task: Task) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: task.text,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
    // Optional: show a small toast or notification if available
  };

  const postponeTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, status: 'postponed', date: new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit', numberingSystem: 'latn' }) } : t
    ));
  };

  const restoreTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { 
        ...t, 
        status: 'pending', 
        createdAt: new Date().toISOString(),
        date: undefined 
      } : t
    ));
  };

  const openCompleteModal = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'completed') {
      setPriceInput(task.price?.toString() || '');
      const currency = task.currency || CURRENCIES[0].code;
      setCurrencyInput(currency);
      setPaymentMethod(task.paymentMethod || (currency === '⃁' ? 'card' : 'cash'));
      setTagsInput(task.tags?.join(' ') || '');
      if (CATEGORIES.includes(task.category || '')) {
        setCategoryInput(task.category || CATEGORIES[0]);
        setCustomCategory('');
      } else {
        setCategoryInput('أخرى');
        setCustomCategory(task.category || '');
      }
    } else {
      setPriceInput('');
      setCategoryInput(CATEGORIES[0]);
      const initialCurrency = CURRENCIES[0].code;
      setCurrencyInput(initialCurrency);
      setPaymentMethod(initialCurrency === '⃁' ? 'card' : 'cash');
      setCustomCategory('');
      setTagsInput('');
    }
    setShowPriceModal({ isOpen: true, taskId: id });
  };

  const handleComplete = () => {
    if (!showPriceModal.taskId) return;
    const price = parseFloat(priceInput) || 0;
    const finalCategory = categoryInput === 'أخرى' && customCategory.trim() ? customCategory : categoryInput;
    
    // Parse tags: split by space/comma and remove #
    const tags = tagsInput
      .split(/[\s,]+/)
      .map(tag => tag.replace(/^#/, '').trim())
      .filter(tag => tag.length > 0);
    
    setTasks(tasks.map(t => 
      t.id === showPriceModal.taskId 
        ? { 
            ...t, 
            status: 'completed', 
            price,
            currency: currencyInput,
            category: finalCategory,
            paymentMethod,
            tags,
            date: t.status === 'completed' ? t.date : new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit', numberingSystem: 'latn' }) 
          } 
        : t
    ));
    
    setShowPriceModal({ isOpen: false, taskId: null });
    setPriceInput('');
    setCategoryInput(CATEGORIES[0]);
    setCurrencyInput(CURRENCIES[0].code);
    setCustomCategory('');
    setTagsInput('');
  };

  const handleNumpad = (val: string) => {
    if (val === 'backspace') {
      setPriceInput(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!priceInput.includes('.')) {
        setPriceInput(prev => (prev === '' ? '0.' : prev + '.'));
      }
    } else {
      if (priceInput.length >= 12) return;
      setPriceInput(prev => (prev === '0' ? val : prev + val));
    }
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(priceInput) || 0;
    setPriceInput((current + amount).toString());
  };

  const exportToCSV = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    if (completedTasks.length === 0) return;

    const totalsByCurrency: Record<string, number> = {};
    completedTasks.forEach(t => {
      const cur = t.currency || 'ر.ي';
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + (t.price || 0);
    });

    const headers = ['المهمة', 'السعر', 'العملة', 'الفئة', 'التاريخ'];
    const rows = completedTasks.map(t => [
      `"${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      t.price || 0,
      `"${t.currency || 'ر.ي'}"`,
      `"${(t.category || 'أخرى').replace(/"/g, '""')}"`,
      `"${t.date || ''}"`
    ].join(','));

    const totalsSection = [
      '',
      '"--- المجموع الكلي حسب العملة ---"',
      'العملة,المبلغ',
      ...Object.entries(totalsByCurrency).map(([cur, amount]) => `"${cur}",${amount}`)
    ];

    const csvContent = [headers.join(','), ...rows, ...totalsSection].join('\r\n');
    const blob = new Blob(['\ufeff', csvContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `sarfiah_report_${dateStr}.csv`;
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  };

  const clearAllCompleted = () => {
    setShowClearAllModal(true);
  };

  const confirmClearAll = () => {
    setTasks(prev => prev.filter(t => t.status !== 'completed'));
    setShowClearAllModal(false);
  };

  const setBudget = () => {
    setMonthlyBudgets(prev => ({
      ...prev,
      [analyticsCurrency]: parseFloat(budgetInput) || 0
    }));
    setShowBudgetModal(false);
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => t.status === activeTab);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.text.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
    }

    // Category filter
    if (filterCategory !== 'الكل') {
      result = result.filter(t => t.category === filterCategory);
    }

    // Tag filter
    if (filterTag) {
      result = result.filter(t => t.tags?.includes(filterTag));
    }

    // Payment Method filter
    if (filterPaymentMethod !== 'all') {
      result = result.filter(t => t.paymentMethod === filterPaymentMethod);
    }

    // Date Range filter
    if (dateFrom) {
      result = result.filter(t => new Date(t.createdAt).getTime() >= new Date(dateFrom).getTime());
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.createdAt).getTime() <= end.getTime());
    }

    // Price range filter
    if (minPrice) {
      result = result.filter(t => (t.price || 0) >= parseFloat(minPrice));
    }
    if (maxPrice) {
      result = result.filter(t => (t.price || 0) <= parseFloat(maxPrice));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
      return 0;
    });

    return result;
  }, [tasks, activeTab, searchQuery, filterCategory, minPrice, maxPrice, sortBy]);
  
  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      const date = new Date(task.createdAt);
      let dateKey = '';

      if (groupBy === 'daily') {
        dateKey = task.date || date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit', numberingSystem: 'latn' });
      } else if (groupBy === 'weekly') {
        // Find start of week (Saturday in many Arab countries, but Sunday is fine too)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 6 ? -6 : 0); // This is a bit complex without a lib, let's simplify
        
        // Simple: "Week of [Date]"
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        dateKey = `أسبوع ${firstDay.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', numberingSystem: 'latn' })} - ${new Date(firstDay.setDate(firstDay.getDate() + 6)).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn' })}`;
      } else if (groupBy === 'monthly') {
        dateKey = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric', numberingSystem: 'latn' });
      } else if (groupBy === 'yearly') {
        dateKey = date.toLocaleDateString('ar-EG', { year: 'numeric', numberingSystem: 'latn' });
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [filteredTasks, groupBy]);

  // Calculate total expenses from completed tasks (grouped by currency)
  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    tasks.filter(t => t.status === 'completed').forEach(t => {
      const cur = t.currency || 'ر.ي';
      totals[cur] = (totals[cur] || 0) + (t.price || 0);
    });
    return totals;
  }, [tasks]);

  const chartColors = useMemo(() => {
    return isDarkMode 
      ? ['#96968c', '#8a8a60', '#5a5a40', '#262624'] 
      : ['#5a5a40', '#7c7c72', '#b8b8b0', '#eeeeea'];
  }, [isDarkMode]);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    tasks
      .filter(t => t.status === 'completed' && (t.currency || 'ر.ي') === analyticsCurrency)
      .forEach(t => {
        const cat = t.category || 'أخرى';
        groups[cat] = (groups[cat] || 0) + (t.price || 0);
      });
    return Object.entries(groups).map(([name, amount]) => ({ name, amount }));
  }, [tasks, analyticsCurrency]);

  const progressPercentage = useMemo(() => {
    const budget = monthlyBudgets[analyticsCurrency];
    if (!budget) return 0;
    const spent = chartData.reduce((acc, curr) => acc + curr.amount, 0);
    return (spent / budget) * 100;
  }, [chartData, monthlyBudgets, analyticsCurrency]);

  return (
    <div dir="rtl" className="min-h-screen bg-app-bg font-sans pb-28 overflow-x-hidden text-app-text">
      {/* Header */}
      <header className="bg-app-surface border-b border-app-border sticky top-0 z-30 px-4 sm:px-6 py-5 md:py-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-app-accent rounded-xl flex items-center justify-center text-white shadow-md overflow-hidden">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-app-text tracking-tight">Sarfiah</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-app-muted font-medium">تتبع مشترياتك ومصاريفك اليومية</p>
                {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md"
                  >
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    جاري المزامنة...
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-app-bg border border-app-border text-app-muted hover:text-app-accent transition-colors shadow-sm"
              aria-label="تغيير المظهر"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="text-left flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-app-muted text-[10px] mb-1 justify-end uppercase font-bold whitespace-nowrap">
                إجمالي المصروفات
              </div>
              {(Object.entries(totalsByCurrency) as [string, number][]).length > 0 ? (
                (Object.entries(totalsByCurrency) as [string, number][]).map(([currency, total]) => (
                  <div key={currency} className="text-lg md:text-xl font-bold text-app-accent flex items-center gap-1 justify-end whitespace-nowrap">
                    <span>{total.toLocaleString('en-US')}</span>
                    <span className="text-[10px] md:text-xs font-bold opacity-70">{currency}</span>
                  </div>
                ))
              ) : (
                <div className="text-lg md:text-xl font-bold text-app-accent flex items-center gap-1 justify-end whitespace-nowrap">
                  <span>0</span>
                  <span className="text-[10px] md:text-xs font-bold opacity-70">ر.ي</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* Add Task Input */}
        {activeTab === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="bg-app-bg dark:bg-app-surface p-2 rounded-2xl sm:p-2.5 sm:rounded-3xl shadow-sm border border-app-border flex gap-2 sm:gap-3 ring-4 sm:ring-8 ring-app-surface/50 dark:ring-app-accent/10">
              <input 
                type="text" 
                placeholder="أضف غرضاً جديداً للقائمة..."
                className="flex-1 px-3 sm:px-5 py-3 sm:py-4 bg-transparent outline-none text-app-text font-medium placeholder:text-app-muted/50 text-sm sm:text-base min-w-0"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
              <button 
                id="add-btn"
                onClick={addTask}
                className="bg-app-accent hover:opacity-90 text-white px-4 sm:px-6 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-app-accent/20 active:scale-95 shrink-0"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 sm:ml-2" />
                <span className="font-bold hidden sm:block">إضافة</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Analytics Section */}
        {activeTab === 'analytics' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Currency Filter for Analytics */}
            <div className="flex bg-app-surface dark:bg-app-border/10 p-1.5 rounded-3xl mb-8 shadow-sm">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setAnalyticsCurrency(c.code)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all ${
                    analyticsCurrency === c.code 
                      ? 'bg-app-accent text-white shadow-lg' 
                      : 'text-app-muted hover:bg-app-surface'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>

            {/* Budget Section */}
            <div className="bg-app-bg dark:bg-app-surface border border-app-border rounded-[32px] p-6 shadow-sm mb-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-app-text font-bold">
                  <Wallet className="w-5 h-5 text-app-accent" />
                  <span>الميزانية الشهرية ({analyticsCurrency})</span>
                </div>
                <button 
                  onClick={() => {
                    setBudgetInput(monthlyBudgets[analyticsCurrency]?.toString() || '');
                    setShowBudgetModal(true);
                  }}
                  className="text-[10px] font-black text-app-accent bg-app-accent/10 py-1.5 px-3 rounded-full hover:bg-app-accent hover:text-white transition-all"
                >
                  {monthlyBudgets[analyticsCurrency] ? 'تعديل الميزانية' : 'تحديد ميزانية'}
                </button>
              </div>

              {monthlyBudgets[analyticsCurrency] ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-app-muted uppercase mb-1">المصروف</p>
                      <p className="text-xl font-black text-app-text">
                        {(chartData.reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('en-US')}
                        <span className="text-xs mr-1 opacity-50">{analyticsCurrency}</span>
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-app-muted uppercase mb-1">المتبقي</p>
                      <p className={`text-xl font-black ${
                        monthlyBudgets[analyticsCurrency] - chartData.reduce((acc, curr) => acc + curr.amount, 0) < 0 
                          ? 'text-red-500 font-black' 
                          : 'text-emerald-500'
                      }`}>
                        {(monthlyBudgets[analyticsCurrency] - chartData.reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('en-US')}
                        <span className="text-xs mr-1 opacity-50">{analyticsCurrency}</span>
                      </p>
                    </div>
                  </div>

                  <div className="relative h-4 bg-app-border/30 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(100, progressPercentage)}%` 
                      }}
                      className={`h-full rounded-full ${
                        progressPercentage >= 75 
                          ? 'bg-red-500' 
                          : progressPercentage >= 55 
                            ? 'bg-orange-500' 
                            : 'bg-app-accent'
                      }`}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-bold text-app-muted">
                    <span>0%</span>
                    <span>{Math.round(progressPercentage)}% من الميزانية</span>
                    <span>100%</span>
                  </div>

                  {(chartData.reduce((acc, curr) => acc + curr.amount, 0) / monthlyBudgets[analyticsCurrency]) > 1 && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold text-center border border-red-500/20">
                      لقد تجاوزت الميزانية المحددة لهذا الشهر!
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center bg-app-surface dark:bg-app-border/5 rounded-2xl border border-dashed border-app-border">
                  <p className="text-xs text-app-muted font-bold">لم تقم بتحديد ميزانية لهذه العملة بعد</p>
                </div>
              )}
            </div>

            {chartData.length > 0 ? (
              <div className="bg-app-bg dark:bg-app-surface border border-app-border rounded-[32px] p-6 shadow-sm mb-10">
                <h3 className="text-lg font-bold text-app-text mb-8 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-app-accent" />
                  تحليل المصروفات ({analyticsCurrency})
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#262624' : '#eeeeea'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDarkMode ? '#96968c' : '#7c7c72', fontSize: 12, fontWeight: 'bold' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDarkMode ? '#96968c' : '#7c7c72', fontSize: 10 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: isDarkMode ? '#262624' : '#f8f9f8' }}
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#141413' : '#ffffff', 
                          borderRadius: '16px', 
                          border: isDarkMode ? '1px solid #262624' : '1px solid #eeeeea',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          color: isDarkMode ? '#e8e8e2' : '#2d2d2a',
                          fontFamily: 'inherit'
                        }}
                        itemStyle={{ color: isDarkMode ? '#e8e8e2' : '#2d2d2a' }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex justify-between items-center p-4 bg-app-surface dark:bg-app-border/10 rounded-2xl border border-app-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                        <span className="font-bold text-app-text text-sm">{item.name}</span>
                      </div>
                      <span className="font-black text-app-accent text-sm whitespace-nowrap">{item.amount.toLocaleString('en-US')} {analyticsCurrency}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-app-muted gap-6 text-center">
                 <BarChart3 className="w-16 h-16 opacity-10" />
                 <p className="font-bold text-lg">لا توجد بيانات لعملة {analyticsCurrency}</p>
                 <p className="text-sm opacity-70">أنجز بعض المهام وسجل أسعارها بهذه العملة لظهر الإحصائيات</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Search and Filters */}
        {activeTab !== 'analytics' && (
          <div className="mb-6 space-y-4">
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-1 bg-app-bg dark:bg-app-surface border border-app-border rounded-xl sm:rounded-2xl flex items-center px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm focus-within:ring-2 focus-within:ring-app-accent/20 transition-all">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted ml-2 sm:ml-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="ابحث..."
                  className="flex-1 bg-transparent outline-none text-xs sm:text-sm font-medium placeholder:text-app-muted/40 min-w-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-app-surface rounded-lg text-app-muted shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all border shrink-0 ${
                  showFilters 
                    ? 'bg-app-accent text-white border-app-accent shadow-lg shadow-app-accent/20' 
                    : 'bg-app-bg dark:bg-app-surface text-app-muted border-app-border hover:bg-app-surface'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>تصفية</span>
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-app-surface dark:bg-app-bg border border-app-border rounded-[24px] p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Sorting */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          ترتيب حسب
                        </label>
                        <select 
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                        >
                          <option value="newest">الأحدث أولاً</option>
                          <option value="oldest">الأقدم أولاً</option>
                          <option value="price-high">الأعلى سعراً</option>
                          <option value="price-low">الأقل سعراً</option>
                        </select>
                      </div>

                      {/* Category Filter */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <Tag className="w-3.5 h-3.5" />
                          الفئة
                        </label>
                        <select 
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                        >
                          <option value="الكل">كل الفئات</option>
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          {/* Dynamically add other unique categories found in tasks */}
                          {Array.from(new Set(tasks.map(t => t.category).filter(Boolean) as string[])).map(cat => (
                            !CATEGORIES.includes(cat) && <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tag Filter */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <Tag className="w-3.5 h-3.5" />
                          الوسم (#)
                        </label>
                        <select 
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                          value={filterTag}
                          onChange={(e) => setFilterTag(e.target.value)}
                        >
                          <option value="">كل الوسوم</option>
                          {Array.from(new Set(tasks.flatMap(t => t.tags || []))).map(tag => (
                            <option key={tag} value={tag}>#{tag}</option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method Filter */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <Wallet className="w-3.5 h-3.5" />
                          طريقة الدفع
                        </label>
                        <select 
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                          value={filterPaymentMethod}
                          onChange={(e) => setFilterPaymentMethod(e.target.value as any)}
                        >
                          <option value="all">الكل</option>
                          <option value="cash">كاش</option>
                          <option value="card">بطاقة</option>
                        </select>
                      </div>

                      {/* Price Range */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <Wallet className="w-3.5 h-3.5" />
                          نطاق السعر
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="من"
                            className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none placeholder:text-app-muted/40"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                          />
                          <input 
                            type="number" 
                            placeholder="إلى"
                            className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-app-accent outline-none placeholder:text-app-muted/40"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="space-y-3 md:col-span-3">
                        <label className="text-[10px] font-black text-app-muted uppercase flex items-center gap-2 px-1">
                          <Clock className="w-3.5 h-3.5" />
                          نطاق التاريخ
                        </label>
                        <div className="flex gap-4">
                          <div className="flex-1 relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-app-muted pointer-events-none">من</span>
                            <input 
                              type="date" 
                              className="w-full bg-app-bg border border-app-border rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="flex-1 relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-app-muted pointer-events-none">إلى</span>
                            <input 
                              type="date" 
                              className="w-full bg-app-bg border border-app-border rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-app-accent outline-none appearance-none"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-start">
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilterCategory('الكل');
                          setFilterTag('');
                          setFilterPaymentMethod('all');
                          setMinPrice('');
                          setMaxPrice('');
                          setSortBy('newest');
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className="text-[11px] font-bold text-red-500 hover:text-red-600 underline underline-offset-4"
                      >
                        إعادة تعيين كافة المرشحات
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Group By Selector */}
        {activeTab !== 'analytics' && activeTab !== 'pending' && (
          <div className="mb-10 flex justify-center mt-2">
            <div className="inline-flex bg-app-surface border border-app-border p-1.5 rounded-[24px] shadow-inner gap-1">
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setGroupBy(group);
                    setCollapsedGroups({});
                  }}
                  className={`px-5 py-2 rounded-[18px] text-[10px] font-black uppercase transition-all duration-300 ${
                    groupBy === group 
                      ? 'bg-app-bg text-app-accent shadow-sm scale-[1.02]' 
                      : 'text-app-muted hover:text-app-text'
                  }`}
                >
                  {GROUP_LABELS[group]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section Title */}
        {activeTab !== 'analytics' && (
          <>
            <div className="flex justify-between items-center mb-8 px-2">
              <h2 className="text-xl font-bold text-app-text flex items-center gap-3">
                {STATUS_LABELS[activeTab]}
                <span className="bg-app-border dark:bg-app-border/20 text-app-muted text-[11px] px-3 py-1 rounded-full font-bold">
                  {filteredTasks.length}
                </span>
              </h2>
              {activeTab === 'completed' && filteredTasks.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border rounded-xl text-xs font-bold text-app-accent hover:bg-app-accent hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير CSV</span>
                  </button>
                  <button 
                    onClick={clearAllCompleted}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 border border-red-500/10 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الكل</span>
                  </button>
                </div>
              )}
            </div>

            {/* List with grouping */}
            <div className="space-y-10">
              {(Object.entries(groupedTasks) as [string, Task[]][]).length > 0 ? (
                (Object.entries(groupedTasks) as [string, Task[]][]).map(([date, dateTasks]) => {
                  const isCollapsed = collapsedGroups[date];
                  const groupTotals = dateTasks.reduce((acc, t) => {
                    if (t.status === 'completed') {
                      const cur = t.currency || CURRENCIES[0].code;
                      acc[cur] = (acc[cur] || 0) + (t.price || 0);
                    }
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div key={date} className="space-y-4">
                      <div 
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [date]: !prev[date] }))}
                        className="flex items-center justify-between gap-4 px-2 cursor-pointer group/header py-2 hover:bg-app-surface rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1 rounded-lg bg-app-border dark:bg-app-border/20 text-app-muted transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black text-app-accent whitespace-nowrap bg-app-border dark:bg-app-border/20 px-4 py-1.5 rounded-full uppercase">
                            {date}
                          </span>
                        </div>
                        
                        <div className="flex-1 h-[1px] bg-app-border mx-2" />

                        {Object.keys(groupTotals).length > 0 && (
                          <div className="flex gap-2">
                            {Object.entries(groupTotals).map(([currency, total]) => (
                              <span key={currency} className="text-[10px] font-black text-app-accent bg-app-surface dark:bg-app-bg border border-app-border px-3 py-1 rounded-lg shadow-sm">
                                {total.toLocaleString('en-US')} {currency}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <AnimatePresence mode="popLayout">
                                {dateTasks.map((task) => (
                                  <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative group"
                                  >
                                    {/* Swipe Backgrounds */}
                                    <div className="absolute inset-0 rounded-[16px] overflow-hidden flex justify-between items-center px-6">
                                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-500/10 h-full px-4 rounded-r-[16px]">
                                        <CheckCircle2 className="w-5 h-5" />
                                        إتمام
                                      </div>
                                      <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-500/10 h-full px-4 rounded-l-[16px]">
                                        حذف
                                        <Trash2 className="w-5 h-5" />
                                      </div>
                                    </div>

                                    <motion.div
                                      drag="x"
                                      dragConstraints={{ left: 0, right: 0 }}
                                      dragElastic={0.4}
                                      onDragEnd={(_, info) => {
                                        if (info.offset.x < -100) {
                                          if (task.status !== 'completed') openCompleteModal(task.id);
                                        } else if (info.offset.x > 100) {
                                          deleteTask(task.id);
                                        }
                                      }}
                                      className="bg-app-surface dark:bg-app-surface border border-app-border rounded-[16px] p-2.5 shadow-sm hover:shadow-md transition-all relative z-10 cursor-grab active:cursor-grabbing"
                                    >
                                      {/* Task Card Content */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex-1">
                                          <h3 className="font-bold text-app-text text-[13px] mb-0.5">{task.text}</h3>
                                          {task.status === 'completed' && (
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                              <span className="text-app-accent font-bold text-[9px] bg-app-surface px-2 py-0.5 rounded-lg border border-app-border flex items-center gap-1.5 shadow-sm">
                                                 {task.paymentMethod === 'card' ? (
                                                   <CreditCard className="w-2.5 h-2.5 opacity-60" />
                                                 ) : (
                                                   <Banknote className="w-2.5 h-2.5 opacity-60" />
                                                 )}
                                                 {task.price?.toLocaleString('en-US')} {task.currency || 'ر.ي'}
                                              </span>
                                              {task.category && (
                                                <span className="text-app-muted font-bold text-[7px] bg-app-border dark:bg-app-border/20 px-1.5 py-0.5 rounded-full uppercase">
                                                  {task.category}
                                                </span>
                                              )}
                                              {task.tags && task.tags.length > 0 && task.tags.map(tag => (
                                                <span key={tag} className="text-app-accent font-bold text-[7px] bg-app-accent/5 px-1.5 py-0.5 rounded-full">
                                                  #{tag}
                                                </span>
                                              ))}
                                              <button 
                                                onClick={() => openCompleteModal(task.id)}
                                                className="mr-auto text-app-muted hover:text-app-accent transition-colors"
                                                title="تعديل السعر"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                              <button 
                                                onClick={() => duplicateTask(task)}
                                                className="mr-2 text-app-muted hover:text-app-accent transition-colors"
                                                title="إعادة إضافة للقائمة الرئيسية"
                                              >
                                                <Repeat className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                          {task.status === 'pending' && (
                                            <span className="text-app-muted text-[9px] mt-1 block font-bold flex items-center gap-2">
                                              <div className="w-1 h-1 rounded-full bg-app-border" />
                                              {new Date(task.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit', numberingSystem: 'latn' })}
                                            </span>
                                          )}
                                          {task.status === 'postponed' && (
                                            <span className="text-app-muted text-[9px] mt-1 block font-bold flex items-center gap-2">
                                              <div className="w-1 h-1 rounded-full bg-app-border" />
                                              تأجيل: {task.date}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 justify-end sm:justify-start">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                            className="p-2 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                                            title="حذف"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                          
                                          {task.status === 'pending' && (
                                            <>
                                              <button 
                                                onClick={() => postponeTask(task.id)}
                                                className="py-2 px-3 text-app-text bg-app-surface rounded-lg hover:bg-app-text hover:text-app-bg transition-all border border-app-border flex items-center gap-2"
                                              >
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-bold">تأجيل</span>
                                              </button>
                                              <button 
                                                onClick={() => openCompleteModal(task.id)}
                                                className="py-2 px-4 text-white bg-app-accent rounded-lg hover:opacity-90 transition-all border border-app-accent/10 flex items-center gap-2 group/btn shadow-md shadow-app-accent/10"
                                              >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-bold">إتمام</span>
                                              </button>
                                            </>
                                          )}

                                          {task.status === 'postponed' && (
                                            <>
                                              <button 
                                                onClick={() => restoreTask(task.id)}
                                                className="py-2 px-3 text-app-accent bg-app-surface rounded-lg hover:bg-app-accent hover:text-white transition-all border border-app-border flex items-center gap-2"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-bold">إعادة للرئيسية</span>
                                              </button>
                                              <button 
                                                onClick={() => openCompleteModal(task.id)}
                                                className="py-2 px-4 text-white bg-app-accent rounded-lg hover:opacity-90 transition-all border border-app-accent/10 flex items-center gap-2 group/btn shadow-md shadow-app-accent/10"
                                              >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-bold">إتمام</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-app-muted gap-6">
                  <div className="w-24 h-24 bg-app-surface dark:bg-app-border/10 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-app-muted/40" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-app-text/80">لا توجد مهام حالياً</p>
                    <p className="text-sm mt-2 opacity-70">ابدأ بإضافة الأغراض والبدء بالتتبع اليومي</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Navigation Tabs */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 px-6">
        <nav className="bg-app-surface/90 dark:bg-app-surface/80 backdrop-blur-2xl border border-app-border p-2 rounded-[2.5rem] shadow-2xl flex gap-1 items-center max-w-full overflow-x-auto scrollbar-hide">
          <TabButton 
            id="tab-pending"
            active={activeTab === 'pending'} 
            onClick={() => setActiveTab('pending')}
            icon={<ShoppingBag className="w-5 h-5" />}
            label="الرئيسية"
          />
          <TabButton 
            id="tab-completed"
            active={activeTab === 'completed'} 
            onClick={() => setActiveTab('completed')}
            icon={<History className="w-5 h-5" />}
            label="المنجزات"
          />
          <TabButton 
            id="tab-postponed"
            active={activeTab === 'postponed'} 
            onClick={() => setActiveTab('postponed')}
            icon={<Clock className="w-5 h-5" />}
            label="المؤجلات"
          />
          <TabButton 
            id="tab-analytics"
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<BarChart3 className="w-5 h-5" />}
            label="التقارير"
          />
        </nav>
      </div>

      {/* Price Modal */}
      <AnimatePresence>
        {showPriceModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-app-accent/10 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowPriceModal({ isOpen: false, taskId: null })}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-app-bg dark:bg-app-surface w-full max-w-sm rounded-[40px] p-6 shadow-2xl relative z-10 border border-app-border max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="w-10 h-10 bg-app-surface dark:bg-app-border/10 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-app-accent" />
                  </div>
                  <h3 className="text-lg font-black text-app-text">
                    {tasks.find(t => t.id === showPriceModal.taskId)?.status === 'completed' ? 'تعديل السعر' : 'تسجيل المصروف'}
                  </h3>
                  <button 
                    onClick={() => setShowPriceModal({ isOpen: false, taskId: null })}
                    className="p-2 hover:bg-app-surface rounded-full text-app-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="w-full space-y-5">
                  {/* Currency Selector */}
                  <div className="flex bg-app-surface dark:bg-app-border/10 p-1 rounded-2xl gap-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCurrencyInput(c.code);
                          setPaymentMethod(c.code === '⃁' ? 'card' : 'cash');
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                          currencyInput === c.code 
                            ? 'bg-app-bg text-app-accent shadow-sm' 
                            : 'text-app-muted hover:text-app-text'
                        }`}
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>

                  {/* Price Display */}
                  <div className="bg-app-bg dark:bg-app-border/10 border-2 border-app-border p-5 rounded-[28px] relative focus-within:border-app-accent transition-all group">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-app-muted">
                      {currencyInput}
                    </div>
                    <div className="w-full text-center text-4xl font-black text-app-accent h-10 flex items-center justify-center overflow-hidden">
                      {priceInput || <span className="text-app-border">0</span>}
                      <motion.div 
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-[2px] h-8 bg-app-accent ml-1"
                      />
                    </div>
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 100, 500, 1000, 5000, 10000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleQuickAdd(amount)}
                        className="py-2.5 bg-app-surface dark:bg-app-border/10 hover:bg-app-accent hover:text-white text-app-accent rounded-xl text-[10px] font-black transition-all active:scale-95 border border-app-border"
                      >
                        +{amount.toLocaleString('en-US')}
                      </button>
                    ))}
                  </div>

                  {/* Custom Numpad */}
                  <div className="grid grid-cols-3 gap-2 bg-app-surface dark:bg-app-border border border-app-border">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpad(key)}
                        className={`h-14 flex items-center justify-center rounded-2xl text-xl font-black transition-all active:scale-90 shadow-sm ${
                          key === 'backspace' 
                            ? 'text-red-400 bg-app-bg dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-900/20' 
                            : 'text-app-text bg-app-bg dark:bg-app-border/20 hover:bg-app-surface'
                        }`}
                      >
                        {key === 'backspace' ? <Delete className="w-6 h-6" /> : key}
                      </button>
                    ))}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black text-app-muted uppercase px-2">
                       <Wallet className="w-3 h-3" />
                       طريقة الدفع
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <button
                         onClick={() => setPaymentMethod('cash')}
                         className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black transition-all border ${
                           paymentMethod === 'cash' 
                             ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' 
                             : 'bg-app-bg dark:bg-app-border/20 text-app-muted border-app-border'
                         }`}
                       >
                         <Banknote className="w-4 h-4" />
                         كاش
                       </button>
                       <button
                         onClick={() => setPaymentMethod('card')}
                         className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black transition-all border ${
                           paymentMethod === 'card' 
                             ? 'bg-blue-500 text-white border-blue-500 shadow-md' 
                             : 'bg-app-bg dark:bg-app-border/20 text-app-muted border-app-border'
                         }`}
                       >
                         <CreditCard className="w-4 h-4" />
                         بطاقة
                       </button>
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black text-app-muted uppercase px-2">
                       <Tag className="w-3 h-3" />
                       الفئة
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryInput(cat)}
                          className={`py-3 px-2 rounded-2xl text-[10px] font-black transition-all border ${
                            categoryInput === cat 
                              ? 'bg-app-accent text-white border-app-accent shadow-md' 
                              : 'bg-app-bg dark:bg-app-border/20 text-app-muted border-app-border hover:bg-app-surface'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {categoryInput === 'أخرى' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-app-surface dark:bg-app-bg p-1 rounded-2xl border border-app-border"
                      >
                        <input 
                          type="text"
                          placeholder="اسم الفئة الجديدة..."
                          className="w-full bg-transparent px-4 py-3 outline-none text-center font-bold text-app-accent placeholder:text-app-muted/40 text-xs"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Tags Input */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black text-app-muted uppercase px-2">
                       <Tag className="w-3 h-3" />
                       الوسوم (اختياري)
                    </div>
                    <div className="bg-app-bg dark:bg-app-border/10 border border-app-border p-3 rounded-2xl focus-within:border-app-accent transition-all">
                      <input 
                        type="text"
                        placeholder="مثال: سفر هدايا عمل..."
                        className="w-full bg-transparent outline-none text-xs font-bold text-app-accent placeholder:text-app-muted/30"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                      />
                    </div>
                    <p className="text-[8px] text-app-muted px-2">افصل بين الوسوم بمسافات</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setShowPriceModal({ isOpen: false, taskId: null })}
                    className="bg-app-surface dark:bg-app-border/10 text-app-muted font-black py-4 rounded-2xl hover:bg-app-border/20 transition-colors text-sm"
                  >
                    إلغاء
                  </button>
                  <button 
                    id="save-price-btn"
                    onClick={handleComplete}
                    className="bg-app-accent hover:opacity-95 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-app-accent/20 active:scale-95 text-sm"
                  >
                    {tasks.find(t => t.id === showPriceModal.taskId)?.status === 'completed' ? 'تحديث' : 'تأكيد الحفظ'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-app-accent/10 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowDeleteModal({ isOpen: false, taskId: null })}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-app-bg dark:bg-app-surface w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative z-10 border border-app-border"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-4">
                   <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-app-text mb-2">حذف المهمة؟</h3>
                <p className="text-app-muted text-sm mb-6 leading-relaxed">هل أنت متأكد من حذف هذه المهمة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 text-sm"
                  >
                    نعم، حذف
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal({ isOpen: false, taskId: null })}
                    className="flex-1 bg-app-surface dark:bg-app-border/10 text-app-muted font-bold py-3.5 rounded-xl hover:bg-app-border/20 transition-colors text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-app-accent/10 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowClearAllModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-app-bg dark:bg-app-surface w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative z-10 border border-app-border"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-4">
                   <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-app-text mb-2">حذف جميع المنجزات؟</h3>
                <p className="text-app-muted text-sm mb-6 leading-relaxed">سيتم حذف كافة المهام المنجزة بشكل دائم. هل أنت متأكد؟</p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={confirmClearAll}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 text-sm"
                  >
                    نعم، حذف الكل
                  </button>
                  <button 
                    onClick={() => setShowClearAllModal(false)}
                    className="flex-1 bg-app-surface dark:bg-app-border/10 text-app-muted font-bold py-3.5 rounded-xl hover:bg-app-border/20 transition-colors text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-app-accent/10 dark:bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowBudgetModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-app-bg dark:bg-app-surface w-full max-w-sm rounded-[40px] p-6 shadow-2xl relative z-10 border border-app-border"
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-6">
                  <div className="w-10 h-10 bg-app-accent/10 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-app-accent" />
                  </div>
                  <h3 className="text-xl font-black text-app-text">تحديد ميزانية الشهر</h3>
                  <button onClick={() => setShowBudgetModal(false)} className="p-2 hover:bg-app-surface rounded-full text-app-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full space-y-6">
                  <div className="bg-app-bg dark:bg-app-border/10 border-2 border-app-border p-6 rounded-[28px] text-center focus-within:border-app-accent transition-all relative">
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-app-muted text-sm">{analyticsCurrency}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="w-full bg-transparent text-4xl font-black text-app-accent outline-none text-center placeholder:text-app-border"
                      autoFocus
                    />
                  </div>
                  
                  <div className="bg-app-accent/5 p-4 rounded-2xl border border-app-accent/10">
                    <p className="text-[10px] text-app-muted font-bold leading-relaxed">
                      سيتم استخدام هذه القيمة لمراقبة مصروفاتك بالـ {analyticsCurrency} خلال التقارير.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                      onClick={() => setShowBudgetModal(false)}
                      className="bg-app-surface dark:bg-app-border/10 text-app-muted font-black py-4 rounded-2xl hover:bg-app-border/20 transition-colors text-sm"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={setBudget}
                      className="bg-app-accent hover:opacity-95 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-app-accent/20 active:scale-95 text-sm"
                    >
                      تأكيد
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, icon, label, onClick, id }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; id: string }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      className={`relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl transition-all group shrink-0 ${
        active ? 'bg-app-accent text-white shadow-xl shadow-app-accent/30' : 'text-app-muted hover:bg-app-surface'
      }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`text-sm font-bold transition-all ${active ? 'block' : 'hidden md:block'}`}>
        {label}
      </span>
    </button>
  );
}
