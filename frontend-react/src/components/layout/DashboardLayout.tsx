import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, CheckSquare, BookOpen, CreditCard, DollarSign,
  Send, Inbox, PieChart, Landmark, BarChart2, Receipt, ShieldCheck,
  Bell, Mail, ChevronDown, Menu, LogOut, Settings, ChevronLeft, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

const navItems: NavItem[] = [
  { path: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
  { path: '/approvals',     label: 'AI Approvals',        icon: CheckSquare },
  { path: '/gl',            label: 'General Ledger',      icon: BookOpen },
  { path: '/ap',            label: 'Accounts Payable',    icon: CreditCard },
  { path: '/ar',            label: 'Accounts Receivable', icon: DollarSign },
  { path: '/disbursements', label: 'Disbursement',        icon: Send },
  { path: '/collections',  label: 'Collections',          icon: Inbox },
  { path: '/budget',        label: 'Budget',              icon: PieChart },
  { path: '/cash',          label: 'Cash Management',     icon: Landmark },
  { path: '/reports',       label: 'Financial Reports',   icon: BarChart2 },
  { path: '/tax',           label: 'Tax Management',      icon: Receipt },
  { path: '/audit-logs',    label: 'Audit Trail',         icon: ShieldCheck },
  { path: '/simulator',     label: 'M2M Simulator',       icon: Settings },
];

const representativeNotifications = [
  { id: 1, title: 'Transaction Flagged', desc: 'AI flagged TXN-2026-8801. Awaiting manager review.', time: '2 min ago', type: 'alert', action: 'View Approvals', path: '/approvals' },
  { id: 2, title: 'GL Aggregation', desc: 'Daily SQL aggregation completed successfully.', time: '1 hr ago', type: 'info' },
  { id: 3, title: 'System Update', desc: 'M2M Simulator v1.0 deployed to staging environment.', time: '3 hrs ago', type: 'info' },
];

const representativeMessages = [
  { id: 1, sender: 'Supply Chain Team', subject: 'M2M Integration Sync', preview: 'We updated the API keys for the outbound simulator. Please check the documentation when you have a moment.', time: '10:30 AM' },
  { id: 2, sender: 'System Admin', subject: 'Scheduled Maintenance', preview: 'The analytics DB will be paused tonight for indexing. Core transactions will not be affected.', time: 'Yesterday' },
];


export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activePath = '/dashboard',
  userRole = 'System User',
  userName = 'User',
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  
  const headerRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`print:hidden fixed md:relative flex flex-col h-full shrink-0 transition-all duration-300 z-50 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          width: collapsed ? '72px' : '220px',
          background: 'linear-gradient(180deg, #1e2d4a 0%, #162038 100%)',
        }}
      >
        {/* Brand — Archon Nell Logo */}
        <div className="px-3 py-3 border-b border-white/10">
          {collapsed ? (
            <div className="w-10 h-10 shrink-0 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden mx-auto">
              <img src="/archon-nell-logo.png" alt="Archon Nell Incorporated" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-16 rounded-lg bg-white shadow-sm overflow-hidden">
              <img
                src="/archon-nell-logo.png"
                alt="Archon Nell Incorporated"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 47%' }}
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                style={isActive ? { background: 'linear-gradient(135deg, #4f46e5, #2563eb)' } : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left group relative ${
                  isActive
                    ? 'text-white shadow-md shadow-blue-900/30'
                    : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && (
                  <span className="text-[13px] font-medium truncate flex-1">{item.label}</span>
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

        {/* Collapse toggle + user */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-blue-200/60 hover:bg-white/10 hover:text-white transition-all text-[13px] font-medium"
          >
            <ChevronLeft size={16} className={`shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* User profile */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-white text-xs font-semibold truncate">{activeUserName}</p>
                    <p className="text-blue-300/60 text-[10px] truncate">{activeUserRole}</p>
                  </div>
                  <ChevronDown size={13} className="text-blue-300/60 shrink-0" />
                </>
              )}
            </button>
            {userMenuOpen && !collapsed && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <Settings size={14} /> Settings
                </button>
                <button 
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Build Info (Hidden for now) */}
          {/*
          {!collapsed && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className="text-[9px] text-blue-300/40 text-center leading-relaxed">
                Hardware ERP &middot; Version 1.0.0-RC1<br/>
                Laravel 12 &middot; React 19 &middot; TypeScript<br/>
                Build July 30, 2026
              </p>
            </div>
          )}
          */}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="print:block print:h-auto flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <header className="print:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3" ref={headerRef}>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>

              {notificationsOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h3>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600">3 New</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50">
                    {representativeNotifications.map(n => (
                      <div key={n.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-snug">{n.desc}</p>
                            <div className="flex items-center justify-between mt-2">
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

            {/* Mail */}
            <div className="relative">
              <button 
                onClick={toggleMail}
                aria-label="Messages"
                aria-expanded={mailOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-500 dark:text-slate-300"
              >
                <Mail size={16} />
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 bg-blue-600 text-white text-[9px] rounded-full font-bold">2</span>
              </button>

              {mailOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Messages</h3>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600">2 Unread</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50">
                    {representativeMessages.map(m => (
                      <button 
                        key={m.id} 
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" 
                        onClick={() => setMailOpen(false)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{m.sender}</p>
                          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 shrink-0 ml-2">{m.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{m.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">{m.preview}</p>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <button 
                      onClick={() => setMailOpen(false)}
                      className="w-full py-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      View all messages
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">{activeUserName}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-400">{activeUserRole}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 dark:text-slate-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="print:overflow-visible print:h-auto flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
