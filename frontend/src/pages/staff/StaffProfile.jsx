import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { GoldButton } from '../../components/admin/SystemUI';

const fieldClassName = 'w-full bg-black/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all';

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const buildProfileImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';

  const trimmedPath = imagePath.trim();
  if (!trimmedPath) return '';

  if (/^https?:\/\//i.test(trimmedPath)) return trimmedPath;

  // For any non-http path from the DB, prepend backend base URL explicitly.
  return trimmedPath.startsWith('/')
    ? `${BACKEND_BASE_URL}${trimmedPath}`
    : `${BACKEND_BASE_URL}/${trimmedPath}`;
};

const getFirstInitial = (name = '') => {
  const firstCharacter = name.trim().charAt(0).toUpperCase();
  return firstCharacter || 'S';
};

function StaffProfile() {
  const storedUserRaw = localStorage.getItem('user');
  const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};

  const fullName = storedUser.name || 'Staff Member';
  const email = storedUser.email || 'staff@salondees.com';
  const regularShift = storedUser.workingHours || '09:00 AM - 05:00 PM';
  const imageUrl = buildProfileImageUrl(storedUser.image || storedUser.imageUrl || storedUser.profileImage);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  console.log('Image URL:', imageUrl);

  const specialtyItems = (() => {
    if (Array.isArray(storedUser.specialty)) return storedUser.specialty;
    if (typeof storedUser.specialty === 'string' && storedUser.specialty.trim()) {
      return storedUser.specialty
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return ['Hair Stylist'];
  })();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const handlePasswordChange = (event) => {
    setPasswordData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPassword((previous) => ({
      ...previous,
      [fieldName]: !previous[fieldName]
    }));
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    toast.success('Password update request is ready to submit.');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="mx-auto h-full w-full max-w-7xl overflow-y-hidden">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md lg:p-5">
        <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-serif text-white lg:text-3xl">Staff Profile</h1>
            <p className="mt-1 text-xs text-gray-400 lg:text-sm">
              Manage your profile details, shift information, and account security settings.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
            Staff
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md lg:col-span-2">
              <div className="flex flex-col items-center text-center">
                {imageUrl && !imageLoadFailed ? (
                  <img
                    src={imageUrl}
                    alt={`${fullName} profile`}
                    className="h-20 w-20 rounded-full border border-[#d4af37]/30 object-cover shadow-[0_0_20px_rgba(212,175,55,0.25)] lg:h-24 lg:w-24"
                    onError={() => setImageLoadFailed(true)}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#d4af37] text-2xl font-serif text-black shadow-[0_0_20px_rgba(212,175,55,0.35)] lg:h-24 lg:w-24 lg:text-3xl">
                    {getFirstInitial(fullName)}
                  </div>
                )}
                <h2 className="mt-3 text-xl font-serif text-white lg:mt-4 lg:text-2xl">{fullName}</h2>
                <p className="mt-1 text-xs text-gray-400 lg:text-sm">Staff Account</p>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Email</p>
                  <p className="mt-1 text-sm break-all text-gray-200">{email}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Regular Shift</p>
                  <p className="mt-1 text-sm text-gray-200">{regularShift}</p>
                </div>
              </div>
            </div>

            <div className="grid h-full min-h-0 grid-rows-2 gap-4 lg:col-span-3">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-serif text-[#d4af37]">Profile Details</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Full Name</p>
                    <p className="mt-1.5 text-sm text-white">{fullName}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Email Address</p>
                    <div className="relative mt-1.5">
                      <input type="email" value={email} readOnly className={`${fieldClassName} pr-11 opacity-90`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37]">
                        <FaLock size={14} />
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Specialty</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {specialtyItems.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#d4af37]"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Regular Shift</p>
                    <p className="mt-1.5 text-sm text-white">{regularShift}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-serif text-[#d4af37]">Change Password</h3>
                <p className="mt-1 text-xs text-gray-400 lg:text-sm">
                  Use a strong password and keep your account protected.
                </p>

                <form onSubmit={handlePasswordSubmit} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type={showPassword.currentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Current Password"
                      className={`${fieldClassName} pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37] transition-colors hover:text-yellow-400"
                      aria-label={showPassword.currentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showPassword.currentPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword.newPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="New Password"
                      className={`${fieldClassName} pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37] transition-colors hover:text-yellow-400"
                      aria-label={showPassword.newPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showPassword.newPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>

                  <div className="relative md:col-span-2">
                    <input
                      type={showPassword.confirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm New Password"
                      className={`${fieldClassName} pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37] transition-colors hover:text-yellow-400"
                      aria-label={showPassword.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showPassword.confirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>

                  <div className="md:col-span-2">
                    <GoldButton type="submit" className="w-full rounded-lg py-2.5 text-xs font-bold uppercase tracking-[0.12em] lg:text-sm">
                      Update Password
                    </GoldButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffProfile;
