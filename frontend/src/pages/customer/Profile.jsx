import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const DEFAULT_STYLISTS = ['Dileep Malshan'];

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function Profile({ onClose }) {
  const photoInputRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : {};
    } catch {
      return {};
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [stylists, setStylists] = useState(DEFAULT_STYLISTS);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

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
  const [passwordValues, setPasswordValues] = useState({
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
        const names = Array.isArray(data)
          ? data.map((staff) => staff?.name).filter(Boolean)
          : [];
        if (isMounted && names.length > 0) {
          setStylists(names);
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
      syncUserState(JSON.parse(event.newValue));
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
  const displayStylist = user?.preferredStylist || 'Not Specified';

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
    return stylists.filter((stylist) => stylist.toLowerCase().includes(query));
  }, [stylistQuery, stylists]);

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
    setStylistQuery(preferredStylist);
    setIsStylistOpen(false);
    setIsEditing(false);
  };

  const saveDetails = async () => {
    try {
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
        profileImage: profileImage
      };

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        updatedUser,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        const mergedUser = { ...updatedUser, ...response.data };

        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        
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
    }
  };

  // Function to handle password update
  const handlePasswordUpdate = async () => {
    if (!passwordValues.newPassword || !passwordValues.confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Please log in again.");
        return;
      }

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        { password: passwordValues.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        alert("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordValues({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Password update error:', error.response?.data?.message || error.message);
      alert('Failed to update password: ' + (error.response?.data?.message || error.message));
    }
  };

  const startEditing = () => {
    const preferredStylist = user?.preferredStylist || '';
    setFormValues({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      preferredStylist: user?.preferredStylist || ''
    });
    setStylistQuery(preferredStylist);
    setIsEditing(true);
  };

  const handleStylistSelect = (stylist) => {
    updateField('preferredStylist', stylist);
    setStylistQuery(stylist);
    setIsStylistOpen(false);
  };

  return (
    <div className={`relative w-full ${typeof onClose === 'function' ? 'min-h-full' : 'min-h-screen'} bg-[#070707] text-white`}>
      {typeof onClose === 'function' && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-6 right-6 z-10 cursor-pointer text-neutral-400 transition-colors hover:text-white"
          aria-label="Close profile"
        >
          Close
        </button>
      )}
      <div className="relative overflow-hidden">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <div className="relative px-6 pb-10 pt-14 md:px-12 lg:px-16">
          <div className="max-w-4xl">
            <h1 className="font-serif text-4xl font-semibold tracking-wide">MY PROFILE</h1>
          </div>

          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end">
            <div className="relative flex flex-col items-center">
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
                Add Photo
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="md:ml-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {displayName}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Personal dossier curated for an exclusive salon journey.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-16 md:px-12 lg:px-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-2 md:gap-x-20">
          <div className="font-sans md:order-2 md:pt-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">Personal Information</p>
              {isEditing ? (
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-neutral-400 transition hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveDetails}
                    className="text-[#D4AF37] transition hover:text-[#f3d77a]"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#D4AF37] transition hover:text-[#f3d77a]"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D4AF37]/40">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
                    </svg>
                  </span>
                  Edit Details
                </button>
              )}
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Full Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]"
                  />
                ) : (
                  <p className="mt-2 text-sm text-white">{displayName}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Email Address</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]"
                  />
                ) : (
                  <p className="mt-2 text-sm text-white">{displayEmail}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Phone Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formValues.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]"
                  />
                ) : (
                  <p className="mt-2 text-sm text-white">{displayPhone}</p>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#D4AF37]/10">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 transition hover:text-[#D4AF37]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Change Password
              </button>
            </div>

          </div>

          <div className="font-sans md:order-1 md:pt-16">
            <div className="flex items-center gap-3 text-[#D4AF37]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/40">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 21s-7-4.35-7-10a4 4 0 018-1 4 4 0 018 1c0 5.65-7 10-7 10z" />
                  <path d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">Preferred Stylist</p>
                <p className="text-sm text-white">Select your signature artist</p>
              </div>
            </div>

            <div className="relative mt-4">
              <input
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
                readOnly={!isEditing}
                className="w-full rounded-2xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
              />
              {isEditing && isStylistOpen && (
                <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] shadow-[0_0_30px_rgba(212,175,55,0.12)]">
                  {filteredStylists.length > 0 ? (
                    filteredStylists.map((stylist) => (
                      <button
                        type="button"
                        key={stylist}
                        onMouseDown={() => handleStylistSelect(stylist)}
                        className="w-full px-4 py-2 text-left text-sm text-neutral-200 transition hover:text-white"
                      >
                        {stylist}
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
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] p-6 md:p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <h3 className="font-serif text-2xl font-semibold text-white mb-2">Change Password</h3>
            <p className="text-sm text-gray-400 mb-6">Ensure your account is using a secure password.</p>
            
            <div className="space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">New Password</p>
                <input
                  type="password"
                  value={passwordValues.newPassword}
                  onChange={(e) => setPasswordValues({...passwordValues, newPassword: e.target.value})}
                  className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Confirm New Password</p>
                <input
                  type="password"
                  value={passwordValues.confirmPassword}
                  onChange={(e) => setPasswordValues({...passwordValues, confirmPassword: e.target.value})}
                  className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4 text-[10px] uppercase tracking-widest">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordValues({ newPassword: '', confirmPassword: '' });
                }}
                className="text-neutral-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordUpdate}
                className="rounded-full bg-[#D4AF37] px-6 py-2.5 font-bold text-black transition hover:bg-[#f3d77a]"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;