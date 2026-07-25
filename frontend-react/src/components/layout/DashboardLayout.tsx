import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  userRole?: string;
  userName?: string;
  onNavigate?: (path: string) => void;
}

/**
 * Global Dashboard Layout
 *
 * Structure: Fixed left sidebar (dark navy) + top bar (white) + scrollable content area.
 * Uses clean text labels with subtle colored indicators instead of emojis.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activePath = '/dashboard',
  userRole = 'Finance Manager',
  userName = 'Alex Mercer',
  onNavigate,
}) => {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
    { path: '/dashboard', label: 'Overview Dashboard', badge: null },
    { path: '/approvals', label: 'AI Approvals', badge: '1' },
    { path: '/gl', label: 'General Ledger', badge: null },
    { path: '/ap', label: 'Accounts Payable', badge: null },
    { path: '/ar', label: 'Accounts Receivable', badge: null },
    { path: '/disbursements', label: 'Disbursement Mgmt', badge: null },
    { path: '/collections', label: 'Collection Mgmt', badge: null },
    { path: '/budget', label: 'Budget Management', badge: null },
    { path: '/cash', label: 'Cash Management', badge: null },
    { path: '/reports', label: 'Financial Reports', badge: null },
    { path: '/tax', label: 'Tax Management', badge: null },
  ];

  const handleNav = (path: string) => {
    if (onNavigate) onNavigate(path);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between h-full shrink-0">
        {/* Brand header */}
        <div>
          <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-extrabold text-sm">
              FC
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-sm">FIN-CORE</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Transaction Engine</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-0.5 text-[13px] font-medium overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            {navItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center border border-slate-600">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="w-72">
            <input
              type="text"
              placeholder="Search transactions, GL codes..."
              className="w-full text-xs px-3.5 py-2 rounded-lg bg-slate-100 border border-gray-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System Active
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
