import React, { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import ApprovalsPage from './pages/Approvals/ApprovalsPage';
import GeneralLedgerPage from './pages/GeneralLedger/GeneralLedgerPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'/approvals' | '/gl'>('/approvals');

  return (
    <DashboardLayout activePath={activeTab}>
      <div className="p-4 bg-slate-100 border-b border-slate-200 flex gap-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('/approvals')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === '/approvals' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          ⚡ Maker-Checker AI Approvals
        </button>
        <button
          onClick={() => setActiveTab('/gl')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === '/gl' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          📖 Chart of Accounts (GL)
        </button>
      </div>

      {activeTab === '/approvals' ? <ApprovalsPage /> : <GeneralLedgerPage />}
    </DashboardLayout>
  );
};

export default App;
