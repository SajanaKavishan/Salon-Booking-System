import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import BACKEND_BASE_URL from '../../utils/apiConfig';
import { getStoredSession } from '../../utils/auth';

const DEFAULT_STYLISTS = [];

const formLabelClassName = 'text-xs font-bold uppercase leading-5 tracking-[0.12em] text-gray-400';
const formValueClassName = 'mt-2 text-base leading-6 text-white';
const formInputClassName = 'mt-2 w-full bg-transparent pb-2 text-base font-medium leading-6 text-white outline-none border-b border-[#D4AF37]/40 transition focus:border-[#D4AF37]';

function Profile({ onClose }) {
  const photoInputRef = useRef(null);

  const [user, setUser] = useState(() => {
    return getStoredSession()?.user || {};
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stylists, setStylists] = useState(DEFAULT_STYLISTS);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [profileImageFile, setProfileImageFile] = useState(null);

  const [formValues, setFormValues] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    preferredStylist: user?.preferredStylist || ''
  }));

  const [stylistQuery, setStylistQuery] = useState(formValues.preferredStylist);
  const [isStylistOpen, setIsStylistOpen] = useState(false);

  // State for password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Get staff list from backend API
  useEffect(() => {
    let isMounted = true;

    const loadStylists = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/staff`);
        if (!response.ok) return;
        const data = await response.json();
        const availableStylists = Array.isArray(data)
          ? data
              .map((staff) => ({
                name: staff?.name || '',
                userId: staff?.userId || staff?._id || staff?.id || ''
              }))
              .filter((staff) => staff.name && staff.userId)
          : [];
        if (isMounted && availableStylists.length > 0) {
          setStylists(availableStylists);
        }
      } catch {
        // Keep defaults on failure.
      }
    };

    loadStylists();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncUserState = (updatedUser) => {
      if (isEditing || !updatedUser) return;
      const preferredStylist = updatedUser.preferredStylist || '';

      setUser(updatedUser);
      setProfileImage(updatedUser.profileImage || '');
      setFormValues({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        preferredStylist
      });
      setStylistQuery(preferredStylist);
    };

    const handleProfileUpdated = (event) => syncUserState(event?.detail);
    const handleStorage = (event) => {
      if (event.key !== 'user' || !event.newValue) return;
      try {
        syncUserState(JSON.parse(event.newValue));
      } catch (error) {
        console.error('Failed to parse updated user profile from localStorage:', error);
        syncUserState({});
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isEditing]);

  const displayName = user?.name || 'User';
  const displayEmail = user?.email || 'No Email Provided';
  const displayPhone = user?.phone || 'No Phone Number Provided';
  const displayStylist = stylists.find(
    (stylist) => stylist.userId === user?.preferredStylist || stylist.name === user?.preferredStylist
  )?.name || user?.preferredStylist || 'Not Specified';
  const canSubmitPassword = passwordValues.currentPassword.trim() && passwordValues.newPassword.trim() && passwordValues.confirmPassword.trim();

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      setProfileImage(imageUrl);
      setProfileImageFile(file);
      
      if (!isEditing) {
        setIsEditing(true);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const initials = useMemo(() => {
    const name = (isEditing ? formValues.name : displayName).trim() || '';
    if (!name || name === 'User') return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [displayName, formValues.name, isEditing]);

  const filteredStylists = useMemo(() => {
    const query = stylistQuery.trim().toLowerCase();
    if (!query) return stylists;
    return stylists.filter((stylist) => stylist.name.toLowerCase().includes(query));
  }, [stylistQuery, stylists]);

  const isDirty = useMemo(() => {
    if (!isEditing) return false;

    const normalize = (value) => String(value || '').trim();

    return (
      normalize(formValues.name) !== normalize(user?.name)
      || normalize(formValues.email) !== normalize(user?.email)
      || normalize(formValues.phone) !== normalize(user?.phone)
      || normalize(formValues.preferredStylist) !== normalize(user?.preferredStylist)
      || Boolean(profileImageFile)
      || normalize(profileImage) !== normalize(user?.profileImage)
    );
  }, [formValues, isEditing, profileImage, profileImageFile, user]);

  const updateField = (field, value) => {
    setFormValues((current) => ({
      ...current,
      [field]: value
    }));
  };

  const resetForm = () => {
    const preferredStylist = user?.preferredStylist || '';
    setFormValues({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      preferredStylist
    });
    setProfileImage(user?.profileImage || '');
    setProfileImageFile(null);
    setStylistQuery(preferredStylist);
    setIsStylistOpen(false);
    setIsEditing(false);
  };

  const saveDetails = async () => {
    if (!isDirty || isSaving) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');

      if (!token) {
        console.error("Can't find authentication token in localStorage!");
        alert("Please log in again.");
        return;
      }

      const updatedUser = {
        ...user,
        name: formValues.name.trim() || user?.name || '',
        email: formValues.email.trim() || user?.email || '',
        phone: formValues.phone.trim() || user?.phone || '',
        preferredStylist: formValues.preferredStylist.trim() || user?.preferredStylist || '',
      };

      const payload = new FormData();
      payload.append('name', updatedUser.name);
      payload.append('email', updatedUser.email);
      payload.append('phone', updatedUser.phone);
      payload.append('preferredStylist', updatedUser.preferredStylist);
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
        const mergedUser = { ...updatedUser, ...response.data };

        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setProfileImage(mergedUser.profileImage || '');
        setProfileImageFile(null);
        
        setFormValues({
          name: mergedUser.name || '',
          email: mergedUser.email || '',
          phone: mergedUser.phone || '',
          preferredStylist: mergedUser.preferredStylist || ''
        });
        setStylistQuery(mergedUser.preferredStylist || '');

        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: mergedUser }));
        setIsEditing(false); 
        alert('Profile updated successfully!');
      }

    } catch (error) {
      console.error('Profile update error:', error.response?.data?.message || error.message);
      alert('Failed to update profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle password update
  const handlePasswordUpdate = async () => {
    if (isPasswordSaving) return;

    if (!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    try {
      setIsPasswordSaving(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Please log in again.");
        return;
      }

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        {
          currentPassword: passwordValues.currentPassword,
          newPassword: passwordValues.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        alert("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Password update error:', error.response?.data?.message || error.message);
      alert('Failed to update password: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const startEditing = () => {
    setFormValues({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      preferredStylist: user?.preferredStylist || ''
    });
    setStylistQuery(displayStylist === 'Not Specified' ? '' : displayStylist);
    setIsEditing(true);
  };

  const handleStylistSelect = (stylist) => {
    updateField('preferredStylist', stylist.userId);
    setStylistQuery(stylist.name);
    setIsStylistOpen(false);
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
            <h1 className="font-serif text-2xl font-semibold tracking-wide text-white/90">MY PROFILE</h1>
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-16 md:px-10 md:pb-10 lg:px-12">
        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-10 font-sans md:mt-8 md:grid md:grid-cols-2 md:gap-x-20 md:gap-y-14">
          <aside className="flex flex-col gap-6 px-2 md:col-span-2 md:flex-row md:items-center md:gap-0 md:px-0 md:text-left">
            <div className="relative flex flex-col items-center md:w-40 md:shrink-0">
              <div className="relative z-10 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] shadow-[0_0_40px_rgba(212,175,55,0.12)] md:h-36 md:w-36">
                {profileImage ? (
                  <img src={profileImage} alt="Customer profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-[#D4AF37] md:text-4xl">{initials}</span>
                )}
              </div>
              <div className="pointer-events-none absolute -bottom-3 -right-4 z-0 h-16 w-16 rounded-full border border-[#D4AF37]/30 bg-[#0b0b0b] blur-lg" />
              <button
                type="button"
                onClick={handlePhotoClick}
                className="relative z-10 mt-4 text-[15px] tracking-widest text-[#D4AF37] transition hover:text-[#f3d77a]"
              >
                <span className="md:hidden">Change Photo</span>
                <span className="hidden md:inline">{profileImage ? 'Change Photo' : 'Add Photo'}</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="max-w-xl md:pl-10">
              <h2 className="break-words font-serif text-4xl font-semibold leading-tight tracking-normal text-white md:text-5xl">
                {displayName}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Personal dossier curated for an exclusive salon journey.
              </p>
            </div>
          </aside>

          <section className="hidden md:col-span-1 md:block">
            <div className="flex items-start gap-4">
              <div className="mt-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 text-[#D4AF37] md:flex">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 21s-7-4.35-7-11a4 4 0 017-2.65A4 4 0 0119 10c0 6.65-7 11-7 11z" />
                </svg>
              </div>
              <div className="w-full">
                <label htmlFor="customer-profile-stylist-desktop" className={formLabelClassName}>Preferred Stylist</label>
                <p className="mt-1 text-sm font-medium text-white">Select your signature artist</p>
                <div className="relative mt-5">
                  <input
                    id="customer-profile-stylist-desktop"
                    type="text"
                    value={isEditing ? stylistQuery : displayStylist}
                    onFocus={() => {
                      if (!isEditing) startEditing();
                      setIsStylistOpen(true);
                    }}
                    onChange={(event) => {
                      if (!isEditing) return;
                      setStylistQuery(event.target.value);
                      updateField('preferredStylist', event.target.value);
                      setIsStylistOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setIsStylistOpen(false), 140);
                    }}
                    placeholder="Search stylists"
                    autoComplete="off"
                    readOnly={!isEditing}
                    className="w-full rounded-2xl border border-[#D4AF37]/60 bg-transparent px-4 py-3 text-base font-medium text-white outline-none transition focus:border-[#D4AF37]"
                  />
                  {isEditing && isStylistOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] shadow-[0_0_30px_rgba(212,175,55,0.12)]">
                      {filteredStylists.length > 0 ? (
                        filteredStylists.map((stylist) => (
                          <button
                            type="button"
                            key={stylist.userId}
                            onMouseDown={() => handleStylistSelect(stylist)}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-200 transition hover:text-white"
                          >
                            {stylist.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-neutral-500">No stylists found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="md:col-span-1">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold uppercase leading-6 tracking-[0.12em] text-[#D4AF37]">Personal Information</p>
              {!isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#D4AF37] transition hover:bg-[#D4AF37]/10 hover:text-[#f3d77a] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  aria-label="Edit profile details"
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
                <label htmlFor="customer-profile-name" className={formLabelClassName}>Full Name</label>
                {isEditing ? (
                  <input
                    id="customer-profile-name"
                    type="text"
                    value={formValues.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className={formInputClassName}
                    autoComplete="name"
                  />
                ) : (
                  <p className={formValueClassName}>{displayName}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-profile-email" className={formLabelClassName}>Email Address</label>
                {isEditing ? (
                  <input
                    id="customer-profile-email"
                    type="email"
                    value={formValues.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className={formInputClassName}
                    autoComplete="email"
                  />
                ) : (
                  <p className={formValueClassName}>{displayEmail}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-profile-phone" className={formLabelClassName}>Phone Number</label>
                {isEditing ? (
                  <input
                    id="customer-profile-phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className={formInputClassName}
                    autoComplete="tel"
                  />
                ) : (
                  <p className={formValueClassName}>{displayPhone}</p>
                )}
              </div>
              <div className="md:hidden">
                <label htmlFor="customer-profile-stylist-mobile" className={formLabelClassName}>Preferred Stylist</label>
                <div className="relative mt-2">
                  <input
                    id="customer-profile-stylist-mobile"
                    type="text"
                    value={isEditing ? stylistQuery : displayStylist}
                    onFocus={() => {
                      if (!isEditing) startEditing();
                      setIsStylistOpen(true);
                    }}
                    onChange={(event) => {
                      if (!isEditing) return;
                      setStylistQuery(event.target.value);
                      updateField('preferredStylist', event.target.value);
                      setIsStylistOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setIsStylistOpen(false), 140);
                    }}
                    placeholder="Search stylists"
                    autoComplete="off"
                    readOnly={!isEditing}
                    className="w-full rounded-2xl border border-[#D4AF37]/60 bg-transparent px-4 py-3 text-base font-medium text-white outline-none transition focus:border-[#D4AF37]"
                  />
                  {isEditing && isStylistOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] shadow-[0_0_30px_rgba(212,175,55,0.12)]">
                      {filteredStylists.length > 0 ? (
                        filteredStylists.map((stylist) => (
                          <button
                            type="button"
                            key={stylist.userId}
                            onMouseDown={() => handleStylistSelect(stylist)}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-200 transition hover:text-white"
                          >
                            {stylist.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-neutral-500">No stylists found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-7 mt-8 border-t border-[#D4AF37]/10 md:mt-6 md:pt-5">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:text-[#D4AF37]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Change Password
              </button>
            </div>

            {isEditing && (
              <div className="mt-12 flex flex-col gap-4 border-t border-[#D4AF37]/10 pt-7 min-[520px]:flex-row md:mt-7 md:gap-3 md:pt-5">
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
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] p-6 md:p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <h3 className="font-serif text-2xl font-semibold text-white mb-2">Change Password</h3>
            <p className="text-sm text-gray-400 mb-6">Ensure your account is using a secure password.</p>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="customer-profile-current-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">Current Password</label>
                <input
                  id="customer-profile-current-password"
                  type="password"
                  value={passwordValues.currentPassword}
                  onChange={(e) => setPasswordValues({...passwordValues, currentPassword: e.target.value})}
                  className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="customer-profile-new-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">New Password</label>
                <input
                  id="customer-profile-new-password"
                  type="password"
                  value={passwordValues.newPassword}
                  onChange={(e) => setPasswordValues({...passwordValues, newPassword: e.target.value})}
                  className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="customer-profile-confirm-password" className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500">Confirm New Password</label>
                <input
                  id="customer-profile-confirm-password"
                  type="password"
                  value={passwordValues.confirmPassword}
                  onChange={(e) => setPasswordValues({...passwordValues, confirmPassword: e.target.value})}
                  className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4 text-[10px] uppercase tracking-widest">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="text-neutral-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordUpdate}
                disabled={!canSubmitPassword || isPasswordSaving}
                className="rounded-full bg-[#D4AF37] px-6 py-2.5 font-bold text-black transition hover:bg-[#f3d77a] disabled:cursor-not-allowed disabled:bg-[#D4AF37]/40 disabled:text-black/50"
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

export default Profile;
