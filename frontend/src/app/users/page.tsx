'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { userService } from '@/services/user';
import { authService } from '@/services/auth';
import { User, Role } from '@/types';
import {
  Users,
  Shield,
  Code,
  Briefcase,
  UserCheck,
  Trash,
  Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // inline edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('Client');
  const [savingId, setSavingId] = useState<string | null>(null);

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
        return <Shield className="w-5 h-5 text-red-400" />;
      case 'ProjectManager':
        return <Briefcase className="w-5 h-5 text-blue-400" />;
      case 'Developer':
        return <Code className="w-5 h-5 text-green-400" />;
      case 'Client':
        return <UserCheck className="w-5 h-5 text-purple-400" />;
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

  // start edit
  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
  };

  // cancel edit
  const cancelEdit = () => {
    setEditingUserId(null);
  };

  // save role change
  const saveRole = async (userId: string) => {
    try {
      setSavingId(userId);
      const updated = await userService.update(userId, { role: selectedRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      toast.success('Role updated');
      setEditingUserId(null);
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
    } finally {
      setSavingId(null);
    }
  };

  // delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      setSavingId(userId);
      await userService.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    } finally {
      setSavingId(null);
    }
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-6 pl-6 pb-8"
      >
        {/* Simple Header (kept minimal per request) */}
        <div>
          <h1 className="text-3xl font-extrabold text-white">Users</h1>
          <p className="text-slate-400 mt-1">Manage system users and their roles</p>
        </div>

        {/* Top Stats - glossy cards to match AdminDashboard style */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { label: 'Total Users', value: stats.total, icon: <Users className="h-8 w-8 text-gray-200" /> },
            { label: 'Admins', value: stats.admins, icon: <Shield className="h-8 w-8 text-red-300" /> },
            { label: 'Managers', value: stats.managers, icon: <Briefcase className="h-8 w-8 text-blue-300" /> },
            { label: 'Developers', value: stats.developers, icon: <Code className="h-8 w-8 text-green-300" /> },
            { label: 'Clients', value: stats.clients, icon: <UserCheck className="h-8 w-8 text-purple-300" /> },
          ].map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.35 }}
              className="bg-linear-to-r from-slate-800/70 to-slate-900/50 text-white p-5 rounded-2xl shadow-lg border border-white/6 hover:shadow-2xl hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg">{card.icon}</div>
                <div>
                  <p className="text-sm text-slate-300">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Users Table */}
        {users.length > 0 ? (
          <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/55 to-slate-900/40 backdrop-blur-md overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100">All Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/60">
                  <tr>
                    {['User', 'Role', 'Tasks Assigned', 'Actions'].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <span className="text-gray-200 font-medium text-sm">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-slate-400">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* {getRoleIcon(user.role)} */}
                          {editingUserId === user.id ? (
                            <select
                              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value as Role)}
                              disabled={savingId === user.id}
                            >
                              <option value="Admin">Admin</option>
                              <option value="ProjectManager">Project Manager</option>
                              <option value="Developer">Developer</option>
                              <option value="Client">Client</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.taskIds.length || 0} tasks</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => saveRole(user.id)}
                              disabled={savingId === user.id}
                              className="text-emerald-300 hover:text-emerald-200 transition-colors"
                            >
                              {savingId === user.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingId === user.id}
                              className="text-slate-300 hover:text-slate-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => startEdit(user)}
                              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              disabled={savingId === user.id}
                              className="flex items-center gap-2 text-red-300 hover:text-red-200 transition-colors"
                            >
                              <Trash className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Users className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-2 text-sm font-medium">No users</h3>
            <p className="mt-1 text-sm text-slate-500">No users found in the system.</p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
