'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { userService } from '@/services/user';
import { authService } from '@/services/auth';
import { User } from '@/types';
import { Users, Shield, Code, Briefcase, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCurrentUser(authService.getUserFromToken());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (currentUser?.role !== 'Admin') {
      toast.error('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    const fetchUsers = async () => {
      try {
        const data = await userService.getAll();
        setUsers(data);
      } catch (error) {
        toast.error('Failed to fetch users');
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser, hydrated]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Shield className="w-5 h-5 text-red-500" />;
      case 'ProjectManager':
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      case 'Developer':
        return <Code className="w-5 h-5 text-green-500" />;
      case 'Client':
        return <UserCheck className="w-5 h-5 text-purple-500" />;
      default:
        return <Users className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'text-red-400 bg-red-900/30';
      case 'ProjectManager':
        return 'text-blue-400 bg-blue-900/30';
      case 'Developer':
        return 'text-green-400 bg-green-900/30';
      case 'Client':
        return 'text-purple-400 bg-purple-900/30';
      default:
        return 'text-gray-400 bg-gray-800/50';
    }
  };

  const getRoleStats = () => {
    const stats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: users.length,
      admins: stats.Admin || 0,
      managers: stats.ProjectManager || 0,
      developers: stats.Developer || 0,
      clients: stats.Client || 0,
    };
  };

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-gray-300">
          <Shield className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">You need admin privileges to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = getRoleStats();

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-black min-h-screen p-6 text-gray-200 transition-colors duration-300">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-2">Manage system users and their roles</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { label: 'Total Users', value: stats.total, icon: <Users className="h-8 w-8 text-gray-300" /> },
            { label: 'Admins', value: stats.admins, icon: <Shield className="h-8 w-8 text-red-400" /> },
            { label: 'Managers', value: stats.managers, icon: <Briefcase className="h-8 w-8 text-blue-400" /> },
            { label: 'Developers', value: stats.developers, icon: <Code className="h-8 w-8 text-green-400" /> },
            { label: 'Clients', value: stats.clients, icon: <UserCheck className="h-8 w-8 text-purple-400" /> },
          ].map((card, index) => (
            <div
              key={index}
              className="bg-zinc-900 rounded-xl shadow-md border border-zinc-800 p-6 hover:shadow-lg hover:border-zinc-700 hover:bg-zinc-800/70 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="shrink-0">{card.icon}</div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        {users.length > 0 ? (
          <div className="bg-zinc-900 rounded-xl shadow-md border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">All Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-800/70">
                  <tr>
                    {['User', 'Role', 'Tasks Assigned', 'Actions'].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-800/60 transition-all duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-gray-200 font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(user.role)}
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.taskIds.length || 0} tasks
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-400 hover:text-blue-300 mr-4 transition-colors">
                          Edit
                        </button>
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Users className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium">No users</h3>
            <p className="mt-1 text-sm text-gray-500">No users found in the system.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
