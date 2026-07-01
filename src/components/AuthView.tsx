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
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  // Development helpers
  const [devResetPin, setDevResetPin] = useState<string | null>(null);
  const [isDirectRecovery, setIsDirectRecovery] = useState(false);

  // Automatically detect PASSWORD_RECOVERY event from Supabase email recovery link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsDirectRecovery(true);
        setMode('reset');
        setSuccess('✓ Verified recovery link from email! Enter your new password below.');
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    const checkRecoveryHash = () => {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(hash.replace(/^#/, '?'));
      const type = params.get('type');
      const accessToken = params.get('access_token');
      
      if (type === 'recovery' || accessToken) {
        setIsDirectRecovery(true);
        setMode('reset');
        setSuccess('✓ Detected secure password reset link! Enter your new password below.');
      }
    };
    checkRecoveryHash();
    window.addEventListener('hashchange', checkRecoveryHash);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', checkRecoveryHash);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (mode !== 'forgot') {
      setForgotEmailSent(false);
    }
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

    const isDemoEmail = email.toLowerCase().includes('demo') || email.toLowerCase().includes('test');

    try {
      if (isDemoEmail) {
        // Generate a simulated 6-digit pin
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        setDevResetPin(pin);
        setSuccess('Demo Mode: Generated simulated reset PIN below. (No actual email sent)');
        setTimeout(() => {
          setMode('reset');
          setResetPin(pin);
        }, 2000);
        return;
      }

      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#mode=reset`
      });

      if (sbError) throw sbError;

      setSuccess('Recovery link sent successfully! Check your inbox.');
      setForgotEmailSent(true);
    } catch (err: any) {
      const isSmtpError = err.message?.toLowerCase().includes('smtp') || 
                          err.message?.toLowerCase().includes('provider') ||
                          err.message?.toLowerCase().includes('rate limit');
      
      if (isSmtpError) {
        setError(`${err.message}. TIP: Try using "demo@test.com" as email to run a fully simulated password reset without email setup!`);
      } else {
        setError(err.message || 'Failed to process request');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For direct recovery, resetPin is not required
    if (!isDirectRecovery && (!email || !resetPin || !password)) {
      setError('All fields are required');
      return;
    }
    
    if (isDirectRecovery && !password) {
      setError('Please enter a new password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isDirectRecovery) {
        // Direct recovery means they clicked the email recovery link and are already authenticated.
        // We can update their password directly!
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) throw updateError;

        // Retrieve the current user profile info
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) throw new Error('Could not retrieve updated user profile');

        setSuccess('Password updated successfully! Logging you in...');
        const user = await getProfileAndUser(sbUser);
        setTimeout(() => {
          onAuthSuccess('', user);
        }, 2000);
        return;
      }

      // If we are in simulated/demo bypass mode
      if (devResetPin && resetPin === devResetPin) {
        setSuccess('Password reset successfully simulated! Logging you in...');
        
        try {
          // Attempt a soft sign up if user doesn't exist, so they can keep working on Supabase
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: email.split('@')[0] } }
          });
          if (!signUpError && data.user) {
            const user = await getProfileAndUser(data.user);
            setTimeout(() => {
              onAuthSuccess('', user);
            }, 2000);
            return;
          }
        } catch (simErr) {
          // Ignore signup errors during simulated bypass
        }

        // Fallback simulated user
        const mockUser: UserType = {
          id: 'demo-user-id',
          email: email,
          name: email.split('@')[0],
          preferences: {
            theme: 'light',
            accentColor: '#6366f1',
            autoDeleteTrashDays: 30
          },
          createdAt: new Date().toISOString()
        };
        setTimeout(() => {
          onAuthSuccess('', mockUser);
        }, 2000);
        return;
      }

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
            src="https://lh3.googleusercontent.com/pw/AP1GczMIb1aIcumXBEPFCTE5nVrhKqBzA38eug0xpXjb5e-BMVLp50qMwmGFxxLa14RSJcTQ0y22KVHFKxhhvSiDn04Zv20vTu4D2jyULfKkEwJYGoR4ZjRlj6NZA92Xxqsef6gMgeV0a739J45pOwAsIi-IQQ=w651-h869-s-no-gm" 
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
            forgotEmailSent ? (
              <div className="space-y-6" id="forgot-email-sent-card">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-pulse">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Check Your Email</h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    We've sent a secure password recovery link to <strong className="text-slate-700">{email}</strong>.
                  </p>
                </div>

                {/* Crucial troubleshooting info for localhost:3000 error */}
                <div className="p-4 bg-amber-50/75 border border-amber-200/80 rounded-2xl space-y-3 shadow-sm text-xs text-amber-900 leading-relaxed">
                  <span className="font-extrabold text-amber-800 flex items-center gap-1.5">
                    ⚠️ Getting a "localhost" error when clicking the link?
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium">
                    This happens because Supabase projects default to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-800">localhost:3000</code>. Since this app runs in a secure cloud container, follow these steps to bypass this error instantly:
                  </p>
                  <ol className="text-[11px] text-slate-600 font-medium list-decimal pl-4.5 space-y-1.5">
                    <li>
                      <strong>Right-click</strong> the "Reset password" button in the email and select <strong>Copy Link Address</strong>.
                    </li>
                    <li>
                      <strong>Paste</strong> that link into your browser's address bar (don't press enter yet).
                    </li>
                    <li>
                      <strong>Change</strong> <code className="bg-amber-100 text-amber-900 px-1 font-mono font-bold">http://localhost:3000</code> at the beginning of the pasted link to your real app URL:
                      <div className="mt-1.5 bg-white border border-slate-200 p-2.5 rounded-xl text-indigo-600 font-mono text-[10px] select-all break-all shadow-sm font-bold leading-normal">
                        https://ais-dev-cq252cz5b5fsqfbn526hkf-195805702959.asia-east1.run.app
                      </div>
                    </li>
                    <li>
                      Press <strong>Enter</strong> to open the link. The app will immediately verify the token and open the new password form!
                    </li>
                  </ol>
                </div>

                <div className="pt-2 text-center border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setForgotEmailSent(false);
                      setMode('login');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
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
                  Enter your email address to receive a secure password recovery link. 
                  Clicking the link will automatically authenticate you to choose a new password instantly!
                </p>

                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-950 leading-relaxed space-y-2">
                  <span className="font-extrabold text-indigo-700 flex items-center gap-1">💡 Sandbox Testing Guide</span>
                  <p className="text-[11px] text-slate-600">
                    • **For Live Verification**: Clicking the recovery link sent to your inbox will log you in and auto-unlock the password update form.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    • **For Instant Demo Bypass**: Enter any email with <code className="bg-indigo-100/80 px-1 py-0.5 rounded font-black text-indigo-700 font-mono">demo</code> or <code className="bg-indigo-100/80 px-1 py-0.5 rounded font-black text-indigo-700 font-mono">test</code> (e.g. <span className="font-semibold underline text-slate-800">demo@test.com</span>) to automatically simulate password reset and auto-authenticate!
                  </p>
                </div>

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
                  {loading ? 'Sending Link...' : 'Send Recovery Link'}
                </button>
              </form>
            )
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

              {isDirectRecovery ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium" id="direct-recovery-success-badge">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>✓ Recovery link verified successfully! Set your password below.</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  We generated a PIN for <strong className="text-slate-700">{email}</strong>. 
                  Please enter the 6-digit PIN and choose a new secure password.
                </p>
              )}

              {!isDirectRecovery && (
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
              )}

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
