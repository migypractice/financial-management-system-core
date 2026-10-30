import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, CheckSquare, BookOpen, CreditCard, DollarSign,
  Send, Inbox, PieChart, Landmark, BarChart2, Receipt, ShieldCheck,
  Bell, Mail, ChevronDown, Menu, LogOut, Settings, ChevronLeft, Moon, Sun, Clock, X, Sparkles,
  FileText, CheckCircle2, ArrowRight, RefreshCw, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  userRole?: string;
  userName?: string;
  onNavigate?: (path: string) => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

// ── 9 Transaction Core Modules (front and center) ──
const coreModules: NavItem[] = [
  { path: '/dashboard',     label: 'Dashboard',                icon: LayoutDashboard },
  { path: '/gl',            label: 'General Ledger',            icon: BookOpen },
  { path: '/ap',            label: 'Accounts Payable',          icon: CreditCard },
  { path: '/ar',            label: 'Accounts Receivable',       icon: DollarSign },
  { path: '/disbursements', label: 'Disbursement Mgmt',         icon: Send },
  { path: '/collections',   label: 'Collection Mgmt',           icon: Inbox },
  { path: '/budget',        label: 'Budget Management',         icon: PieChart },
  { path: '/cash',          label: 'Cash Management',           icon: Landmark },
  { path: '/reports',       label: 'Reports & Analytics',       icon: BarChart2 },
  { path: '/tax',           label: 'Tax Management',            icon: Receipt },
];

// ── Internal Controls & Audit ──
const internalControls: NavItem[] = [
  { path: '/audit-logs',    label: 'Audit Trail',               icon: ShieldCheck },
];

const representativeNotifications = [
  { id: 1, title: 'Voucher Flagged', desc: 'AI flagged PR-2026-8801. Awaiting manager review.', time: '2 min ago', type: 'alert', action: 'View Vouchers', path: '/disbursements' },
  { id: 2, title: 'GL Aggregation', desc: 'Daily SQL aggregation completed successfully.', time: '1 hr ago', type: 'info' },
  { id: 3, title: 'System Update', desc: 'Enterprise M2M Integration protocol active across all modules.', time: '3 hrs ago', type: 'info' },
];

export interface IncomingRequestItem {
  id: string;
  refNumber: string;
  sender: string;
  title: string;
  amount: number;
  purpose: string;
  time: string;
  type: 'PAYMENT_REQUEST' | 'SUPPLIER_BILL';
  status: string;
  targetPath: string;
  requesterName: string;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Just now';
  const past = new Date(dateString);
  if (isNaN(past.getTime())) return 'Recently';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activePath = '/dashboard',
  userRole = 'System User',
  userName = 'User',
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const headerRef = useRef<HTMLDivElement>(null);
  const { logout, user, switchRole } = useAuth();

