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
  BarChart3
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
type TaskStatus = 'pending' | 'completed' | 'postponed';

interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  price?: number;
  category?: string;
  date?: string;
  createdAt: string;
}

// --- Constants ---
const STATUS_LABELS = {
  pending: 'المهام المطلوبة',
  completed: 'المهام المنجزة',
  postponed: 'المهام المؤجلة'
};

const CATEGORIES = [
  'المنزل',
  'طعام',
  'شخصي',
  'أخرى'
];

const COLORS = ['#5a5a40', '#8a8a7c', '#c4c4bc', '#ecece4'];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskStatus>('pending');
  const [newTaskText, setNewTaskText] = useState('');
  const [showPriceModal, setShowPriceModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [priceInput, setPriceInput] = useState('');
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0]);

  // 1. Initial load from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('my_expenses_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Save to localStorage ONLY AFTER initialization
  useEffect(() => {
    if (isInitialized) {
      try {
        window.localStorage.setItem('my_expenses_tasks', JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save to storage:', e);
      }
    }
  }, [tasks, isInitialized]);

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
    setTasks(tasks.filter(t => t.id !== id));
  };

  const postponeTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, status: 'postponed' } : t
    ));
  };

  const openCompleteModal = (id: string) => {
    setShowPriceModal({ isOpen: true, taskId: id });
  };

  const handleComplete = () => {
    if (!showPriceModal.taskId) return;
    const price = parseFloat(priceInput) || 0;
    
    setTasks(tasks.map(t => 
      t.id === showPriceModal.taskId 
        ? { 
            ...t, 
            status: 'completed', 
            price,
            category: categoryInput,
            date: new Date().toLocaleDateString('ar-EG', { dateStyle: 'medium' }) 
          } 
        : t
    ));
    
    setShowPriceModal({ isOpen: false, taskId: null });
    setPriceInput('');
    setCategoryInput(CATEGORIES[0]);
  };

  const filteredTasks = tasks.filter(t => t.status === activeTab);
  
  // Calculate total expenses from completed tasks
  const totalExpenses = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.price || 0), 0);

  // Group data for the chart
  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    tasks.filter(t => t.status === 'completed').forEach(t => {
      const cat = t.category || 'أخرى';
      groups[cat] = (groups[cat] || 0) + (t.price || 0);
    });
    return Object.entries(groups).map(([name, amount]) => ({ name, amount }));
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans pb-24 overflow-x-hidden text-[#333330]">
      {/* Header */}
      <header className="bg-[#f5f5f0] border-b border-[#e5e5df] sticky top-0 z-30 px-6 py-5 md:py-8">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#5a5a40] p-2.5 rounded-xl text-white shadow-sm">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2d2d2a] tracking-tight">مصروفاتي</h1>
              <p className="text-xs text-[#8a8a7c] font-medium mt-0.5">تتبع مشترياتك ومصاريفك اليومية</p>
            </div>
          </div>
          
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-[#8a8a7c] text-[10px] mb-1 justify-end uppercase tracking-widest font-bold">
              إجمالي المصروفات
            </div>
            <div className="text-xl font-bold text-[#5a5a40] flex items-center gap-1 justify-end">
              <span>{totalExpenses.toLocaleString('ar-EG')}</span>
              <span className="text-xs font-bold opacity-70">ج.م</span>
            </div>
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

        {/* Analytics Section (Only for completed tab) */}
        {activeTab === 'completed' && chartData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 bg-white border border-[#f0f0e8] rounded-[32px] p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-[#2d2d2a] mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#5a5a40]" />
              تحليل المصروفات حسب الفئة
            </h3>
            <div className="h-[250px] w-full">
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
          </motion.div>
        )}

        {/* Section Title */}
        <div className="flex justify-between items-center mb-8 px-2">
          <h2 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-3">
            {STATUS_LABELS[activeTab]}
            <span className="bg-[#ecece4] text-[#8a8a7c] text-[11px] px-3 py-1 rounded-full font-bold">
              {filteredTasks.length}
            </span>
          </h2>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-[#f0f0e8] rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#2d2d2a] text-lg mb-1.5">{task.text}</h3>
                      {task.status === 'completed' && (
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <span className="text-[#5a5a40] font-bold text-sm bg-[#f5f5f0] px-4 py-1.5 rounded-xl border border-[#e5e5df]">
                             {task.price?.toLocaleString('ar-EG')} ج.م
                          </span>
                          {task.category && (
                            <span className="text-[#8a8a7c] font-bold text-[10px] bg-[#ecece4] px-3 py-1 rounded-full uppercase tracking-tighter">
                              {task.category}
                            </span>
                          )}
                          <span className="text-[#8a8a7c] text-[11px] flex items-center gap-2 font-bold">
                            <Clock className="w-4 h-4" />
                            {task.date}
                          </span>
                        </div>
                      )}
                      {(task.status === 'pending' || task.status === 'postponed') && (
                        <span className="text-[#8a8a7c] text-[11px] mt-2 block font-bold flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e5e5df]" />
                          تاريخ الإضافة: {new Date(task.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 justify-end sm:justify-start">
                      <button 
                        id={`delete-${task.id}`}
                        onClick={() => deleteTask(task.id)}
                        className="p-4 text-[#c94b4b] bg-[#fff5f5] rounded-2xl hover:bg-[#c94b4b] hover:text-white transition-all border border-[#c94b4b]/10"
                        title="حذف"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                      
                      {task.status !== 'postponed' && task.status !== 'completed' && (
                        <button 
                          id={`postpone-${task.id}`}
                          onClick={() => postponeTask(task.id)}
                          className="p-4 text-[#6b6b60] bg-[#f5f5f0] rounded-2xl hover:bg-[#6b6b60] hover:text-white transition-all border border-[#e5e5df]"
                          title="تأجيل"
                        >
                          <Clock className="w-4.5 h-4.5" />
                        </button>
                      )}

                      {task.status !== 'completed' && (
                        <button 
                          id={`complete-${task.id}`}
                          onClick={() => openCompleteModal(task.id)}
                          className="p-4 pr-6 pl-6 text-white bg-[#5a5a40] rounded-2xl hover:opacity-90 transition-all border border-[#5a5a40]/10 flex items-center gap-3 group/btn shadow-md shadow-[#5a5a40]/10"
                          title="تم الإنجاز"
                        >
                          <CheckCircle2 className="w-4.5 h-4.5" />
                          <span className="text-sm font-bold">تم الإنجاز</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 flex flex-col items-center justify-center text-[#8a8a7c] gap-6"
              >
                <div className="w-24 h-24 bg-[#f5f5f0] rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-12 h-12 text-[#8a8a7c]/40" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-[#6b6b60]">القائمة فارغة تماماً</p>
                  <p className="text-sm mt-2 opacity-70">ابدأ بإضافة الأغراض والبدء بالتتبع اليومي</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation Tabs */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 px-6">
        <nav className="bg-[#f5f5f0]/90 backdrop-blur-2xl border border-[#e5e5df] p-2 rounded-[2.5rem] shadow-2xl flex gap-2 items-center">
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
                  {/* Price Input */}
                  <div className="bg-[#f8f8f5] p-6 rounded-3xl relative focus-within:ring-2 focus-within:ring-[#5a5a40] transition-all">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-bold text-[#8a8a7c]">ج.م</div>
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a7c] uppercase tracking-wider px-2">
                      <Tag className="w-3 h-3" /> اختيار الفئة
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryInput(cat)}
                          className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
                            categoryInput === cat 
                              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md' 
                              : 'bg-white text-[#6b6b60] border-[#f0f0e8] hover:bg-[#f5f5f0]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
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
