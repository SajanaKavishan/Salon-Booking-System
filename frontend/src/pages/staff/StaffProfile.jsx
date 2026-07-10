import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; 
import { X } from 'lucide-react';
import BACKEND_BASE_URL from '../../utils/apiConfig';
import { getStoredSession } from '../../utils/auth';

const formLabelClassName = 'text-xs font-bold uppercase leading-5 tracking-[0.12em] text-gray-400';
const formValueClassName = 'mt-2 text-base leading-6 text-white';
const formInputClassName = 'mt-2 w-full bg-transparent pb-2 text-base font-medium leading-6 text-white outline-none border-b border-[#D4AF37]/40 transition focus:border-[#D4AF37]';

const formatWorkingHours = (workingHours) => {
  if (!workingHours) return '';
  if (typeof workingHours === 'string') return workingHours;
  if (typeof workingHours === 'object') {
    const start = workingHours.start || '';
    const end = workingHours.end || '';
    if (start && end) return `${start} - ${end}`;
    return start || end;
  }
  return '';
};

function StaffProfile({ onClose }) {
  const photoInputRef = useRef(null);

  const [user, setUser] = useState(() => {
    return getStoredSession()?.user || {};
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);

  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Password Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const normalizeOffDaysForDisplay = (offDays) => {
      if (!offDays) return '';
      if (Array.isArray(offDays)) return offDays.join(', ');
      if (typeof offDays === 'string') return offDays;
      return '';
    };

    const controller = new AbortController();

    const fetchStaffData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(`${BACKEND_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        if (response.data) {
          const dbData = response.data;
          const mergedData = {
            ...dbData,
            specialty: dbData.specialty || dbData.staffDetails?.specialty || '',
            workingHours: formatWorkingHours(dbData.workingHours || dbData.staffDetails?.workingHours),
            offDays: normalizeOffDaysForDisplay(dbData.offDays || dbData.staffDetails?.offDays),
            profileImage: dbData.profileImage || dbData.imageUrl || dbData.staffDetails?.imageUrl || ''
          };

          setUser(mergedData);
          setProfileImage(mergedData.profileImage);

          setFormValues({
            name: mergedData.name || '',
            email: mergedData.email || '',
            phone: mergedData.phone || ''
          });
        }
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'CanceledError') return;
        console.error('Error fetching staff details:', error);
      }
    };

    fetchStaffData();

    return () => {
      controller.abort();
    };
  }, []);

  const displayName = user?.name || 'Staff Member';
  const displayEmail = user?.email || 'No Email Provided';
  const displayPhone = user?.phone || 'Not Provided';

  const handleClose = () => {
    if (typeof onClose === 'function') onClose();
  };

  const handlePhotoClick = () => photoInputRef.current?.click();

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      setProfileImage(imageUrl);
      setProfileImageFile(file);
      if (!isEditing) setIsEditing(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const initials = useMemo(() => {
    const name = (isEditing ? formValues.name : displayName).trim() || '';
    if (!name || name === 'Staff Member') return 'S';
    return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [displayName, formValues.name, isEditing]);

  const updateField = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const isDirty = useMemo(() => {
    if (!isEditing) return false;

    const normalize = (value) => String(value || '').trim();

    return (
      normalize(formValues.name) !== normalize(user?.name)
      || normalize(formValues.email) !== normalize(user?.email)
      || normalize(formValues.phone) !== normalize(user?.phone)
      || Boolean(profileImageFile)
      || normalize(profileImage) !== normalize(user?.profileImage)
    );
  }, [formValues, isEditing, profileImage, profileImageFile, user]);

  const resetForm = () => {
    setFormValues({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setProfileImage(user?.profileImage || '');
    setProfileImageFile(null);
    setIsEditing(false);
  };

  const saveDetails = async () => {
    if (!isDirty || isSaving) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Please log in again.');

      const updatedUser = {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim()
      };

      const payload = new FormData();
      payload.append('name', updatedUser.name);
      payload.append('email', updatedUser.email);
      payload.append('phone', updatedUser.phone);
      if (profileImageFile) {
        payload.append('profileImage', profileImageFile);
      }

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        const mergedResponse = {
          ...user,
          ...response.data,
          specialty: response.data.specialty || response.data.staffDetails?.specialty || user?.specialty || '',
          workingHours: formatWorkingHours(response.data.workingHours || response.data.staffDetails?.workingHours || user?.workingHours),
          offDays: Array.isArray(response.data.offDays) ? response.data.offDays.join(', ') : response.data.offDays || user?.offDays || '',
          profileImage: response.data.profileImage || response.data.imageUrl || response.data.staffDetails?.imageUrl || user?.profileImage || ''
        };
        setUser(mergedResponse);
        setFormValues({
          name: mergedResponse.name || '',
          email: mergedResponse.email || '',
          phone: mergedResponse.phone || ''
        });
        setProfileImage(mergedResponse.profileImage || '');
        setProfileImageFile(null);
      }
    } catch (err) {
      toast.error('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (isPasswordSaving) return;
    if (!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword) return toast.warning("Please fill in all fields.");
    if (passwordValues.newPassword !== passwordValues.confirmPassword) return toast.error("Passwords do not match!");

    try {
      setIsPasswordSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        {
          currentPassword: passwordValues.currentPassword,
          newPassword: passwordValues.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to update password: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className={`relative w-full ${typeof onClose === 'function' ? 'min-h-full' : 'min-h-screen'} bg-[#070707] text-white`}>
      {typeof onClose === 'function' && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-neutral-400 transition hover:border-[#D4AF37]/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
          aria-label="Close profile"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      
      <div className="relative">
        <div className="pointer-events-none absolute -top-24 left-4 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl md:left-10" />
        <div className="relative px-6 pt-14 md:px-10 md:pt-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h1 className="font-serif text-2xl font-semibold tracking-wide text-white/90">STAFF PROFILE</h1>
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-16 md:px-10 md:pb-10 lg:px-12">
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-10 font-sans md:mt-8 md:grid-cols-2 md:gap-x-20 md:gap-y-14">
          <aside className="flex flex-col gap-6 px-2 md:col-span-2 md:flex-row md:items-center md:gap-0 md:px-0">
            <div className="relative flex flex-col items-center md:w-40 md:shrink-0">
              <div className="relative z-10 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] shadow-[0_0_40px_rgba(212,175,55,0.12)] md:h-36 md:w-36">
                {profileImage ? (
                  <img src={profileImage} alt="Staff profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-[#D4AF37] md:text-4xl">{initials}</span>
                )}
              </div>
              <button type="button" onClick={handlePhotoClick} className="relative z-10 mt-4 text-[15px] tracking-widest text-[#D4AF37] transition hover:text-[#f3d77a]">
                <span className="md:hidden">Change Photo</span>
                <span className="hidden md:inline">{profileImage ? 'Change Photo' : 'Add Photo'}</span>
              </button>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="max-w-xl md:pl-10">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words font-serif text-4xl font-semibold leading-tight tracking-normal text-white md:text-5xl">{displayName}</h2>
                <span className="rounded-full border border-[#D4AF37]/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[#D4AF37]">Staff</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-400">Manage your staff account, schedule, and service specialties.</p>
            </div>
          </aside>

          <section className="order-2 font-sans md:col-span-1">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold uppercase leading-6 tracking-[0.12em] text-[#D4AF37]">Personal Information</p>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#D4AF37] transition hover:bg-[#D4AF37]/10 hover:text-[#f3d77a] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  aria-label="Edit staff profile details"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:mt-6 md:gap-5">
              <div>
                <label htmlFor="staff-profile-name" className={formLabelClassName}>Full Name</label>
                {isEditing ? (
                  <input
                    id="staff-profile-name"
                    type="text"
                    value={formValues.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className={formInputClassName}
                    autoComplete="name"
                  />
                ) : <p className={formValueClassName}>{displayName}</p>}
              </div>
              <div>
                <label htmlFor="staff-profile-email" className={formLabelClassName}>Email Address</label>
                {isEditing ? (
                  <input
                    id="staff-profile-email"
                    type="email"
                    value={formValues.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={formInputClassName}
                    autoComplete="email"
                  />
                ) : <p className={formValueClassName}>{displayEmail}</p>}
              </div>
              <div>
                <label htmlFor="staff-profile-phone" className={formLabelClassName}>Phone Number</label>
                {isEditing ? (
                  <input
                    id="staff-profile-phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={formInputClassName}
                    autoComplete="tel"
                  />
                ) : <p className={formValueClassName}>{displayPhone}</p>}
              </div>
            </div>

            <div className="pt-7 mt-8 border-t border-[#D4AF37]/10 md:mt-6 md:pt-5">
              <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:text-[#D4AF37]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                Change Password
              </button>
            </div>

            {isEditing && (
              <div className="mb-2 mt-8 flex flex-col gap-4 border-t border-[#D4AF37]/10 pt-7 min-[520px]:flex-row md:mb-0 md:mt-7 md:gap-3 md:pt-5">
                <button
                  type="button"
                  onClick={saveDetails}
                  disabled={!isDirty || isSaving}
                  className="inline-flex min-h-14 w-full flex-1 items-center justify-center rounded-full bg-[#D4AF37] px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-black shadow-[0_18px_36px_rgba(212,175,55,0.28)] transition hover:bg-[#f3d77a] disabled:cursor-not-allowed disabled:bg-[#D4AF37]/30 disabled:text-black/40 disabled:shadow-none md:min-h-12 md:py-3"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="inline-flex min-h-14 w-full flex-1 items-center justify-center rounded-full border border-[#D4AF37]/70 bg-transparent px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-12 md:py-3"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* Left Column: Professional Details */}
          <section className="order-1 font-sans md:col-span-1">
            <div className="flex items-center gap-3 text-[#D4AF37]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/40">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#D4AF37] md:text-sm">Professional Details</p>
                <p className="text-sm text-white">Specialty, shift, and availability</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6">
              <div>
                <p className={formLabelClassName}>Specialty</p>
                <p className={formValueClassName}>{user?.specialty || 'Not specified'}</p>
              </div>
              <div>
                <p className={formLabelClassName}>Working Hours</p>
                <p className={formValueClassName}>{formatWorkingHours(user?.workingHours) || 'Not specified'}</p>
              </div>
              <div>
                <p className={formLabelClassName}>Off Days</p>
                <p className={formValueClassName}>{user?.offDays || 'No scheduled off days'}</p>
              </div>
            </div>
          </section>
          
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] p-6 md:p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <h3 className="font-serif text-2xl font-semibold text-white mb-2">Change Password</h3>
            <p className="text-sm text-gray-400 mb-6">Ensure your account is using a secure password.</p>
            <div className="space-y-5">
              <div>
                <label htmlFor="staff-current-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">Current Password</label>
                <input id="staff-current-password" type="password" value={passwordValues.currentPassword} onChange={(e) => setPasswordValues({...passwordValues, currentPassword: e.target.value})} className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]" placeholder="Enter current password" autoComplete="current-password" />
              </div>
              <div>
                <label htmlFor="staff-new-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">New Password</label>
                <input id="staff-new-password" type="password" value={passwordValues.newPassword} onChange={(e) => setPasswordValues({...passwordValues, newPassword: e.target.value})} className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]" placeholder="Enter new password" autoComplete="new-password" />
              </div>
              <div>
                <label htmlFor="staff-confirm-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">Confirm New Password</label>
                <input id="staff-confirm-password" type="password" value={passwordValues.confirmPassword} onChange={(e) => setPasswordValues({...passwordValues, confirmPassword: e.target.value})} className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]" placeholder="Confirm new password" autoComplete="new-password" />
              </div>
            </div>
            <div className="mt-8 flex flex-col-reverse items-stretch gap-3 text-[10px] uppercase tracking-widest sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={() => { setIsPasswordModalOpen(false); setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="min-h-11 px-4 text-neutral-400 hover:text-white">Cancel</button>
              <button
                type="button"
                onClick={handlePasswordUpdate}
                disabled={isPasswordSaving}
                className="min-h-11 rounded-full bg-[#D4AF37] px-6 py-2.5 font-bold text-black hover:bg-[#f3d77a] disabled:cursor-not-allowed disabled:bg-[#D4AF37]/40 disabled:text-black/50"
              >
                {isPasswordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffProfile;
