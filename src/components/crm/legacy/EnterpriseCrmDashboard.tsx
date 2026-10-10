import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Clock,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Building2,
  Sparkles,
  Award,
  BarChart3,
  Kanban,
  ListTodo,
  Activity as ActivityIcon,
  RefreshCw,
  ExternalLink,
  Tag,
  AlertCircle,
  Check,
  Flame,
  Layers,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  CrmDeal,
  CrmTask,
  CrmActivity,
  CrmRepPerformance,
  PipelineStageConfig,
  PipelineStageId,
  Lead,
  Seat,
  User
} from './types/index.ts';
import { MultipurposeCrmDashboard } from './MultipurposeCrmDashboard.tsx';

interface EnterpriseCrmDashboardProps {
  leads: Lead[];
  seats: Seat[];
  currentUser: User | null;
  onSelectLead?: (lead: Lead) => void;
  onNavigateToOutreach?: (lead: Lead) => void;
}

export const EnterpriseCrmDashboard: React.FC<EnterpriseCrmDashboardProps> = ({
  leads,
  seats,
  currentUser,
  onSelectLead,
  onNavigateToOutreach
}) => {
  // View mode - defaults to the 2026 MultipurposeThemes CRM Hq Admin template
  const [crmView, setCrmView] = useState<'multipurpose' | 'pipeline' | 'analytics' | 'reps' | 'tasks' | 'feed'>('pipeline');

  // Pipeline Data State
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [reps, setReps] = useState<CrmRepPerformance[]>([]);
  const [kpis, setKpis] = useState({
    totalPipelineValue: 0,
    weightedForecastValue: 0,
    activeDealsCount: 0,
    wonDealsCount: 0,
    wonRevenue: 0,
    averageDealSize: 0,
    overallConversionRate: 0,
    avgSalesCycleDays: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSeat, setFilterSeat] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [timeframe, setTimeframe] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');

  // Modals & Sliders
  const [showNewDealModal, setShowNewDealModal] = useState<boolean>(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [selectedDealForDetail, setSelectedDealForDetail] = useState<CrmDeal | null>(null);

  // New Deal Form State
  const [newDealCompany, setNewDealCompany] = useState('');
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealValue, setNewDealValue] = useState('35000');
  const [newDealStage, setNewDealStage] = useState<PipelineStageId>('inbound');
  const [newDealSeat, setNewDealSeat] = useState('seat-1');
  const [newDealPriority, setNewDealPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [newDealContact, setNewDealContact] = useState('');
  const [newDealEmail, setNewDealEmail] = useState('');
  const [newDealPhone, setNewDealPhone] = useState('');
  const [newDealNotes, setNewDealNotes] = useState('');
  const [selectedLeadIdToConvert, setSelectedLeadIdToConvert] = useState<string>('');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'PROPOSAL' | 'FOLLOW_UP'>('CALL');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [newTaskDueTime, setNewTaskDueTime] = useState('02:00 PM');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('SDR Seat 1');
  const [newTaskDealId, setNewTaskDealId] = useState('');

  // Fetch Pipeline Data
  const fetchCrmData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await axios.get('/api/messages/crm/pipeline');
      if (res.data.success) {
        setStages(res.data.stages || []);
        setDeals(res.data.deals || []);
        setTasks(res.data.tasks || []);
        setActivities(res.data.activities || []);
        setReps(res.data.reps || []);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }
      }
    } catch (err) {
      console.warn('Silent CRM pipeline data fetch warning:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCrmData();
  }, []);

  // Format Currency (USD vs PKR conversion rate approx 280)
  const formatMoney = (amount: number) => {
    if (currency === 'PKR') {
      const pkr = amount * 280;
      if (pkr >= 10000000) {
        return `Rs ${(pkr / 10000000).toFixed(2)} Cr`;
      }
      if (pkr >= 100000) {
        return `Rs ${(pkr / 100000).toFixed(1)} Lakh`;
      }
      return `Rs ${pkr.toLocaleString()}`;
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Move deal stage (Drag/Drop or Action button)
  const handleMoveDealStage = async (dealId: string, nextStage: PipelineStageId) => {
    // Optimistic UI update
    setDeals(prev =>
      prev.map(d => (d.id === dealId ? { ...d, stage: nextStage, updatedAt: new Date().toISOString() } : d))
    );

    try {
      const res = await axios.patch(`/api/messages/crm/deals/${dealId}`, { stage: nextStage });
      if (res.data.success && res.data.deal) {
        setDeals(prev => prev.map(d => (d.id === dealId ? res.data.deal : d)));
        fetchCrmData(true);
      }
    } catch (err) {
      console.error('Failed to update deal stage', err);
      fetchCrmData(true);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t))
    );

    try {
      const res = await axios.patch(`/api/messages/crm/tasks/${taskId}/toggle`);
      if (res.data.success && res.data.task) {
        setTasks(prev => prev.map(t => (t.id === taskId ? res.data.task : t)));
        fetchCrmData(true);
      }
    } catch (err) {
      console.error('Failed to toggle task', err);
      fetchCrmData(true);
    }
  };

  // Create New Deal
  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealCompany.trim()) return;

    try {
      const rep = reps.find(r => r.seatId === newDealSeat);
      const payload: Partial<CrmDeal> = {
        companyName: newDealCompany.trim(),
        dealName: newDealTitle.trim() || `${newDealCompany.trim()} - Commercial Opportunity`,
        value: Number(newDealValue) || 25000,
        stage: newDealStage,
        assignedSeatId: newDealSeat,
        assignedRepName: rep ? rep.name : 'SDR Seat 1',
        priority: newDealPriority,
        contactPerson: newDealContact,
        contactEmail: newDealEmail,
        contactPhone: newDealPhone,
        notes: newDealNotes,
        leadId: selectedLeadIdToConvert || undefined,
        source: selectedLeadIdToConvert ? 'Converted From Verified Lead' : 'Direct CRM Entry'
      };

      const res = await axios.post('/api/messages/crm/deals', payload);
      if (res.data.success) {
        setShowNewDealModal(false);
        setNewDealCompany('');
        setNewDealTitle('');
        setNewDealNotes('');
        setSelectedLeadIdToConvert('');
        fetchCrmData(true);
      }
    } catch (err) {
      console.error('Failed to create deal', err);
    }
  };

  // Create New Task
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const deal = deals.find(d => d.id === newTaskDealId);
      const payload: Partial<CrmTask> = {
        title: newTaskTitle.trim(),
        type: newTaskType,
        dueDate: newTaskDueDate,
        dueTime: newTaskDueTime,
        priority: newTaskPriority,
        assignedTo: newTaskAssignedTo,
        dealId: newTaskDealId || undefined,
        companyName: deal ? deal.companyName : undefined
      };

      const res = await axios.post('/api/messages/crm/tasks', payload);
      if (res.data.success) {
        setShowNewTaskModal(false);
        setNewTaskTitle('');
        fetchCrmData(true);
      }
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  // Convert Lead selection handler
  const handleSelectLeadToConvert = (leadId: string) => {
    setSelectedLeadIdToConvert(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setNewDealCompany(lead.companyName);
      setNewDealTitle(`${lead.companyName} - Enterprise Lead Contract`);
      setNewDealContact(lead.contactPerson?.name || '');
      setNewDealEmail(lead.email || '');
      setNewDealPhone(lead.phone || '');
      setNewDealNotes(`Converted from verified directory. Industry: ${lead.industry || 'Real Estate'}, City: ${lead.city || 'Pakistan'}`);
      if (lead.assignedSeatId) {
        setNewDealSeat(lead.assignedSeatId);
      }
    }
  };

  // Filter deals by text, owner, priority, and the selected real date range.
  const filteredDeals = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (timeframe === 'TODAY') cutoff.setHours(0, 0, 0, 0);
    else if (timeframe === 'WEEK') cutoff.setDate(cutoff.getDate() - 7);
    else if (timeframe === 'MONTH') cutoff.setDate(1);
    return deals.filter(deal => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          String(deal.companyName || '').toLowerCase().includes(q) ||
          String(deal.dealName || '').toLowerCase().includes(q) ||
          String(deal.contactPerson || '').toLowerCase().includes(q) ||
          String(deal.source || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterSeat !== 'ALL' && deal.assignedSeatId !== filterSeat) return false;
      if (filterPriority !== 'ALL' && deal.priority !== filterPriority) return false;
      if (timeframe !== 'ALL' && deal.createdAt && new Date(deal.createdAt) < cutoff) return false;
      return true;
    });
  }, [deals, searchQuery, filterSeat, filterPriority, timeframe]);

  // Funnel Analytics Aggregation
  const funnelData = useMemo(() => {
    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage.id);
      const totalVal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      return {
        name: stage.name,
        stageId: stage.id,
        count: stageDeals.length,
        value: totalVal,
        color: stage.color,
        probability: stage.probability
      };
    });
  }, [stages, deals]);

  // Data-backed snapshots. Historical revenue is not reported until the CRM has history to calculate it.
  const velocityTrendData = useMemo(() => deals.length ? [{
    month: 'Current',
    dealsClosed: kpis.wonDealsCount || 0,
    revenueWon: kpis.wonRevenue || 0,
    pipelineProjected: kpis.totalPipelineValue || 0,
  }] : [], [deals.length, kpis]);

  const leadSourceData = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((lead) => {
      const source = lead.sourceCategory || lead.discoverySource || 'PlayBeat customer records';
      counts.set(source, (counts.get(source) || 0) + 1);
    });
    const colors = ['#38bdf8', '#06b6d4', '#6366f1', '#a855f7', '#10b981'];
    return [...counts.entries()].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  }, [leads]);

  const STAGE_ORDER: PipelineStageId[] = ['inbound', 'contacted', 'qualified', 'demo', 'proposal', 'won'];

  return (
    <div className="space-y-5 w-full max-w-full min-w-0">
      {/* PlayBeat Enterprise CRM */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>2026 ENTERPRISE CRM DASHBOARD</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                SALES & LEAD TRACKING
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Executive Sales Operations Desk</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-medium border border-slate-700">
                Main CRM
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              End-to-end deal stage tracking, pipeline revenue forecasting, multi-seat sales quota velocity, and real-time lead conversion.
            </p>
          </div>

          {/* Top Control Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
            {/* Currency Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currency === 'USD' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('PKR')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currency === 'PKR' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PKR (Rs)
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-medium text-slate-400">
              <button
                type="button"
                onClick={() => setTimeframe('TODAY')}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${timeframe === 'TODAY' ? 'bg-slate-800 text-cyan-300' : 'hover:text-slate-200'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('WEEK')}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${timeframe === 'WEEK' ? 'bg-slate-800 text-cyan-300' : 'hover:text-slate-200'}`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('MONTH')}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${timeframe === 'MONTH' ? 'bg-slate-800 text-cyan-300' : 'hover:text-slate-200'}`}
              >
                Month-to-Date
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('ALL')}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${timeframe === 'ALL' ? 'bg-slate-800 text-cyan-300' : 'hover:text-slate-200'}`}
              >
                All Time
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchCrmData(false)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Refresh Pipeline Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => setShowNewTaskModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <ListTodo className="w-3.5 h-3.5 text-yellow-400" />
              <span>+ Add Task</span>
            </button>

            {/* Add Deal Button */}
            <button
              type="button"
              onClick={() => setShowNewDealModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Deal</span>
            </button>
          </div>
        </div>

        {/* Live CRM KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-800/80">
          {/* Total Active Pipeline */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-cyan-500/40 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Active Pipeline</span>
              <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {formatMoney(kpis.totalPipelineValue)}
            </div>
            <div className="flex items-center text-[10px] text-emerald-400 font-semibold mt-1 space-x-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+18.4% vs last period</span>
            </div>
          </div>

          {/* Weighted Forecast */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-indigo-500/40 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Weighted Forecast</span>
              <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20">
                <Target className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {formatMoney(kpis.weightedForecastValue)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              Based on probability models
            </div>
          </div>

          {/* Closed Won Revenue */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Closed Won ARR</span>
              <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                <Award className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              {formatMoney(kpis.wonRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              {kpis.wonDealsCount} signed enterprise deals
            </div>
          </div>

          {/* Win Rate / Conversion */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-purple-500/40 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Win Conversion</span>
              <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {kpis.overallConversionRate}%
            </div>
            <div className="flex items-center text-[10px] text-emerald-400 font-semibold mt-1 space-x-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>CRM data from recorded deals</span>
            </div>
          </div>

          {/* Sales Cycle Velocity */}
          <div className="hidden lg:block bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-yellow-500/40 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Avg Deal Velocity</span>
              <span className="p-1 rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:bg-yellow-500/20">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {kpis.avgSalesCycleDays} <span className="text-sm font-normal text-slate-400">Days</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              Fastest in Real Estate Niche
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Enterprise CRM */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setCrmView('multipurpose')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'multipurpose'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>PlayBeat CRM</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold bg-white/20 text-white border border-white/30">
              HQ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCrmView('pipeline')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'pipeline'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Sales Pipeline Board</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${crmView === 'pipeline' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {filteredDeals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCrmView('analytics')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'analytics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sales Analytics & Funnel</span>
          </button>

          <button
            type="button"
            onClick={() => setCrmView('reps')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'reps'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rep Leaderboard & Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setCrmView('tasks')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'tasks'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Upcoming Tasks & Agenda</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${crmView === 'tasks' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {tasks.filter(t => !t.completed).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCrmView('feed')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              crmView === 'feed'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ActivityIcon className="w-3.5 h-3.5" />
            <span>Activity Stream</span>
          </button>
        </div>

        {/* Global Pipeline Search and Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search deals & accounts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[10px] text-slate-500 hover:text-slate-300 p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Seat Filter */}
          <select
            value={filterSeat}
            onChange={e => setFilterSeat(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Seats</option>
            <option value="seat-1">Seat 1 (SDR)</option>
            <option value="seat-2">Seat 2 (Email)</option>
            <option value="seat-3">Seat 3 (WhatsApp)</option>
            <option value="seat-4">Seat 4 (Phone Closer)</option>
          </select>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 0. SOURCE CRM DASHBOARD */}
      {/* ======================================================================= */}
      {crmView === 'multipurpose' && (
        <div className="w-full">
          <MultipurposeCrmDashboard
            leads={leads}
            seats={seats}
            currentUser={currentUser}
            onSelectLead={onSelectLead}
            onNavigateToOutreach={onNavigateToOutreach}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* 1. SALES PIPELINE KANBAN BOARD */}
      {/* ======================================================================= */}
      {crmView === 'pipeline' && (
        <div className="space-y-4">
          {/* Stage summary pills header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {stages.map(stg => {
              const stageDeals = filteredDeals.filter(d => d.stage === stg.id);
              const stageVal = stageDeals.reduce((acc, d) => acc + (d.value || 0), 0);
              return (
                <div
                  key={stg.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{stg.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${stg.badgeBg}`}>
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {formatMoney(stageVal)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {stg.probability}% win probability
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
            {stages.map((stage, stageIndex) => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
              const totalColVal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col min-h-[560px] w-full"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                        {stage.name}
                      </h2>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-mono font-bold text-slate-300">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Stage Volume Sub-label */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 px-1">
                    <span>Stage Value:</span>
                    <span className="font-bold text-slate-200">{formatMoney(totalColVal)}</span>
                  </div>

                  {/* Deals Cards List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[720px] pr-1">
                    {stageDeals.length === 0 ? (
                      <div className="h-32 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-3 text-center text-slate-600">
                        <Briefcase className="w-5 h-5 mb-1.5 opacity-40" />
                        <span className="text-[11px]">No deals in {stage.name}</span>
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <div
                          key={deal.id}
                          className="bg-slate-950 border border-slate-800/90 hover:border-cyan-500/50 rounded-xl p-3 transition-all hover:shadow-lg hover:shadow-cyan-500/5 group cursor-pointer relative"
                          onClick={() => setSelectedDealForDetail(deal)}
                        >
                          {/* Priority & Value Header */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                deal.priority === 'URGENT'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : deal.priority === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : deal.priority === 'MEDIUM'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {deal.priority}
                            </span>
                            <span className="text-xs font-black text-cyan-300">
                              {formatMoney(deal.value)}
                            </span>
                          </div>

                          {/* Company Name */}
                          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                            {deal.companyName}
                          </h3>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {deal.dealName}
                          </p>

                          {/* Contact & Seat Info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900">
                            <span className="truncate max-w-[110px] text-slate-300 font-medium">
                              {deal.assignedRepName}
                            </span>
                            <span className="font-mono text-cyan-400 font-semibold">
                              {deal.probability}%
                            </span>
                          </div>

                          {/* Quick Stage Transition Actions */}
                          <div
                            className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80 gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={stageIndex === 0}
                              onClick={() => handleMoveDealStage(deal.id, STAGE_ORDER[stageIndex - 1])}
                              className={`p-1 rounded-lg text-xs transition-colors ${
                                stageIndex === 0
                                  ? 'text-slate-700 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                              }`}
                              title="Move back one stage"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <select
                              value={deal.stage}
                              onChange={e => handleMoveDealStage(deal.id, e.target.value as PipelineStageId)}
                              className="bg-slate-900 border border-slate-800 rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none cursor-pointer max-w-[100px] truncate"
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={stageIndex === STAGE_ORDER.length - 1}
                              onClick={() => handleMoveDealStage(deal.id, STAGE_ORDER[stageIndex + 1])}
                              className={`p-1 rounded-lg text-xs transition-colors ${
                                stageIndex === STAGE_ORDER.length - 1
                                  ? 'text-slate-700 cursor-not-allowed'
                                  : 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/80 cursor-pointer'
                              }`}
                              title="Advance to next stage"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 2. SALES ANALYTICS & FUNNEL VISUALIZATION */}
      {/* ======================================================================= */}
      {crmView === 'analytics' && (
        <div className="space-y-5">
          {/* Top Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sales Pipeline Funnel Progression */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Pipeline Funnel Velocity & Drop-off</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deals volume and monetary value progression across each milestone
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/30">
                  {filteredDeals.length} TOTAL DEALS
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tickFormatter={val => `${val}`} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} Deals`, 'Volume']}
                    />
                    <Bar dataKey="count" fill="#38bdf8" radius={[0, 6, 6, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stage Conversion Math Row */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
                {funnelData.map(stg => (
                  <div key={stg.stageId} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 truncate">{stg.name}</div>
                    <div className="text-xs font-extrabold text-white mt-0.5">{formatMoney(stg.value)}</div>
                    <div className="text-[9px] font-mono text-cyan-400 mt-0.5">{stg.count} deals</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead Acquisition by Channel */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-yellow-400" />
                  <span>Leads by Acquisition Channel</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-converting inbound crawl pipelines
                </p>
              </div>

              <div className="h-52 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`source-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Channel legend items */}
              <div className="space-y-1.5 text-xs">
                {leadSourceData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 truncate max-w-[160px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-white font-mono">{item.value} deals</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue Velocity Chart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Current Pipeline Snapshot</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual closed ARR revenue versus active weighted pipeline projection
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-slate-300">Closed Revenue</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500" />
                  <span className="text-slate-300">Pipeline Projection</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={val => `$${val / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(val: any) => [formatMoney(val), 'Value']}
                  />
                  <Area type="monotone" dataKey="pipelineProjected" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPipeline)" strokeWidth={2} />
                  <Area type="monotone" dataKey="revenueWon" stroke="#10b981" fillOpacity={1} fill="url(#colorWon)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 3. REP LEADERBOARD & 4-SEAT PERFORMANCE */}
      {/* ======================================================================= */}
      {crmView === 'reps' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span>4-Seat Sales Team Quota & Conversion Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Performance metrics across SDR, Email Closer, WhatsApp Specialist, and Telephone Closer seats
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30">
                Based on recorded CRM deals
              </span>
            </div>

            {/* Reps Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reps.map(rep => (
                <div
                  key={rep.seatId}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border ${rep.avatarBg}`}>
                          {rep.seatId.replace('seat-', 'S')}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{rep.name}</h4>
                          <p className="text-[10px] text-slate-400">{rep.role}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                        {rep.quotaAttainment}%
                      </span>
                    </div>

                    {/* Attainment progress bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(rep.quotaAttainment, 100)}%` }}
                      />
                    </div>

                    {/* Metrics list */}
                    <div className="space-y-2 text-xs pt-1 border-t border-slate-900">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Assigned Pipeline:</span>
                        <span className="font-bold text-slate-200">{formatMoney(rep.pipelineValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Won Revenue:</span>
                        <span className="font-bold text-emerald-400">{formatMoney(rep.wonValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Win Conversion:</span>
                        <span className="font-bold text-white">{rep.conversionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Outreach Touches:</span>
                        <span className="font-mono text-cyan-300 font-semibold">{rep.callsCount} touches</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFilterSeat(rep.seatId);
                      setCrmView('pipeline');
                    }}
                    className="mt-4 w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Filter {rep.name}'s Deals
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 4. UPCOMING TASKS & SALES AGENDA */}
      {/* ======================================================================= */}
      {crmView === 'tasks' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-cyan-400" />
                <span>Sales Team Agenda & Action Checklist</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scheduled client demo calls, proposal revisions, and contract follow-ups
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewTaskModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Task</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No active tasks scheduled. Click "+ New Task" to assign work to an SDR.
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                    task.completed
                      ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        task.completed
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'border-slate-700 hover:border-cyan-400 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold uppercase bg-slate-900 border border-slate-800 text-slate-400">
                          {task.type}
                        </span>
                      </div>
                      {task.companyName && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-cyan-400" />
                          <span>{task.companyName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-slate-300 font-semibold">{task.dueDate}</div>
                      <div className="text-[10px] text-slate-500">{task.dueTime}</div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                      {task.assignedTo}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 5. LIVE ACTIVITY FEED */}
      {/* ======================================================================= */}
      {crmView === 'feed' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-cyan-400" />
                <span>Enterprise Deal Audit & Activity Timeline</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time chronological events from SDR touches, pipeline progressions, and deals closed
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{activities.length} logged events</span>
          </div>

          <div className="space-y-3">
            {activities.map(act => (
              <div
                key={act.id}
                className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    act.type === 'DEAL_WON'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : act.type === 'STAGE_CHANGE'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : act.type === 'CALL_LOGGED'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {act.type === 'DEAL_WON' ? (
                    <Award className="w-4 h-4" />
                  ) : act.type === 'STAGE_CHANGE' ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : act.type === 'CALL_LOGGED' ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-200">{act.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{act.dealName}</p>
                  <span className="inline-block text-[10px] text-cyan-400 font-medium mt-1">
                    Actor: {act.actor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: NEW DEAL & LEAD CONVERSION */}
      {/* ======================================================================= */}
      {showNewDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Add New Deal / Opportunity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDealModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Pick: Convert Existing Lead */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
              <label className="block text-[11px] font-semibold text-cyan-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Or Convert from Verified Leads Explorer ({leads.length} available):</span>
              </label>
              <select
                value={selectedLeadIdToConvert}
                onChange={e => handleSelectLeadToConvert(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose lead from verified crawler database --</option>
                {leads.slice(0, 100).map(l => (
                  <option key={l.id} value={l.id}>
                    {l.companyName} ({l.city || 'Pakistan'}) - {l.emailVerified ? 'VERIFIED' : 'ACTIVE'}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreateDealSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Company / Account *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zameen Media Pvt Ltd"
                    value={newDealCompany}
                    onChange={e => setNewDealCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Deal Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise License Contract"
                    value={newDealTitle}
                    onChange={e => setNewDealTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Deal Value (USD) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="500"
                    value={newDealValue}
                    onChange={e => setNewDealValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Initial Stage</label>
                  <select
                    value={newDealStage}
                    onChange={e => setNewDealStage(e.target.value as PipelineStageId)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={newDealPriority}
                    onChange={e => setNewDealPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Assigned Seat</label>
                  <select
                    value={newDealSeat}
                    onChange={e => setNewDealSeat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="seat-1">Seat 1 (SDR)</option>
                    <option value="seat-2">Seat 2 (Email Specialist)</option>
                    <option value="seat-3">Seat 3 (WhatsApp Closer)</option>
                    <option value="seat-4">Seat 4 (Telephone Closer)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Key Decision Maker"
                    value={newDealContact}
                    onChange={e => setNewDealContact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={newDealPhone}
                    onChange={e => setNewDealPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Deal Intelligence & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key requirements, decision maker intent, target close date..."
                  value={newDealNotes}
                  onChange={e => setNewDealNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewDealModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-md cursor-pointer"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: NEW TASK */}
      {/* ======================================================================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ListTodo className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Create Sales Follow-up Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive solution walkthrough with CTO"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Task Type</label>
                  <select
                    value={newTaskType}
                    onChange={e => setNewTaskType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email Follow-up</option>
                    <option value="DEMO">Product Demo</option>
                    <option value="MEETING">Executive Meeting</option>
                    <option value="PROPOSAL">Proposal Review</option>
                    <option value="FOLLOW_UP">General Follow-up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Due Day</label>
                  <input
                    type="text"
                    placeholder="Today / Tomorrow / Friday"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Due Time</label>
                  <input
                    type="text"
                    placeholder="02:30 PM"
                    value={newTaskDueTime}
                    onChange={e => setNewTaskDueTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Assign To</label>
                <select
                  value={newTaskAssignedTo}
                  onChange={e => setNewTaskAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="SDR Seat 1">SDR Seat 1</option>
                  <option value="Email Closer Seat 2">Email Closer Seat 2</option>
                  <option value="WhatsApp Specialist Seat 3">WhatsApp Specialist Seat 3</option>
                  <option value="Phone Closer Seat 4">Phone Closer Seat 4</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Associate with Deal</label>
                <select
                  value={newTaskDealId}
                  onChange={e => setNewTaskDealId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- No specific deal --</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.companyName} (${d.value.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-md cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SLIDEOUT DETAIL: DEAL INSPECTOR */}
      {/* ======================================================================= */}
      {selectedDealForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-5 sm:p-6 shadow-2xl overflow-y-auto space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase text-slate-400">Deal Inspector</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDealForDetail(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {selectedDealForDetail.stage.toUpperCase()} STAGE
                </span>
                <h2 className="text-base font-black text-white mt-1.5">
                  {selectedDealForDetail.companyName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDealForDetail.dealName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Opportunity Value</div>
                  <div className="text-base font-black text-cyan-300 mt-0.5">
                    {formatMoney(selectedDealForDetail.value)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Win Probability</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {selectedDealForDetail.probability}%
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="font-bold text-slate-300 pb-1 border-b border-slate-900">
                  Contact Information
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-slate-200">{selectedDealForDetail.contactPerson || 'Decision Maker'}</span>
                </div>
                {selectedDealForDetail.contactEmail && (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-200">{selectedDealForDetail.contactEmail}</span>
                  </div>
                )}
                {selectedDealForDetail.contactPhone && (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-200">{selectedDealForDetail.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedDealForDetail.notes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-slate-300">Sales Intelligence Notes:</div>
                  <p className="text-slate-400 leading-relaxed">{selectedDealForDetail.notes}</p>
                </div>
              )}

              {/* Stage Progressor */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-300">Advance Deal Stage</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {stages.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        handleMoveDealStage(selectedDealForDetail.id, s.id);
                        setSelectedDealForDetail(prev => prev ? { ...prev, stage: s.id } : null);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate ${
                        selectedDealForDetail.stage === s.id
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const deal = selectedDealForDetail;
                  if (deal && onSelectLead) {
                    const matchedLead = leads.find(l => l.companyName === deal.companyName);
                    if (matchedLead) onSelectLead(matchedLead);
                  }
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <span>View Matched Lead</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDealForDetail(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
