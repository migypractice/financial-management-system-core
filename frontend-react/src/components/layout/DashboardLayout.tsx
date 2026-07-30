import React, { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, BookOpen, CreditCard, DollarSign,
  Send, Inbox, PieChart, Landmark, BarChart2, Receipt,
  Bell, Mail, ChevronDown, Search, Menu, LogOut, Settings, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  userRole?: string;
  userName?: string;
  onNavigate?: (path: string) => void;
}

const navItems = [
  { path: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
  { path: '/approvals',     label: 'AI Approvals',        icon: CheckSquare,    badge: '3' },
  { path: '/gl',            label: 'General Ledger',      icon: BookOpen },
  { path: '/ap',            label: 'Accounts Payable',    icon: CreditCard },
  { path: '/ar',            label: 'Accounts Receivable', icon: DollarSign },
  { path: '/disbursements', label: 'Disbursement',        icon: Send },
  { path: '/collections',  label: 'Collections',          icon: Inbox },
  { path: '/budget',        label: 'Budget',              icon: PieChart },
  { path: '/cash',          label: 'Cash Management',     icon: Landmark },
  { path: '/reports',       label: 'Financial Reports',   icon: BarChart2 },
  { path: '/tax',           label: 'Tax Management',      icon: Receipt },

];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activePath = '/dashboard',
  userRole = 'Scatter gods',
  userName = 'Rexseme Rebot',
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { logout, user } = useAuth();

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
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col h-full shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '72px' : '220px',
          background: 'linear-gradient(180deg, #1e2d4a 0%, #162038 100%)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-xs"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            FC
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-tight leading-none">FIN-CORE</p>
              <p className="text-blue-300/70 text-[10px] mt-0.5 tracking-wider uppercase">Transaction Engine</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 text-left group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
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
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50">
                  <Settings size={14} /> Settings
                </button>
                <button 
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Menu size={18} />
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions, GL codes..."
                className="pl-8 pr-4 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all w-72"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Mail */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500">
              <Mail size={16} />
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 bg-blue-600 text-white text-[9px] rounded-full font-bold">2</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-800">{activeUserName}</p>
                <p className="text-[10px] text-gray-400">{activeUserRole}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
