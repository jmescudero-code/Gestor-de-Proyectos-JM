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
  const { user, loading } = useAuth();
  
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
      <div className="flex bg-brand-gray min-h-screen font-sans text-gray-900">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'projects' && <ProjectList />}
          {currentView === 'gantt' && <Gantt />}
          {currentView === 'revision' && <WeeklyReview />}
          {currentView === 'decisions' && <DecisionsView />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'imports' && <Imports />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'trash' && <TrashBin />}
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