  // ── Live Incoming Requests & Submissions Inbox ──
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequestItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fm_inbox_read_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchIncomingRequests = useCallback(async () => {
    try {
      setInboxLoading(true);
      const [prRes, billRes] = await Promise.allSettled([
        apiClient.get('/payment-requests?status=PENDING_APPROVAL'),
        apiClient.get('/ap-bills?status=UNPAID'),
      ]);

      const items: IncomingRequestItem[] = [];

      if (prRes.status === 'fulfilled' && prRes.value.data?.data) {
        prRes.value.data.data.forEach((pr: any) => {
          items.push({
            id: `pr-${pr.id}`,
            refNumber: pr.request_number,
            sender: pr.payee_name || 'Vendor Payee',
            title: `Disbursement Voucher #${pr.request_number}`,
            amount: typeof pr.amount === 'number' ? pr.amount : parseFloat(pr.amount || 0),
            purpose: pr.purpose || 'Payment request submitted for approval',
            time: formatTimeAgo(pr.created_at),
            type: 'PAYMENT_REQUEST',
            status: pr.status || 'PENDING_APPROVAL',
            targetPath: '/disbursements',
            requesterName: pr.requester_name || pr.requester_dept || 'Department Maker',
          });
        });
      }

      if (billRes.status === 'fulfilled' && billRes.value.data?.data) {
        billRes.value.data.data.slice(0, 5).forEach((b: any) => {
          items.push({
            id: `bill-${b.id}`,
            refNumber: b.bill_number,
            sender: b.supplier_name || 'Supplier Invoice',
            title: `Supplier Bill #${b.bill_number}`,
            amount: typeof b.balance === 'number' ? b.balance : parseFloat(b.balance || 0),
            purpose: b.description || 'Inbound supplier billing statement',
            time: formatTimeAgo(b.bill_date),
            type: 'SUPPLIER_BILL',
            status: b.status || 'UNPAID',
            targetPath: '/ap',
            requesterName: b.origin_label || 'Supply Chain',
          });
        });
      }

      if (items.length === 0) {
        items.push(
          {
            id: 'pr-mock-1',
            refNumber: 'PR-202610-0005',
            sender: 'Pacific Paint (Boysen) Phils.',
            title: 'Disbursement Voucher #PR-202610-0005',
            amount: 38500.00,
            purpose: 'Final balance settlement for Permacoat Latex Paint & Primers',
            time: '10m ago',
            type: 'PAYMENT_REQUEST',
            status: 'PENDING_APPROVAL',
            targetPath: '/disbursements',
            requesterName: 'Production Staff Maker',
          },
          {
            id: 'pr-mock-2',
            refNumber: 'PR-202610-0006',
            sender: 'Holcim Philippines Inc.',
            title: 'Disbursement Voucher #PR-202610-0006',
            amount: 145000.00,
            purpose: 'Supply of Type 1 Portland Cement for Q4 Construction Projects',
            time: '45m ago',
            type: 'PAYMENT_REQUEST',
            status: 'PENDING_APPROVAL',
            targetPath: '/disbursements',
            requesterName: 'Warehouse Procurement',
          },
          {
            id: 'bill-mock-3',
            refNumber: 'BILL-2026-1002',
            sender: 'Holcim Philippines Inc.',
            title: 'Supplier Bill #BILL-2026-1002',
            amount: 50000.00,
            purpose: 'Supply Chain PO for Ready-Mix Concrete Batch',
            time: '2h ago',
            type: 'SUPPLIER_BILL',
            status: 'UNPAID',
            targetPath: '/ap',
            requesterName: 'Supply Chain Department',
          }
        );
      }

      setIncomingRequests(items);
    } catch {
      // Keep existing state if error
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncomingRequests();
    const interval = setInterval(fetchIncomingRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchIncomingRequests]);

  const unreadCount = incomingRequests.filter(item => !readIds.includes(item.id)).length;

  const handleRequestClick = (item: IncomingRequestItem) => {
    if (!readIds.includes(item.id)) {
      const next = [...readIds, item.id];
      setReadIds(next);
      localStorage.setItem('fm_inbox_read_ids', JSON.stringify(next));
    }
    setMailOpen(false);
    handleNav(item.targetPath);
  };

  const handleMarkAllRead = () => {
    const allIds = incomingRequests.map(i => i.id);
    const next = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(next);
    localStorage.setItem('fm_inbox_read_ids', JSON.stringify(next));
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleThemeToggle = () => {
      setDarkMode(prev => {
        const next = !prev;
        if (next) {
          localStorage.setItem('theme', 'dark');
        } else {
          localStorage.setItem('theme', 'light');
        }
        return next;
      });
      setTimeout(() => window.dispatchEvent(new Event('themeToggleSync')), 10);
    };
    
    window.addEventListener('themeToggle', handleThemeToggle);
    return () => window.removeEventListener('themeToggle', handleThemeToggle);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setMailOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setMailOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeUserName = user ? user.name : userName;
  const activeUserRole = user ? user.role : userRole;

  const initials = activeUserName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleNav = (path: string) => {
    if (onNavigate) onNavigate(path);
    setMobileMenuOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setMailOpen(false);
  };

  const toggleMail = () => {
    setMailOpen(!mailOpen);
    setNotificationsOpen(false);
  };

  return (
    <div className="print:block print:h-auto flex h-screen bg-gray-50 dark:bg-slate-900 font-sans overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`print:hidden fixed md:relative flex flex-col h-full shrink-0 transition-all duration-300 z-50 ${
          mobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-[72px]' : 'md:w-[220px]'} w-64 max-w-[85vw]`}
        style={{
          background: 'linear-gradient(180deg, #1e2d4a 0%, #162038 100%)',
        }}
      >
        {/* Brand — Archon Nell Logo */}
        <div className="px-3 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          {collapsed ? (
            <div className="w-10 h-10 shrink-0 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden mx-auto">
              <img src="/archon-nell-logo.png" alt="Archon Nell Incorporated" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex-1 h-14 sm:h-16 rounded-lg bg-white shadow-sm overflow-hidden">
              <img
                src="/archon-nell-logo.png"
                alt="Archon Nell Incorporated"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 47%' }}
              />
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-blue-200/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {/* Core Modules Group */}
          {!collapsed && (
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
              Core Financial Modules
            </div>
          )}
          {coreModules.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                style={isActive ? { background: 'linear-gradient(135deg, #4f46e5, #2563eb)' } : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-left group relative ${
                  isActive
                    ? 'text-white shadow-md shadow-blue-900/30'
                    : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <span className="text-[12.5px] font-medium truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[10px] rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}

          {/* Section Divider */}
          <div className="my-2 border-t border-white/10" />

          {/* Controls & Audit Group */}
          {!collapsed && (
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
              Internal Controls & Audit
            </div>
          )}
          {internalControls.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                style={isActive ? { background: 'linear-gradient(135deg, #4f46e5, #2563eb)' } : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-left group relative ${
                  isActive
                    ? 'text-white shadow-md shadow-blue-900/30'
                    : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <span className="text-[12.5px] font-medium truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[10px] rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-white/10 p-2.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-blue-200/60 hover:bg-white/10 hover:text-white transition-all text-xs font-medium cursor-pointer"
          >
            <ChevronLeft size={16} className={`shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="print:block print:h-auto flex-1 flex flex-col h-full overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="print:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-500 dark:text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <Clock size={14} className="text-blue-500" />
              <span className="text-xs font-semibold tabular-nums tracking-wide">
                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3" ref={headerRef}>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle visual theme"
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300"
              >
                <Bell size={15} />
                <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>

              {notificationsOpen && (
                <div className="absolute top-full mt-2 right-0 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h3>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600">3 New</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50">
                    {representativeNotifications.map(n => (
                      <div key={n.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{n.title}</p>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.desc}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">{n.time}</span>
                              {n.action && (
                                <button 
                                  onClick={() => {
                                    handleNav(n.path!);
                                    setNotificationsOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {n.action}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <button 
                      onClick={() => setNotificationsOpen(false)}
                      className="w-full py-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mail / Inbox — Live Incoming Requests */}
            <div className="relative">
              <button 
                onClick={toggleMail}
                aria-label="Incoming Requests"
                aria-expanded={mailOpen}
                title="Inbox — Live Incoming Requests"
                className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300 cursor-pointer"
              >
                <Mail size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-indigo-600 text-white text-[9px] rounded-full font-bold shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {mailOpen && (
                <div className="absolute top-full mt-2 right-0 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Incoming Requests</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 ? (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800">
                          {unreadCount} Pending
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                          All Checked
                        </span>
                      )}
                      <button
                        onClick={fetchIncomingRequests}
                        disabled={inboxLoading}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                        title="Refresh live requests"
                      >
                        <RefreshCw size={12} className={inboxLoading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50">
                    {incomingRequests.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200">No Pending Requests</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">All incoming payment requests and bills have been attended to.</p>
                      </div>
                    ) : (
                      incomingRequests.map(item => {
                        const isUnread = !readIds.includes(item.id);
                        return (
                          <button 
                            key={item.id} 
                            className={`w-full text-left p-3 sm:p-3.5 hover:bg-indigo-50/40 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group flex items-start gap-2.5 ${isUnread ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`} 
                            onClick={() => handleRequestClick(item)}
                          >
                            <div className="mt-0.5 shrink-0">
                              {item.type === 'PAYMENT_REQUEST' ? (
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                                  <Send className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                  item.type === 'PAYMENT_REQUEST' 
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                }`}>
                                  {item.type === 'PAYMENT_REQUEST' ? 'Payment Request' : 'Supplier Bill'}
                                </span>
                                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 shrink-0 ml-2">{item.time}</span>
                              </div>

                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.sender}
                              </p>

                              <p className="text-[11px] text-gray-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                {item.title} • <span className="font-bold text-gray-900 dark:text-white">₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </p>

                              <p className="text-[11px] text-gray-400 dark:text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                                {item.purpose}
                              </p>

                              <div className="flex items-center justify-between mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                <span className="text-gray-400 dark:text-slate-500 font-normal">By: {item.requesterName}</span>
                                <span className="inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                  Act Now <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>

                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-2" title="Unread" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors px-2 py-1 cursor-pointer"
                    >
                      Mark all as read
                    </button>
                    <button 
                      onClick={() => {
                        handleNav('/disbursements');
                        setMailOpen(false);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 px-2 py-1 cursor-pointer"
                    >
                      <span>Disbursements Queue</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Demo Role Switcher (Proving Maker-Checker & RBAC) */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-all bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer"
                title="Oral Defense Live Role Switcher: Demonstrate Segregation of Duties (Maker ≠ Checker)"
              >
                <Shield size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden md:inline font-bold">Role:</span>
                <span className="truncate max-w-[130px] font-semibold text-[11px]">
                  {user?.role === 'super_admin' ? 'Super Admin' :
                   user?.role === 'finance_manager' ? 'Checker (Mgr)' :
                   user?.role === 'accountant' ? 'Maker (Acct)' :
                   user?.role === 'auditor' ? 'Auditor (Read)' : (user?.role || 'User')}
                </span>
                <ChevronDown size={12} className="text-indigo-500 shrink-0" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-150 dark:border-slate-700 py-1.5 z-50 animate-fadeIn">
                  <div className="px-3.5 py-2 border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Defense Role Switcher</span>
                      <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">RBAC Demo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Switch role live to demonstrate Segregation of Duties (Maker ≠ Checker).</p>
                  </div>
                  <div className="p-1 space-y-1">
                    {[
                      { role: 'super_admin', title: 'Super Admin', sub: 'Full access to all 10 modules & overrides', badge: 'Full Access' },
                      { role: 'finance_manager', title: 'Finance Manager (Checker)', sub: 'Can Approve & Disburse vouchers', badge: 'Checker' },
                      { role: 'accountant', title: 'Accountant (Maker)', sub: 'Can create bills & invoices; approvals locked', badge: 'Maker' },
                      { role: 'auditor', title: 'Internal Auditor (Read-Only)', sub: 'View-only access; mutations disabled', badge: 'Read-Only' },
                    ].map((item) => {
                      const isActive = (user?.role || 'super_admin') === item.role;
                      return (
                        <button
                          key={item.role}
                          onClick={() => {
                            switchRole(item.role, item.title);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer flex items-start gap-2.5 ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isActive ? (
                              <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 mt-0.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isActive ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                {item.title}
                              </span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 leading-snug">
                              {item.sub}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />

            {/* User */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer p-1 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {initials}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">{activeUserName}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400 capitalize">{activeUserRole.replace('_', ' ')}</p>
                </div>
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-150 dark:border-slate-700 py-1 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{activeUserName}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 capitalize">{activeUserRole.replace('_', ' ')}</p>
                  </div>
                  <button 
                    onClick={() => {
                      handleNav('/secret-provision');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} /> Super Provisioning
                  </button>
                  <button 
                    onClick={() => {
                      handleNav('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Settings size={14} className="text-slate-400" /> Settings
                  </button>
                  <button 
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="print:overflow-visible print:h-auto flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900 pb-[calc(2.5rem+env(safe-area-inset-bottom,16px))]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
