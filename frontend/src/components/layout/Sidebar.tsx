'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  FolderKanban, 
  BarChart3, 
  FileText, 
  MessageCircle, 
  Calendar, 
  GitBranch, 
  Bell, 
  Settings, 
  Users,
  LogOut 
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';

// Define navigation items by role
const getNavigationByRole = (role: string) => {
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
  ];

  switch (role) {
    case 'Admin':
      return [
        ...baseNavigation,
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Feedback', href: '/feedback', icon: MessageCircle },
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Git', href: '/git', icon: GitBranch },
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
      ];
    
    case 'ProjectManager':
      return [
        ...baseNavigation,
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Feedback', href: '/feedback', icon: MessageCircle },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Git', href: '/git', icon: GitBranch },
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
      ];
    
    case 'Developer':
      return [
        ...baseNavigation,
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Git', href: '/git', icon: GitBranch },
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
      ];
    
    case 'Client':
      return [
        ...baseNavigation,
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Feedback', href: '/feedback', icon: MessageCircle },
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
      ];
    
    default:
      return baseNavigation;
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const handleLogout = () => {
    authService.logout();
  };

  // Get navigation items based on user role
  const navigation = getNavigationByRole(user?.role || '');

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 z-40">
      {/* Logo */}
      <div className="mb-8">
        <img src="/logo.png" alt="HiCaptain logo" width={60} height={60} className="object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-slate-700 group relative
                ${isActive ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="absolute left-16 bg-slate-900 text-slate-100 px-2 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-slate-700">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="flex flex-col space-y-2">
        {user && (
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-700 group relative">
            <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="absolute left-16 bg-slate-900 text-slate-100 px-2 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-slate-700">
              {user.name} ({user.role})
            </span>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-12 h-12 rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-900/20 hover:text-red-400 group relative"
        >
          <LogOut className="w-5 h-5" />
          <span className="absolute left-16 bg-slate-900 text-slate-100 px-2 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-slate-700">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}