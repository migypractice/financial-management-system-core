import React, { useState, useEffect } from 'react';
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
import SimulatorPage from './pages/Simulator/SimulatorPage';
import AuditLogPage from './pages/AuditLog/AuditLogPage';
import SettingsPage from './pages/Settings/SettingsPage';


import { useAuth } from './context/AuthContext';
import LoginPage from './pages/Auth/LoginPage';
import MpinPage from './pages/Auth/MpinPage';
import { ShieldAlert } from 'lucide-react';

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
  | '/simulator'
  | '/audit-logs'
  | '/settings'
;

export const App: React.FC = () => {
  const [activePath, setActivePath] = useState<AppRoute>('/dashboard');
  const [isMpinVerified, setIsMpinVerified] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const { isAuthenticated, isLoading, logout } = useAuth();

  // Reset MPIN verification whenever the user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setIsMpinVerified(false);
    }
  }, [isAuthenticated]);

  // Session Timeout Logic (3 minutes total: 2.5m idle + 30s warning)
  useEffect(() => {
    if (!isAuthenticated || !isMpinVerified) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let countdownInterval: ReturnType<typeof setInterval>;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      clearInterval(countdownInterval);
      setShowTimeoutWarning(false);
      setCountdown(30);

      // Trigger warning after 2.5 minutes (150,000 ms) of inactivity
      idleTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
        
        // Start 30 second live countdown
        countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setShowTimeoutWarning(false);
              setCountdown(30);
              setIsMpinVerified(false); // Screen Lock instead of full logout
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, 150000); // 2.5 mins
    };

    // Attach listeners for any user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer);
      clearInterval(countdownInterval);
    };
  }, [isAuthenticated, isMpinVerified, logout]);

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

  // Show MPIN verification after successful login, before allowing access
  if (!isMpinVerified) {
    return <MpinPage onSuccess={() => setIsMpinVerified(true)} />;
  }

  const renderPage = () => {
    switch (activePath) {
      case '/dashboard':
        return <DashboardPage onNavigate={(path) => setActivePath(path as AppRoute)} />;
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
      case '/simulator':
        return <SimulatorPage />;
      case '/audit-logs':
        return <AuditLogPage />;
      case '/settings':
        return <SettingsPage />;

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
    <>
      <DashboardLayout activePath={activePath} onNavigate={(path) => setActivePath(path as AppRoute)}>
        <div key={activePath} className="h-full animate-fadeIn">
          {renderPage()}
        </div>
      </DashboardLayout>

      {/* Session Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 p-6 max-w-sm w-full mx-4 text-center animate-fadeIn">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Screen Lock Warning</h3>
            <p className="text-sm text-slate-500 mb-6">
              For your security, your screen will automatically lock due to inactivity in:
            </p>
            <div className="text-4xl font-black text-red-600 mb-6">
              00:{countdown.toString().padStart(2, '0')}
            </div>
            <button
              onClick={() => {
                setShowTimeoutWarning(false);
                setCountdown(30);
                // The global event listeners will automatically reset the timer
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Keep Session Active
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
