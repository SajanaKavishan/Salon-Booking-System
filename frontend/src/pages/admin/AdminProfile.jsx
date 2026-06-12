import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function AdminProfile({ onClose }) {
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
  const [profileImage, setProfileImage] = useState(user?.profileImage || user?.imageUrl || user?.image || '');

  const [formValues, setFormValues] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  }));

  // Password Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const syncUserState = (updatedUser) => {
      if (isEditing || !updatedUser) return;
      setUser(updatedUser);
      setProfileImage(updatedUser.profileImage || updatedUser.imageUrl || updatedUser.image || '');
      setFormValues({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || ''
      });
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

  const displayName = user?.name || 'Admin User';
  const displayEmail = user?.email || 'admin@salondees.com';
  const displayPhone = user?.phone || 'Not Provided';
  const roleDescription = user?.role || 'Administrator';

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
      if (!isEditing) setIsEditing(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const initials = useMemo(() => {
    const name = (isEditing ? formValues.name : displayName).trim() || '';
    if (!name || name === 'Admin User') return 'AD';
    return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [displayName, formValues.name, isEditing]);

  const updateField = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormValues({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  const saveDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Please log in again.");
        return;
      }

      const updatedUser = {
        ...user,
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim(),
        profileImage: profileImage
      };

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        updatedUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        const mergedUser = { ...updatedUser, ...response.data };
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: mergedUser }));
        setIsEditing(false); 
        toast.success('Admin profile updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordValues.newPassword || !passwordValues.confirmPassword) {
      toast.warning("Please fill in all password fields.");
      return;
    }
    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        { password: passwordValues.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data) {
        toast.success("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordValues({ newPassword: '', confirmPassword: '' });
      }
    } catch {
      toast.error('Failed to update password.');
    }
  };

  return (
    <div className={`relative w-full ${typeof onClose === 'function' ? 'min-h-full' : 'min-h-screen'} bg-[#070707] text-white`}>
      {typeof onClose === 'function' && (
        <button type="button" onClick={handleClose} className="absolute top-6 right-6 z-10 cursor-pointer text-neutral-400 hover:text-white">Close</button>
      )}
      
      <div className="relative overflow-hidden">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="relative px-6 pb-10 pt-14 md:px-12 lg:px-16">
          <div className="max-w-4xl">
            <h1 className="font-serif text-4xl font-semibold tracking-wide">ADMIN PROFILE</h1>
          </div>
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end">
            <div className="relative flex flex-col items-center">
              <div className="relative z-10 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] shadow-[0_0_40px_rgba(212,175,55,0.12)] md:h-36 md:w-36">
                {profileImage ? (
                  <img src={profileImage} alt="Admin profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-[#D4AF37] md:text-4xl">{initials}</span>
                )}
              </div>
              <button type="button" onClick={handlePhotoClick} className="relative z-10 mt-4 text-[15px] tracking-widest text-[#D4AF37] hover:text-[#f3d77a]">Add Photo</button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="md:ml-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{displayName}</h2>
                <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] uppercase tracking-widest text-[#D4AF37]">{roleDescription}</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">Review your admin account details and security settings.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-16 md:px-12 lg:px-16">
        {/* Personal information section */}
        <div className="mx-auto max-w-2xl font-sans pt-8">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">Personal Information</p>
            {isEditing ? (
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
                <button type="button" onClick={resetForm} className="text-neutral-400 hover:text-white">Cancel</button>
                <button type="button" onClick={saveDetails} className="text-[#D4AF37] hover:text-[#f3d77a]">Save Changes</button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#D4AF37] hover:text-[#f3d77a]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D4AF37]/40">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 20h9" /><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" /></svg>
                </span>
                Edit Details
              </button>
            )}
          </div>

          <div className="mt-6 space-y-5 rounded-2xl border border-[#D4AF37]/10 bg-[#0b0b0b]/50 p-6 shadow-lg">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Full Name</p>
              {isEditing ? <input type="text" value={formValues.name} onChange={(e) => updateField('name', e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]" /> : <p className="mt-2 text-sm text-white">{displayName}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Email Address</p>
              {isEditing ? <input type="email" value={formValues.email} onChange={(e) => updateField('email', e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]" /> : <p className="mt-2 text-sm text-white">{displayEmail}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Phone Number</p>
              {isEditing ? <input type="text" value={formValues.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]" /> : <p className="mt-2 text-sm text-white">{displayPhone}</p>}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#D4AF37]/10 flex justify-center">
            <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 transition hover:text-[#D4AF37]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0b0b0b] p-6 md:p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <h3 className="font-serif text-2xl font-semibold text-white mb-2">Change Password</h3>
            <p className="text-sm text-gray-400 mb-6">Ensure your admin account is secure.</p>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">New Password</p>
                <input type="password" value={passwordValues.newPassword} onChange={(e) => setPasswordValues({...passwordValues, newPassword: e.target.value})} className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]" placeholder="Enter new password" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Confirm New Password</p>
                <input type="password" value={passwordValues.confirmPassword} onChange={(e) => setPasswordValues({...passwordValues, confirmPassword: e.target.value})} className="w-full rounded-xl border border-[#D4AF37]/40 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]" placeholder="Confirm new password" />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-end gap-4 text-[10px] uppercase tracking-widest">
              <button type="button" onClick={() => { setIsPasswordModalOpen(false); setPasswordValues({ newPassword: '', confirmPassword: '' }); }} className="text-neutral-400 hover:text-white">Cancel</button>
              <button type="button" onClick={handlePasswordUpdate} className="rounded-full bg-[#D4AF37] px-6 py-2.5 font-bold text-black hover:bg-[#f3d77a]">Update Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProfile;