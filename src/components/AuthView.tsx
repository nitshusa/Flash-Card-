/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Key, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../supabase';

interface AuthViewProps {
  onAuthSuccess: (token: string, user: UserType) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

// Bridge Supabase user and Profile DB table
const getProfileAndUser = async (sbUser: any): Promise<UserType> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sbUser.id)
    .maybeSingle();

  if (error || !profile) {
    const fallbackProfile = {
      id: sbUser.id,
      name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
      theme: 'light',
      accent_color: '#6366f1',
      auto_delete_trash_days: 30
    };
    try {
      await supabase.from('profiles').insert([fallbackProfile]);
    } catch (e) {
      console.warn('Profile insert fallback failed or already exists', e);
    }
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      name: fallbackProfile.name,
      preferences: {
        theme: fallbackProfile.theme as 'light' | 'dark',
        accentColor: fallbackProfile.accent_color,
        autoDeleteTrashDays: fallbackProfile.auto_delete_trash_days
      },
      createdAt: sbUser.created_at || new Date().toISOString()
    };
  }

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: profile.name || sbUser.user_metadata?.name || 'User',
    preferences: {
      theme: (profile.theme || 'light') as 'light' | 'dark',
      accentColor: profile.accent_color || '#6366f1',
      autoDeleteTrashDays: profile.auto_delete_trash_days || 30
    },
    createdAt: profile.created_at || sbUser.created_at || new Date().toISOString()
  };
};

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [resetPin, setResetPin] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  // Development helpers
  const [devResetPin, setDevResetPin] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  // Live password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 10) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9!@#$%^&*]/.test(password)) score += 25;
    setPasswordStrength(score);
  }, [password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sbError) throw sbError;
      if (!data.user) throw new Error('Failed to retrieve user session');

      const user = await getProfileAndUser(data.user);
      onAuthSuccess('', user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (sbError) throw sbError;
      if (!data.user) throw new Error('Registration failed');

      if (data.session) {
        const user = await getProfileAndUser(data.user);
        onAuthSuccess('', user);
      } else {
        setSuccess('Signup successful! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    setError(null);
    setDevResetPin(null);

    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#mode=reset`
      });

      if (sbError) throw sbError;

      setSuccess('Reset link and code sent to your email!');
      setTimeout(() => {
        setMode('reset');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !resetPin || !password) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify OTP token (recovery)
      const { data, error: sbError } = await supabase.auth.verifyOtp({
        email,
        token: resetPin,
        type: 'recovery'
      });

      if (sbError) throw sbError;
      if (!data.user) throw new Error('Verification failed');

      // 2. Set new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess('Password reset successful! Logging you in...');
      const user = await getProfileAndUser(data.user);
      setTimeout(() => {
        onAuthSuccess('', user);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full animate-painting-bg flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden" id="auth-root">
      {/* 5-sec disappearing welcome message */}
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-full pl-2.5 pr-6 py-2 flex items-center gap-4.5 z-50 scale-105 md:scale-110"
          id="welcome-toast"
        >
          <img 
            src="/src/assets/images/nish_avatar_1782933234487.jpg" 
            alt="Nish" 
            className="w-11 h-11 rounded-full object-cover border-2 border-indigo-100 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="text-left leading-tight">
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Welcome to</span>
            <span className="text-sm md:text-base font-black text-slate-800">Nish Flash Studio ✨</span>
          </div>
        </motion.div>
      )}

      <div className="w-full max-w-md relative z-10" id="auth-card-container">
        
        {/* Brand Header */}
        <div className="text-center mb-8" id="auth-brand-header">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 mb-3" id="brand-logo-icon">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight animate-fire-text" id="brand-title">Nish Flash Studio</h1>
          <p className="text-slate-600 font-medium mt-2 text-sm" id="brand-tagline">Study efficiently, memorize permanently.</p>
        </div>

        {/* Auth Box Card */}
        <motion.div 
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-100 p-8 relative overflow-hidden" 
          id="auth-form-card"
        >
          {/* Active indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600" id="gradient-bar"></div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-3"
              id="auth-error-box"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-3"
              id="auth-success-box"
            >
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{success}</p>
                {devResetPin && (
                  <p className="mt-1 bg-emerald-100 text-emerald-900 font-mono px-2 py-0.5 rounded text-[10px] inline-block select-all">
                    Reset PIN: {devResetPin} (Dev Only)
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Form Content */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5" id="login-form">
              <h2 className="text-xl font-bold text-slate-800" id="login-header">Sign In</h2>
              
              <div className="space-y-1.5" id="login-email-group">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="login-email"
                    type="email" 
                    required 
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5" id="login-pass-group">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-600">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                    id="login-forgot-btn"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="login-password"
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    id="login-pass-toggle"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center" id="login-remember-group">
                <input 
                  id="login-remember"
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="login-remember" className="ml-2.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>

              <button 
                id="login-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="pt-2 text-center border-t border-slate-100" id="login-footer">
                <p className="text-xs text-slate-500">
                  New to Flash Card Studio?{' '}
                  <button 
                    type="button" 
                    onClick={() => setMode('signup')}
                    className="font-bold text-indigo-600 hover:text-indigo-700"
                    id="login-goto-signup"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4" id="signup-form">
              <h2 className="text-xl font-bold text-slate-800" id="signup-header">Create Account</h2>

              <div className="space-y-1.5" id="signup-name-group">
                <label className="text-xs font-semibold text-slate-600">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="signup-name"
                    type="text" 
                    required 
                    placeholder="Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5" id="signup-email-group">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="signup-email"
                    type="email" 
                    required 
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5" id="signup-pass-group">
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    id="signup-pass-toggle"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Strength indicator */}
                {password && (
                  <div className="pt-1.5 space-y-1" id="pass-strength-bar">
                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span className="text-slate-500">Password Strength:</span>
                      <span className={
                        passwordStrength <= 25 ? 'text-rose-500' :
                        passwordStrength <= 50 ? 'text-amber-500' :
                        passwordStrength <= 75 ? 'text-indigo-500' : 'text-emerald-500'
                      }>
                        {passwordStrength <= 25 ? 'Weak' :
                         passwordStrength <= 50 ? 'Medium' :
                         passwordStrength <= 75 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength > 0 ? 'bg-rose-500' : ''}`} style={{ width: '25%' }}></div>
                      <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength > 25 ? 'bg-amber-500' : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                      <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength > 50 ? 'bg-indigo-500' : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                      <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength > 75 ? 'bg-emerald-500' : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5" id="signup-confirm-group">
                <label className="text-xs font-semibold text-slate-600">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="signup-confirm"
                    type="password" 
                    required 
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                id="signup-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Get Started'}
              </button>

              <div className="pt-2 text-center border-t border-slate-100" id="signup-footer">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => setMode('login')}
                    className="font-bold text-indigo-600 hover:text-indigo-700"
                    id="signup-goto-login"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-5" id="forgot-form">
              <div className="flex items-center gap-2 mb-2" id="forgot-header-row">
                <button 
                  type="button" 
                  onClick={() => setMode('login')}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
                  id="forgot-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-slate-800">Forgot Password</h2>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your email address and we will generate a 6-digit reset PIN. 
                Enter this PIN on the next screen to choose a new password.
              </p>

              <div className="space-y-1.5" id="forgot-email-group">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="forgot-email"
                    type="email" 
                    required 
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                id="forgot-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Generating PIN...' : 'Generate Reset PIN'}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4" id="reset-form">
              <div className="flex items-center gap-2 mb-2" id="reset-header-row">
                <button 
                  type="button" 
                  onClick={() => setMode('forgot')}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
                  id="reset-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-slate-800">Choose New Password</h2>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                We generated a PIN for <strong className="text-slate-700">{email}</strong>. 
                Please enter the 6-digit PIN and choose a new secure password.
              </p>

              <div className="space-y-1.5" id="reset-pin-group">
                <label className="text-xs font-semibold text-slate-600">6-Digit Reset PIN</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="reset-pin"
                    type="text" 
                    required 
                    maxLength={6}
                    placeholder="123456"
                    value={resetPin}
                    onChange={(e) => setResetPin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm tracking-widest font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5" id="reset-pass-group">
                <label className="text-xs font-semibold text-slate-600">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    id="reset-pass-toggle"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5" id="reset-confirm-group">
                <label className="text-xs font-semibold text-slate-600">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    id="reset-confirm"
                    type="password" 
                    required 
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                id="reset-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center disabled:opacity-50 mt-2"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
