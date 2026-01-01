import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Heart, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    globalRole: string;
    phone?: string;
    avatarUrl?: string;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      isPrimary: boolean;
    }>;
  };
  token: string;
  expiresIn: number;
}

export default function Login() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', data);
      
      if (response.success && response.data) {
        login(
          response.data.user,
          response.data.token,
          '' // No refresh token in prototype
        );
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error(t('common:errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | Shelter Link</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Heart className="h-10 w-10 text-white" />
              <span className="text-3xl font-bold text-white">Shelter Link</span>
            </div>
          </div>
          
          <h2 className="mt-6 text-center text-xl text-primary-100">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@shelter.org"
                />
                {errors.email && (
                  <p className="error-text">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="error-text">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-slate-700"
                  >
                    Remember me
                  </label>
                </div>

                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Demo credentials notice */}
            <div className="mt-6 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 text-center">
                <strong>Demo:</strong> demo@shelter.org / password123
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-primary-200">
            Need an account?{' '}
            <a
              href="mailto:support@shelterlink.org"
              className="font-medium text-white hover:text-primary-100"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
