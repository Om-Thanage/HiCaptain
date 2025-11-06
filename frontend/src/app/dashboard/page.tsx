'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import ProjectManagerDashboard from '@/components/dashboard/ProjectManagerDashboard';
import DeveloperDashboard from '@/components/dashboard/DeveloperDashboard';
import ClientDashboard from '@/components/dashboard/ClientDashboard';
import { authService } from '@/services/auth';
import { User } from '@/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = authService.getUserFromToken();
    setUser(u);
  }, []);

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'Admin':
        return 'Admin Dashboard';
      case 'ProjectManager':
        return 'Project Manager Dashboard';
      case 'Developer':
        return 'Developer Dashboard';
      case 'Client':
        return 'Client Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getDashboardDescription = () => {
    switch (user?.role) {
      case 'Admin':
        return 'Manage users, projects, and system overview';
      case 'ProjectManager':
        return 'Oversee projects, manage teams, and track progress';
      case 'Developer':
        return 'View assigned tasks, track time, and manage your work';
      case 'Client':
        return 'Monitor project progress, review deliverables, and provide feedback';
      default:
        return 'Welcome to HiCaptain';
    }
  };

  const renderDashboardContent = () => {
    if (!user) {
      return (
        <div className="text-center py-12">
          <p className="text-slate-400">Please log in to access your dashboard.</p>
        </div>
      );
    }

    switch (user.role) {
      case 'Admin':
        return <AdminDashboard user={user} />;
      case 'ProjectManager':
        return <ProjectManagerDashboard user={user} />;
      case 'Developer':
        return <DeveloperDashboard />;
      case 'Client':
        return <ClientDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-slate-400">Unknown user role.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {renderDashboardContent()}
      </div>
    </DashboardLayout>
  );
}
