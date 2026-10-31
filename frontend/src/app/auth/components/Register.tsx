'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import SocialSignIn from './SocialSignIn';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        email: data.email,
        password: data.password,
        organizationName: data.organizationName,
      };

      const session = await authService.register(userData);
      authService.setToken(session.token);
      setToken(session.token);
      toast.success('Your organization is ready');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>


      {/* RIGHT SIDE – FORM */}
      

          <h2 className="text-2xl font-semibold text-center text-white mb-6">
            Create your account
          </h2>
          <p className="text-sm text-slate-400 mb-6">We&apos;ll create a username from your email. Change it anytime in Settings.</p>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="register-components-field-1">Email</label>
              <input id="register-components-field-1"
                {...register('email', { required: 'Email is required' })}
                type="text"
                className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="register-components-field-2">Password</label>
              <div className="relative">
                <input id="register-components-field-2"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="register-components-field-3">
                Confirm Password
              </label>
              <div className="relative">
                <input id="register-components-field-3"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="register-components-field-4">Organization name</label>
              <input id="register-components-field-4" {...register('organizationName', { required: 'Organization name is required' })}
                className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Your team or company" />
              {errors.organizationName && <p className="mt-1 text-sm text-red-400">{errors.organizationName.message}</p>}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2 px-4 rounded-md text-sm font-medium text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </motion.button>
          </form>

          <SocialSignIn />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm text-slate-400"
          >
            Already have an account?{' '}
            <button
              onClick={() => router.push('/auth?mode=login')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Sign In
            </button>
          </motion.div>
    </div>
  );
}
