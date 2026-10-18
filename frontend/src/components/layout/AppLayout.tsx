import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ResearchNotice } from '../common/ResearchNotice';
import { api } from '../../api/client';
import { usePatient } from '../../context/PatientContext';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { selectedPatientId } = usePatient();
  const location = useLocation();

  useEffect(() => {
    // Fetch unread alerts count
    const fetchAlerts = async () => {
      try {
        const alerts = await api.getAlerts(selectedPatientId, undefined, false);
        setUnreadCount(alerts.length);
      } catch (e) {
        // quiet fallback
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-secondary text-text transition-colors duration-150">
      <ResearchNotice />
      <TopBar
        onToggleSidebar={() => setMobileOpen(!mobileOpen)}
        unreadAlertCount={unreadCount}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            unreadAlertCount={unreadCount}
          />
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 bg-surface h-full shadow-2xl flex flex-col z-10">
              <Sidebar
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                unreadAlertCount={unreadCount}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
