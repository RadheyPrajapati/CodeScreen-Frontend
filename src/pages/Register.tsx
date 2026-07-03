import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'candidate' | 'interviewer'>('candidate');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name) {
      setError('Name is required.');
      return false;
    }
    if (!email) {
      setError('Email is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await register({ name, email, password, role });
      if (res.success) {
        setSuccess('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(res.msg);
      }
    } catch (err) {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl glass p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-extrabold text-xl shadow-lg shadow-brand-500/20">
            CS
          </div>
          <h2 className="mt-6 font-sans text-3xl font-bold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-dark-400">
            Join CodeScreen to access live code assessments
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 animate-fade-in">
            {success}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Role selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-2 block">
              I want to sign up as a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                  role === 'candidate'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-white/5 bg-dark-900/60 text-dark-400 hover:border-white/10 hover:text-white'
                }`}
              >
                Candidate / Applicant
              </button>
              <button
                type="button"
                onClick={() => setRole('interviewer')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                  role === 'interviewer'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-white/5 bg-dark-900/60 text-dark-400 hover:border-white/10 hover:text-white'
                }`}
              >
                Interviewer / Company
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-md shadow-sm">
            {/* Full Name */}
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="full-name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="relative block w-full rounded-xl border border-white/5 bg-dark-900/60 py-3 pl-10 pr-3 text-white placeholder-dark-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  placeholder="Full Name"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="relative block w-full rounded-xl border border-white/5 bg-dark-900/60 py-3 pl-10 pr-3 text-white placeholder-dark-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full rounded-xl border border-white/5 bg-dark-900/60 py-3 pl-10 pr-10 text-white placeholder-dark-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  placeholder="Choose Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="relative block w-full rounded-xl border border-white/5 bg-dark-900/60 py-3 pl-10 pr-3 text-white placeholder-dark-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  placeholder="Confirm Password"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 px-4 text-sm font-semibold text-white hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-dark-950 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-brand-600/20"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  Create Account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-dark-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
