/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Sun,
  Moon,
  Info,
  Calendar,
  Sparkles,
  Key
} from 'lucide-react';
import { User as UserType } from '../types';

interface SettingsViewProps {
  user: UserType;
  onUpdatePreferences: (updates: { name?: string; theme?: 'light' | 'dark'; accentColor?: string; autoDeleteTrashDays?: number }) => Promise<void>;
  onUpdatePassword: (passwordData: any) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onImportBackup: (backupData: any) => Promise<void>;
}

export default function SettingsView({
  user,
  onUpdatePreferences,
  onUpdatePassword,
  onDeleteAccount,
  onImportBackup
}: SettingsViewProps) {
  // Preferences State
  const [name, setName] = useState(user.name);
  const [theme, setTheme] = useState(user.preferences.theme);
  const [accentColor, setAccentColor] = useState(user.preferences.accentColor);
  const [autoDeleteTrashDays, setAutoDeleteTrashDays] = useState(user.preferences.autoDeleteTrashDays || 30);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI Status State
  const [prefStatus, setPrefStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [loadingPref, setLoadingPref] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPref(true);
    setPrefStatus(null);

    try {
      await onUpdatePreferences({
        name: name.trim(),
        theme,
        accentColor,
        autoDeleteTrashDays: Number(autoDeleteTrashDays)
      });
      setPrefStatus({ type: 'success', message: 'Preferences updated successfully!' });
    } catch (err: any) {
      setPrefStatus({ type: 'error', message: err.message || 'Failed to update preferences' });
    } finally {
      setLoadingPref(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassStatus({ type: 'error', message: 'All password fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setLoadingPass(true);
    setPassStatus(null);

    try {
      await onUpdatePassword({ currentPassword, newPassword });
      setPassStatus({ type: 'success', message: 'Password has been successfully changed!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassStatus({ type: 'error', message: err.message || 'Failed to update password' });
    } finally {
      setLoadingPass(false);
    }
  };

  const handleDeleteAccountClick = async () => {
    const doubleConfirm = confirm(
      'CRITICAL WARNING!\n\nAre you absolutely sure you want to permanently delete your Flash Card Studio account?\n\nThis will instantly delete ALL your custom categories, study sessions, and flash cards. This action is irreversible.'
    );

    if (doubleConfirm) {
      setLoadingDelete(true);
      try {
        await onDeleteAccount();
      } catch (err: any) {
        alert(err.message || 'Failed to delete account');
        setLoadingDelete(false);
      }
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch('/api/profile/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: 'Failed to export backup file' });
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);
    setBackupStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        const confirmRestore = confirm(
          'IMPORTANT RESTORE NOTICE!\n\nImporting this backup will overwrite your current deck of categories, study logs, and cards with the backup file data.\n\nDo you want to continue?'
        );

        if (confirmRestore) {
          await onImportBackup(backupData);
          setBackupStatus({ type: 'success', message: 'Backup restored successfully! Refreshing decks...' });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err: any) {
        setBackupStatus({ type: 'error', message: err.message || 'Invalid backup file structure' });
      } finally {
        setLoadingImport(false);
        // Reset file input target
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in select-none selection:bg-indigo-500 selection:text-white" id="settings-root">
      
      {/* SECTION HEADER */}
      <div id="settings-header">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Profile & Preferences</h1>
        <p className="text-slate-400 mt-1 text-sm">Update account information, application behaviors, and export flash card backups.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="settings-grid">
        
        {/* LEFT TWO COLUMNS: forms */}
        <div className="lg:col-span-2 space-y-6" id="settings-forms-pane">
          
          {/* Form 1: General Preferences */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
              <User className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-800">Account Preferences</h2>
            </div>

            {prefStatus && (
              <div className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                prefStatus.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-100 text-rose-700'
              }`}>
                <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{prefStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePreferences} className="space-y-4" id="settings-pref-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Email Address (Read-only)</label>
                  <input 
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-4 py-2.5 bg-slate-100/70 border border-slate-100 rounded-xl text-slate-400 text-sm outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Theme Preset</label>
                  <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        theme === 'light' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Auto-delete Trash Days</label>
                  <select
                    value={autoDeleteTrashDays}
                    onChange={(e) => setAutoDeleteTrashDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value={7}>7 Days Retention</option>
                    <option value={14}>14 Days Retention</option>
                    <option value={30}>30 Days Retention</option>
                    <option value={90}>90 Days Retention</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end" id="settings-pref-actions">
                <button
                  type="submit"
                  disabled={loadingPref}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingPref ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
              <Lock className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-800">Change Password</h2>
            </div>

            {passStatus && (
              <div className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                passStatus.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-100 text-rose-700'
              }`}>
                <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{passStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4" id="settings-pass-form">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Current Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end" id="settings-pass-actions">
                <button
                  type="submit"
                  disabled={loadingPass}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  {loadingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Backups & Dangerous Zone */}
        <div className="space-y-6" id="settings-backup-pane">
          
          {/* Backup Tools */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Backup & Data Portability</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Your data is completely private. You can export or import your entire deck, categories, and review history instantly.
              </p>

              {backupStatus && (
                <div className={`mb-4 p-3 rounded-xl text-[10px] leading-normal font-medium ${
                  backupStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {backupStatus.message}
                </div>
              )}

              <div className="space-y-2.5">
                {/* Export Card */}
                <button
                  onClick={handleExportData}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Export Data Backup
                </button>

                {/* Import Box */}
                <div className="relative">
                  <input
                    type="file"
                    id="import-backup-file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={loadingImport}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    {loadingImport ? 'Importing...' : 'Import Data Backup'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 mt-6 text-[10px] font-medium text-slate-400 flex items-center gap-1.5 shrink-0">
              <Info className="w-3.5 h-3.5" />
              <span>Restores overwrite current decks.</span>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Danger Zone
            </h3>
            <p className="text-xs text-rose-600/75 leading-relaxed mb-6">
              Deletions are absolute. Once your profile is removed, all your flash cards and scores are cleared forever.
            </p>

            <button
              onClick={handleDeleteAccountClick}
              disabled={loadingDelete}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-100 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {loadingDelete ? 'Deleting Profile...' : 'Delete Account Forever'}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
