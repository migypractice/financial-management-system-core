import React, { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ApprovalsPage from './pages/Approvals/ApprovalsPage';
import GeneralLedgerPage from './pages/GeneralLedger/GeneralLedgerPage';
import AccountsPayablePage from './pages/AccountsPayable/AccountsPayablePage';
import AccountsReceivablePage from './pages/AccountsReceivable/AccountsReceivablePage';
import DisbursementPage from './pages/Disbursement/DisbursementPage';
import CollectionPage from './pages/Collection/CollectionPage';
import BudgetPage from './pages/Budget/BudgetPage';
import CashManagementPage from './pages/Cash/CashManagementPage';
import ReportsPage from './pages/Reports/ReportsPage';
import TaxManagementPage from './pages/Tax/TaxManagementPage';


import { useAuth } from './context/AuthContext';
import LoginPage from './pages/Auth/LoginPage';

type AppRoute = 
  | '/dashboard' 
  | '/approvals' 
  | '/gl' 
  | '/ap' 
  | '/ar' 
  | '/disbursements' 
  | '/collections' 
  | '/budget' 
  | '/cash' 
  | '/reports' 
  | '/tax'
;

export const App: React.FC = () => {
  const [activePath, setActivePath] = useState<AppRoute>('/dashboard');
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-indigo-600 font-semibold text-lg">Loading System...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setActivePath('/dashboard')} />;
  }

  const renderPage = () => {
    switch (activePath) {
      case '/dashboard':
        return <DashboardPage />;
      case '/approvals':
        return <ApprovalsPage />;
      case '/gl':
        return <GeneralLedgerPage />;
      case '/ap':
        return <AccountsPayablePage />;
      case '/ar':
        return <AccountsReceivablePage />;
      case '/disbursements':
        return <DisbursementPage />;
      case '/collections':
        return <CollectionPage />;
      case '/budget':
        return <BudgetPage />;
      case '/cash':
        return <CashManagementPage />;
      case '/reports':
        return <ReportsPage />;
      case '/tax':
        return <TaxManagementPage />;

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700">Page Not Found</p>
              <p className="text-sm text-slate-400 mt-1">Please select a valid module from the sidebar.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout activePath={activePath} onNavigate={(path) => setActivePath(path as AppRoute)}>
      {renderPage()}
    </DashboardLayout>
  );
};

export default App;
