'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { AuthRequest } from '@/types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setToken } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<AuthRequest>();

  const onSubmit = async (data: AuthRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      authService.setToken(response.token);
      setToken(response.token);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Sign in to your account
      </h2>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Email</label>
          <input
            {...register('email', { required: 'Email is required' })}
            type="text"
            className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter your email"
          />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Password</label>
          <div className="relative">
            <input
              {...register('password', { required: 'Password is required' })}
              type={showPassword ? 'text' : 'password'}
              className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-slate-400" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-2 px-4 rounded-md text-sm font-medium text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </>
          )}
        </motion.button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <button
          onClick={() => router.push('/auth?mode=register')}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Create one
        </button>
      </p>
    </>
  );
}
