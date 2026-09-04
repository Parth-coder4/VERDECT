import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ComplianceProvider } from './context/ComplianceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { TopNavBar } from './components/common/TopNavBar';
import { SideNavBar } from './components/common/SideNavBar';
import { MobileNavDrawer } from './components/common/MobileNavDrawer';
import { MobileBottomBar } from './components/common/MobileBottomBar';

// Lazy-loaded pages for optimal bundle chunking and memory efficiency
const OverviewPage = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then(m => ({ default: m.ScanPage })));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const ViolationsPage = lazy(() => import('./pages/ViolationsPage').then(m => ({ default: m.ViolationsPage })));
const RegistryPage = lazy(() => import('./pages/RegistryPage').then(m => ({ default: m.RegistryPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const PerformancePage = lazy(() => import('./pages/PerformancePage').then(m => ({ default: m.PerformancePage })));
const CounterfeitPage = lazy(() => import('./pages/CounterfeitPage').then(m => ({ default: m.CounterfeitPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));

// Admin Panel Lazy-loaded
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminOversightPage = lazy(() => import('./pages/admin/AdminOversightPage').then(m => ({ default: m.AdminOversightPage })));
const AdminRulebookPage = lazy(() => import('./pages/admin/AdminRulebookPage').then(m => ({ default: m.AdminRulebookPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage').then(m => ({ default: m.AdminLogsPage })));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] h-full w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono text-on-surface-variant">Loading module...</span>
    </div>
  </div>
);

// Field Portal Shell Wrapper with Mobile Navigation Integration
const FieldPortalShell: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#070D19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop Persistent Sidebar */}
      <SideNavBar />

      {/* Mobile Slide-Out Drawer */}
      <MobileNavDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top App Bar with Mobile Hamburger Trigger */}
        <TopNavBar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />

        {/* Main Scrollable Content Container (pb-20 on mobile to clear bottom nav) */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 bg-[#F8FAFC] dark:bg-[#070D19] transition-colors duration-200">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/overview" element={<Navigate to="/" replace />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/counterfeit" element={<CounterfeitPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/analysis/:id" element={<AnalysisPage />} />
              <Route path="/violations" element={<ViolationsPage />} />
              <Route path="/registry" element={<RegistryPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/archives" element={<Navigate to="/history" replace />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/support" element={<SupportPage />} />
              {/* Redirections for admin routes */}
              <Route path="/rulebook" element={<Navigate to="/admin/rulebook" replace />} />
              <Route path="/users" element={<Navigate to="/admin/oversight" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <MobileBottomBar onOpenDrawer={() => setMobileDrawerOpen(true)} />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ComplianceProvider>
          <Router>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Dual Login & Registration Page */}
                <Route path="/login" element={<LoginPage />} />

                {/* Dedicated Administration Panel Routes (Protected for Administrators) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOversightPage />} />
                  <Route path="oversight" element={<AdminOversightPage />} />
                  <Route path="rulebook" element={<AdminRulebookPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="logs" element={<AdminLogsPage />} />
                  <Route path="*" element={<Navigate to="/admin/oversight" replace />} />
                </Route>

                {/* Field Inspector Portal Layout (Protected for Authenticated Users) */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <FieldPortalShell />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </Router>
        </ComplianceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
