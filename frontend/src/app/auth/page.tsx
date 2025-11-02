'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import logo from '../../../public/logo.png';
import Login from './components/Login';
import Register from './components/Register';
import { CheckCircle } from 'lucide-react';

// Extract the search params usage into a child wrapped by Suspense
function AuthPageContent() {
  const params = useSearchParams();
  const mode = params.get('mode');

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 relative overflow-hidden">
      {/* Background gloss */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl z-0" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" />

      {/* LEFT – Feature Section */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="flex flex-col justify-center items-start px-8 md:px-16 py-16 text-white z-10 md:w-1/2"
      >
        <div className="flex items-center space-x-3 mb-8">
          <Image src={logo} alt="HiCaptain Logo" width={60} height={60} className="rounded-2xl" />
          <h1 className="text-3xl font-extrabold tracking-tight">HiCaptain</h1>
        </div>

        <h2 className="text-4xl font-bold mb-4 leading-tight">
          Manage your <span className="text-blue-400">Projects</span> Effortlessly
        </h2>
        <p className="text-slate-300 mb-8">
          Collaborate, assign tasks, and streamline your workflow with modern project management.
        </p>

        <ul className="space-y-4 text-slate-200">
          {[
            'Organize your team with ease',
            'Assign and track project tasks',
            'Collaborate in real-time',
            'Beautiful analytics and dashboards',
          ].map((feature, i) => (
            <motion.li
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3"
            >
              <CheckCircle className="text-blue-400 w-5 h-5" />
              <span>{feature}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* RIGHT – Dynamic Form */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="flex justify-center items-center md:w-1/2 w-full px-6 py-12 z-10"
      >
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
          {mode === 'login' ? <Login /> : <Register />}
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
