/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StoreProvider } from './store/StoreContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { Gantt } from './components/Gantt';
import { WeeklyReview } from './components/WeeklyReview';
import { DecisionsView } from './components/DecisionsView';
import { Reports } from './components/Reports';
import { Imports } from './components/Imports';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginScreen, PendingApprovalScreen } from './components/LoginScreen';
import { UsersView } from './components/UsersView';
import { TrashBin } from './components/TrashBin';

const MainLayout = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [displayedView, setDisplayedView] = useState('dashboard');
  const [transitioning, setTransitioning] = useState(false);
  const { user, loading } = useAuth();
  
  const handleViewChange = (newView: string) => {
    if (newView === displayedView || transitioning) return;
    setTransitioning(true);
    setCurrentView(newView);
    
    // Halfway through the transition, swap the actual component
    setTimeout(() => {
      setDisplayedView(newView);
      // Wait a tiny bit for render, then fade out
      setTimeout(() => {
        setTransitioning(false);
      }, 50);
    }, 250); // 250ms fade in
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-gray text-gray-500 font-medium">Verificando sesión...</div>;
  }
  
  if (!user) {
     return <LoginScreen />;
  }

  if (user.appRole === 'pending' || !user.isActive) {
     return <PendingApprovalScreen />;
  }

  return (
    <StoreProvider>
      <div className="flex bg-brand-gray min-h-screen font-sans text-gray-900 relative">
        <Sidebar currentView={currentView} setCurrentView={handleViewChange} />
        
        {/* Page Transition Overlay */}
        <div 
           className={`fixed inset-0 z-[100] bg-brand-gray/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300 pointer-events-none ${transitioning ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className={`transform transition-all duration-300 ease-out flex items-center justify-center ${transitioning ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-45 opacity-0'}`}>
            <svg className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] opacity-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aura-grad-1-trans" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="aura-grad-2-trans" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" stroke="url(#aura-grad-1-trans)" strokeWidth="6" strokeLinecap="round" strokeDasharray="180 60" transform="rotate(-45 50 50)" />
              <circle cx="50" cy="50" r="32" stroke="url(#aura-grad-2-trans)" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="140 80" transform="rotate(65 50 50)" />
              <circle cx="50" cy="50" r="24" stroke="url(#aura-grad-1-trans)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="90 70" transform="rotate(180 50 50)" />
              <path d="M43 60 L50 38 L57 60 M45.5 53 L54.5 53" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
          {displayedView === 'dashboard' && <Dashboard />}
          {displayedView === 'projects' && <ProjectList />}
          {displayedView === 'gantt' && <Gantt />}
          {displayedView === 'revision' && <WeeklyReview />}
          {displayedView === 'decisions' && <DecisionsView />}
          {displayedView === 'reports' && <Reports />}
          {displayedView === 'imports' && <Imports />}
          {displayedView === 'users' && <UsersView />}
          {displayedView === 'trash' && <TrashBin />}
        </main>
      </div>
    </StoreProvider>
  );
};

export default function App() {
   return (
      <AuthProvider>
         <MainLayout />
      </AuthProvider>
   );
}

