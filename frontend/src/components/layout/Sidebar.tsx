import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Box,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  // Exactly the 4 required primary navigation sections
  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    {
      label: 'Simulation Console',
      to: '/simulation',
      icon: Cpu,
      subtext: 'Wearable Stand-in',
      highlight: true,
    },
    {
      label: 'Digital Twin',
      to: '/twin',
      icon: Box,
      subtext: 'Living 3D Model',
    },
    {
      label: 'Observations',
      to: '/observations',
      icon: ListOrdered,
      subtext: 'Serial History',
    },
  ];

  return (
    <aside
      className={`border-r border-theme bg-surface flex flex-col justify-between transition-all duration-200 z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted ${collapsed ? 'hidden' : 'block'}`}>
          Core Workflow
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-accent-subtle accent-color font-bold border border-accent shadow-xs'
                    : 'text-text-secondary hover:text-text hover:bg-surface-secondary'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <div className="truncate">
                    <span className="truncate">{item.label}</span>
                    {item.subtext && (
                      <span className="block text-[10px] text-text-muted -mt-0.5 font-normal truncate">
                        {item.subtext}
                      </span>
                    )}
                  </div>
                  {item.highlight && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-theme hidden md:block">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 px-2 rounded-xl border border-theme text-text-secondary hover:text-text hover:bg-surface-secondary text-xs transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-medium">Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
