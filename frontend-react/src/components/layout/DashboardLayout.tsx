import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  userRole?: string;
  userName?: string;
}

/**
 * Global Dashboard Layout Component
 * Includes fixed dark navy left sidebar (bg-slate-900),
 * clean top navbar (bg-white), and light gray canvas area (bg-slate-50).
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activePath = '/approvals',
  userRole = 'Finance Manager',
  userName = 'Alex Mercer',
}) => {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* 1. Left Sidebar - Fixed Full Height */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between h-full shadow-lg z-20 shrink-0">
        <div>
          {/* Logo & System Title Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-extrabold text-sm shadow-md">
              FC
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-sm">FIN-CORE</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Transaction Engine</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-xs font-medium">
            <a
              href="#dashboard"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                activePath === '/dashboard'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Overview Dashboard
            </a>
            <a
              href="#approvals"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors ${
                activePath === '/approvals'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡ AI Approvals (Maker-Checker)</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full font-bold">1 Flagged</span>
            </a>
            <a
              href="#general-ledger"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                activePath === '/gl'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              📖 General Ledger (GL)
            </a>
            <a
              href="#disbursements"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                activePath === '/disbursements'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              💸 Outbound Disbursements
            </a>
            <a
              href="#reports"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                activePath === '/reports'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              📈 Financial Reports
            </a>
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-600">
              AM
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{userName}</p>
              <p className="text-[10px] text-slate-400">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Right Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="w-72">
            <input
              type="text"
              placeholder="Search transactions, reference IDs, or GL codes..."
              className="w-full text-xs px-3.5 py-2 rounded-lg bg-slate-100 border border-gray-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ISO 25010 Transaction Engine Active
            </span>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
