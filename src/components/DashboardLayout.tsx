import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header Bar */}
      <Navbar />

      <div className="flex flex-1 relative">
        {/* Left Nav Pane */}
        <Sidebar />

        {/* Main Content Pane */}
        <main className="flex-1 md:pl-64 min-w-0 p-6 md:p-8 animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
