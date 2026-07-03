import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Lock, User, CheckCircle, AlertCircle, KeyRound, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, sendPasswordOtp } = useAuth();

  // General profile states
  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Status alerts
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const success = await updateProfile({ name, company, title, bio, avatar });
      if (success) {
        setProfileSuccess('Profile details updated successfully.');
      } else {
        setProfileError('Failed to update details.');
      }
    } catch (err) {
      setProfileError('An unexpected error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!user) return;
    setOtpLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const res = await sendPasswordOtp(user.email);
      if (res.success) {
        setOtpSent(true);
        setPasswordSuccess('OTP code sent successfully to your email address.');
      } else {
        setPasswordError(res.msg);
      }
    } catch (err) {
      setPasswordError('Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('Please input a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!otp) {
      setPasswordError('Please input the received OTP validation code.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword({
        email: user?.email,
        newPassword,
        otp
      });

      if (res.success) {
        setPasswordSuccess('Account security credentials updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
        setOtpSent(false);
      } else {
        setPasswordError(res.msg);
      }
    } catch (err) {
      setPasswordError('Failed to verify OTP or change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form: Profile Settings */}
      <div className="lg:col-span-7">
        <form onSubmit={handleUpdateProfile} className="rounded-2xl glass p-6 border border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="h-5.5 w-5.5 text-brand-400" /> Account Settings
            </h2>
            <p className="text-xs text-dark-400 mt-1">Configure your personal information and profile details.</p>
          </div>

          {profileSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4.5 w-4.5 shrink-0" /> {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {profileError}
            </div>
          )}

          <div className="space-y-4">
            {/* Name / Email row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Registered Email (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-lg border border-white/5 bg-dark-950 p-2.5 text-xs text-dark-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Avatar Image Link</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Title / Company row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Professional Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Principal Software Engineer"
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Company / Institution</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. CodeScreen Inc."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Bio textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Short Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share credentials, coding preferences, or experience..."
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="w-full flex justify-center items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-semibold text-white shadow-lg transition-colors"
          >
            {profileLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <><Save className="h-4.5 w-4.5" /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Right Form: Password Reset */}
      <div className="lg:col-span-5">
        <form onSubmit={handleChangePassword} className="rounded-2xl glass p-6 border border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="h-5.5 w-5.5 text-brand-400" /> Account Security
            </h2>
            <p className="text-xs text-dark-400 mt-1">Change credentials and request OTP validation codes.</p>
          </div>

          {passwordSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4.5 w-4.5 shrink-0" /> {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {passwordError}
            </div>
          )}

          <div className="space-y-4">
            {!otpSent ? (
              <div className="space-y-3">
                <p className="text-xs text-dark-400 leading-normal">
                  To update your security password, first generate an OTP authentication token. A 6-digit code will be sent to your registered email.
                </p>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="w-full flex justify-center items-center gap-1.5 rounded-xl border border-brand-500/25 hover:border-brand-500 bg-brand-500/5 hover:bg-brand-500/10 py-3 text-xs font-semibold text-brand-400 transition-all duration-200"
                >
                  {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-4 w-4" /> Send Verification Code</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Enter OTP Code</label>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full rounded-lg border border-brand-500/40 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="flex-1 py-3 rounded-xl border border-white/5 hover:border-white/10 text-xs text-dark-300 hover:text-white bg-white/5"
                  >
                    Resend Code
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-semibold text-white shadow-lg transition-colors"
                  >
                    {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
