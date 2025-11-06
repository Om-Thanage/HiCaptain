'use client';

import { motion } from 'framer-motion';
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
  LogOut,
} from 'lucide-react';
import { authService } from '@/services/auth';

// Function to define navigation items by role
const getNavigationByRole = (role: string) => {
  const baseNavigation = [{ name: 'Dashboard', href: '/dashboard', icon: Home }];

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
  const user = authService.getUserFromToken();
  const role = user?.role || '';

  const navigation = getNavigationByRole(role);

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      className="
        relative top-1/2 left-6
        w-20 h-full 
        bg-slate-800/70 backdrop-blur-xl 
        border border-slate-700/40 
        shadow-xl rounded-3xl 
        flex flex-col items-center justify-between 
        py-6 z-40 my-4
      "
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <img
          src="/logo.png"
          alt="HiCaptain logo"
          width={50}
          height={50}
          className="object-contain shadow-md"
        />
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col space-y-3 mt-6">
        {navigation.map((item, i) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              initial={{ scale: 0, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 100 }}
            >
              <Link
                href={item.href}
                className={`
                  flex items-center justify-center 
                  w-12 h-12 rounded-full 
                  transition-all duration-200 
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/40'
                    : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/60 hover:text-white'}
                  group relative
                `}
              >
                <motion.div whileHover={{ scale: 1.2 }}>
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className="absolute left-16 bg-slate-900 text-slate-100 px-2 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-slate-700">
                  {item.name}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Logout */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleLogout}
        className="
          flex items-center justify-center 
          w-12 h-12 rounded-full 
          bg-red-900/20 text-red-400 
          hover:bg-red-900/40 hover:text-red-300 
          transition-all duration-200 group relative
          mt-3
        "
      >
        <LogOut className="w-5 h-5" />
        <span className="absolute left-16 bg-slate-900 text-slate-100 px-2 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-slate-700">
          Logout
        </span>
      </motion.button>
    </motion.div>
  );
}
