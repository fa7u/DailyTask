import { useState, useEffect, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  History, 
  ChevronLeft,
  X,
  Wallet,
  Tag,
  BarChart3,
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

interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  price?: number;
  currency?: string;
  category?: string;
  date?: string;
  createdAt: string;
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

const COLORS = ['#5a5a40', '#8a8a7c', '#c4c4bc', '#ecece4'];

const CURRENCIES = [
  { code: 'ر.ي', label: 'ريال يمني' },
  { code: 'ر.س', label: 'ريال سعودي' },
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
  const [priceInput, setPriceInput] = useState('');
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0]);
  const [currencyInput, setCurrencyInput] = useState(CURRENCIES[0].code);
  const [analyticsCurrency, setAnalyticsCurrency] = useState(CURRENCIES[0].code);
  const [customCategory, setCustomCategory] = useState('');

  // 1. Save to Local Storage and Sync to Server
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

  // --- Handlers ---
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

  const postponeTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, status: 'postponed', date: new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' }) } : t
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
    setShowPriceModal({ isOpen: true, taskId: id });
  };

  const handleComplete = () => {
    if (!showPriceModal.taskId) return;
    const price = parseFloat(priceInput) || 0;
    const finalCategory = categoryInput === 'أخرى' && customCategory.trim() ? customCategory : categoryInput;
    
    setTasks(tasks.map(t => 
      t.id === showPriceModal.taskId 
        ? { 
            ...t, 
            status: 'completed', 
            price,
            currency: currencyInput,
            category: finalCategory,
            date: new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' }) 
          } 
        : t
    ));
    
    setShowPriceModal({ isOpen: false, taskId: null });
    setPriceInput('');
    setCategoryInput(CATEGORIES[0]);
    setCurrencyInput(CURRENCIES[0].code);
    setCustomCategory('');
  };

  const filteredTasks = tasks.filter(t => t.status === activeTab);
  
  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const list = tasks.filter(t => t.status === activeTab);
    list.forEach(task => {
      const dateKey = task.date || new Date(task.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [tasks, activeTab]);

  // Calculate total expenses from completed tasks (grouped by currency)
  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    tasks.filter(t => t.status === 'completed').forEach(t => {
      const cur = t.currency || 'ر.ي';
      totals[cur] = (totals[cur] || 0) + (t.price || 0);
    });
    return totals;
  }, [tasks]);


  // Group data for the chart based on selected analytics currency
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

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans pb-28 overflow-x-hidden text-[#333330]">
      {/* Header */}
      <header className="bg-[#f5f5f0] border-b border-[#e5e5df] sticky top-0 z-30 px-6 py-5 md:py-8">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#5a5a40] p-2.5 rounded-xl text-white shadow-sm">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2d2d2a] tracking-tight">مصروفاتي</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#8a8a7c] font-medium">تتبع مشترياتك ومصاريفك اليومية</p>
                {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md"
                  >
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    جاري المزامنة...
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-left flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[#8a8a7c] text-[10px] mb-1 justify-end uppercase tracking-widest font-bold whitespace-nowrap">
              إجمالي المصروفات
            </div>
            {(Object.entries(totalsByCurrency) as [string, number][]).length > 0 ? (
              (Object.entries(totalsByCurrency) as [string, number][]).map(([currency, total]) => (
                <div key={currency} className="text-lg md:text-xl font-bold text-[#5a5a40] flex items-center gap-1 justify-end whitespace-nowrap">
                  <span>{total.toLocaleString('ar-EG')}</span>
                  <span className="text-[10px] md:text-xs font-bold opacity-70">{currency}</span>
                </div>
              ))
            ) : (
              <div className="text-lg md:text-xl font-bold text-[#5a5a40] flex items-center gap-1 justify-end whitespace-nowrap">
                <span>٠</span>
                <span className="text-[10px] md:text-xs font-bold opacity-70">ر.ي</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-8">
        {/* Add Task Input */}
        {activeTab === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="bg-white p-2.5 rounded-3xl shadow-sm border border-[#f0f0e8] flex gap-3 ring-8 ring-[#f5f5f0]/50">
              <input 
                type="text" 
                placeholder="أضف غرضاً جديداً للقائمة..."
                className="flex-1 px-5 py-4 bg-transparent outline-none text-[#333330] font-medium placeholder:text-[#8a8a7c]/50 text-base"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
              <button 
                id="add-btn"
                onClick={addTask}
                className="bg-[#5a5a40] hover:opacity-90 text-white px-6 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-[#5a5a40]/20 active:scale-95"
              >
                <Plus className="w-6 h-6 ml-2" />
                <span className="font-bold">إضافة</span>
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
            <div className="flex bg-white border border-[#f0f0e8] p-1.5 rounded-3xl mb-8 shadow-sm">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setAnalyticsCurrency(c.code)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all ${
                    analyticsCurrency === c.code 
                      ? 'bg-[#5a5a40] text-white shadow-lg' 
                      : 'text-[#8a8a7c] hover:bg-[#f5f5f0]'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>

            {chartData.length > 0 ? (
              <div className="bg-white border border-[#f0f0e8] rounded-[32px] p-6 shadow-sm mb-10">
                <h3 className="text-lg font-bold text-[#2d2d2a] mb-8 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#5a5a40]" />
                  تحليل المصروفات ({analyticsCurrency})
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0e8" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8a8a7c', fontSize: 12, fontWeight: 'bold' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8a8a7c', fontSize: 10 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f5f5f0' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '16px', 
                          border: '1px solid #f0f0e8',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          fontFamily: 'Cairo, sans-serif'
                        }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-10 space-y-4">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex justify-between items-center p-4 bg-[#f8f8f5] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-bold text-[#6b6b60]">{item.name}</span>
                      </div>
                      <span className="font-black text-[#5a5a40]">{item.amount.toLocaleString('ar-EG')} {analyticsCurrency}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-[#8a8a7c] gap-6 text-center">
                 <BarChart3 className="w-16 h-16 opacity-10" />
                 <p className="font-bold text-lg">لا توجد بيانات لعملة {analyticsCurrency}</p>
                 <p className="text-sm opacity-70">أنجز بعض المهام وسجل أسعارها بهذه العملة لظهر الإحصائيات</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Section Title */}
        {activeTab !== 'analytics' && (
          <>
            <div className="flex justify-between items-center mb-8 px-2">
              <h2 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-3">
                {STATUS_LABELS[activeTab]}
                <span className="bg-[#ecece4] text-[#8a8a7c] text-[11px] px-3 py-1 rounded-full font-bold">
                  {filteredTasks.length}
                </span>
              </h2>
            </div>

            {/* List with grouping */}
            <div className="space-y-12">
              {(Object.entries(groupedTasks) as [string, Task[]][]).length > 0 ? (
                (Object.entries(groupedTasks) as [string, Task[]][]).map(([date, dateTasks]) => (
                  <div key={date} className="space-y-6">
                    {(activeTab === 'completed' || activeTab === 'postponed') && (
                      <div className="flex items-center gap-4 px-2">
                        <span className="text-xs font-black text-[#8a8a7c] whitespace-nowrap bg-[#ecece4] px-4 py-1.5 rounded-full uppercase tracking-widest">{date}</span>
                        <div className="h-[1px] flex-1 bg-[#e5e5df]" />
                      </div>
                    )}
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {dateTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border border-[#f0f0e8] rounded-[16px] p-2.5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="font-bold text-[#2d2d2a] text-[13px] mb-0.5">{task.text}</h3>
                                {task.status === 'completed' && (
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="text-[#5a5a40] font-bold text-[9px] bg-[#f5f5f0] px-2 py-0.5 rounded-lg border border-[#e5e5df]">
                                       {task.price?.toLocaleString('ar-EG')} {task.currency || 'ر.ي'}
                                    </span>
                                    {task.category && (
                                      <span className="text-[#8a8a7c] font-bold text-[7px] bg-[#ecece4] px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                        {task.category}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {task.status === 'pending' && (
                                  <span className="text-[#8a8a7c] text-[9px] mt-1 block font-bold flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-[#e5e5df]" />
                                    {new Date(task.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' })}
                                  </span>
                                )}
                                {task.status === 'postponed' && (
                                  <span className="text-[#8a8a7c] text-[9px] mt-1 block font-bold flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-[#e5e5df]" />
                                    تأجيل: {task.date}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 justify-end sm:justify-start">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                  className="p-2 text-[#c94b4b] bg-[#fff5f5] rounded-lg hover:bg-[#c94b4b] hover:text-white transition-all border border-[#c94b4b]/10"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                
                                {task.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => postponeTask(task.id)}
                                      className="py-2 px-3 text-[#6b6b60] bg-[#f5f5f0] rounded-lg hover:bg-[#6b6b60] hover:text-white transition-all border border-[#e5e5df] flex items-center gap-2"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-bold">تأجيل</span>
                                    </button>
                                    <button 
                                      onClick={() => openCompleteModal(task.id)}
                                      className="py-2 px-4 text-white bg-[#5a5a40] rounded-lg hover:opacity-90 transition-all border border-[#5a5a40]/10 flex items-center gap-2 group/btn shadow-md shadow-[#5a5a40]/10"
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
                                      className="py-2 px-3 text-[#5a5a40] bg-[#f5f5f0] rounded-lg hover:bg-[#5a5a40] hover:text-white transition-all border border-[#e5e5df] flex items-center gap-2"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-bold">إعادة للرئيسية</span>
                                    </button>
                                    <button 
                                      onClick={() => openCompleteModal(task.id)}
                                      className="py-2 px-4 text-white bg-[#5a5a40] rounded-lg hover:opacity-90 transition-all border border-[#5a5a40]/10 flex items-center gap-2 group/btn shadow-md shadow-[#5a5a40]/10"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-bold">إتمام</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-[#8a8a7c] gap-6">
                  <div className="w-24 h-24 bg-[#f5f5f0] rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-[#8a8a7c]/40" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-[#6b6b60]">لا توجد مهام حالياً</p>
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
        <nav className="bg-[#f5f5f0]/90 backdrop-blur-2xl border border-[#e5e5df] p-2 rounded-[2.5rem] shadow-2xl flex gap-1 items-center max-w-full overflow-x-auto scrollbar-hide">
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={() => setShowPriceModal({ isOpen: false, taskId: null })}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative z-10 border border-[#f0f0e8]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#f5f5f0] rounded-full flex items-center justify-center mb-6">
                   <Wallet className="w-8 h-8 text-[#5a5a40]" />
                </div>
                <h3 className="text-2xl font-bold text-[#2d2d2a] mb-2">كم كان السعر؟</h3>
                <p className="text-[#8a8a7c] text-sm mb-8 leading-relaxed max-w-[240px]">أدخل تفاصيل التكلفة والفئة لحفظ هذا السجل</p>
                
                <div className="w-full space-y-6 mb-8">
                  {/* Currency Selector */}
                  <div className="flex bg-[#f5f5f0] p-1 rounded-2xl gap-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCurrencyInput(c.code)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          currencyInput === c.code 
                            ? 'bg-white text-[#5a5a40] shadow-sm' 
                            : 'text-[#8a8a7c] hover:text-[#6b6b60]'
                        }`}
                      >
                        {c.code} ({c.label})
                      </button>
                    ))}
                  </div>

                  {/* Price Input */}
                  <div className="bg-[#f8f8f5] p-6 rounded-3xl relative focus-within:ring-2 focus-within:ring-[#5a5a40] transition-all">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-bold text-[#8a8a7c]">
                      {currencyInput}
                    </div>
                    <input 
                      autoFocus
                      type="number" 
                      placeholder="0.00"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full text-center text-4xl font-black text-[#5a5a40] placeholder:text-[#e5e5df] outline-none bg-transparent"
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a7c] uppercase tracking-wider px-2">
                       اختيار الفئة
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryInput(cat)}
                          className={`py-3 px-2 rounded-2xl text-[11px] font-bold transition-all border ${
                            categoryInput === cat 
                              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md' 
                              : 'bg-white text-[#6b6b60] border-[#f0f0e8] hover:bg-[#f5f5f0]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {categoryInput === 'أخرى' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#f8f8f5] p-1 rounded-3xl border border-[#f0f0e8]"
                      >
                        <input 
                          type="text"
                          placeholder="اكتب اسم الفئة (اختياري)..."
                          className="w-full bg-transparent px-4 py-3 outline-none text-center font-bold text-[#5a5a40] placeholder:text-[#8a8a7c]/40 text-sm"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button 
                    id="save-price-btn"
                    onClick={handleComplete}
                    className="flex-1 bg-[#5a5a40] hover:opacity-90 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-[#5a5a40]/20 active:scale-95 text-lg"
                  >
                    حفظ وإكمال
                  </button>
                  <button 
                    id="cancel-modal"
                    onClick={() => setShowPriceModal({ isOpen: false, taskId: null })}
                    className="flex-1 bg-[#ecece4] text-[#6b6b60] font-bold py-5 rounded-2xl hover:bg-[#e5e5df] transition-colors text-lg"
                  >
                    إلغاء
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={() => setShowDeleteModal({ isOpen: false, taskId: null })}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-white w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative z-10 border border-[#f0f0e8]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                   <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-[#2d2d2a] mb-2">حذف المهمة؟</h3>
                <p className="text-[#8a8a7c] text-sm mb-6 leading-relaxed">هل أنت متأكد من حذف هذه المهمة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 text-sm"
                  >
                    نعم، حذف
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal({ isOpen: false, taskId: null })}
                    className="flex-1 bg-[#f5f5f0] text-[#6b6b60] font-bold py-3.5 rounded-xl hover:bg-[#ecece4] transition-colors text-sm"
                  >
                    إلغاء
                  </button>
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
      className={`relative flex items-center gap-3 px-6 py-4 rounded-3xl transition-all group ${
        active ? 'bg-[#5a5a40] text-white shadow-xl shadow-[#5a5a40]/30' : 'text-[#8a8a7c] hover:bg-[#ecece4]'
      }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`text-sm font-bold transition-all ${active ? 'block' : 'hidden'}`}>
        {label}
      </span>
    </button>
  );
}
