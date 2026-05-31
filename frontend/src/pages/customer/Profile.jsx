import React, { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_STYLISTS = ['Elena', 'Alex', 'Jordan', 'Taylor'];
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
    name: user?.name || 'Ravindu Dulakshan',
    email: user?.email || 'ravindu@salondees.com',
    phone: user?.phone || '+94 77 123 4567',
    preferredStylist: user?.preferredStylist || 'Elena'
  }));
  const [stylistQuery, setStylistQuery] = useState(formValues.preferredStylist);
  const [isStylistOpen, setIsStylistOpen] = useState(false);

  useEffect(() => {
    if (isEditing) return;

    const preferredStylist = user?.preferredStylist || 'Elena';
    setFormValues({
      name: user?.name || 'Ravindu Dulakshan',
      email: user?.email || 'ravindu@salondees.com',
      phone: user?.phone || '+94 77 123 4567',
      preferredStylist
    });
    setStylistQuery(preferredStylist);
  }, [user, isEditing]);

  useEffect(() => {
    setProfileImage(user?.profileImage || '');
  }, [user]);

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

  const displayName = user?.name || 'Ravindu Dulakshan';
  const displayEmail = user?.email || 'ravindu@salondees.com';
  const displayPhone = user?.phone || '+94 77 123 4567';
  const displayStylist = user?.preferredStylist || 'Elena';
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

      const updatedUser = {
        ...user,
        profileImage: imageUrl
      };
      setUser(updatedUser);
      setProfileImage(imageUrl);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const initials = useMemo(() => {
    const name = (isEditing ? formValues.name : displayName).trim() || 'Ravindu Dulakshan';
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
    const preferredStylist = user?.preferredStylist || 'Elena';
    setFormValues({
      name: user?.name || 'Ravindu Dulakshan',
      email: user?.email || 'ravindu@salondees.com',
      phone: user?.phone || '+94 77 123 4567',
      preferredStylist
    });
    setStylistQuery(preferredStylist);
    setIsStylistOpen(false);
    setIsEditing(false);
  };

  const saveDetails = () => {
    const updatedUser = {
      ...user,
      name: formValues.name.trim() || user?.name || 'Ravindu Dulakshan',
      email: formValues.email.trim() || user?.email || 'ravindu@salondees.com',
      phone: formValues.phone.trim(),
      preferredStylist: formValues.preferredStylist.trim() || user?.preferredStylist || 'Elena'
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));
    setIsEditing(false);
  };

  const startEditing = () => {
    const preferredStylist = user?.preferredStylist || 'Elena';
    setFormValues({
      name: user?.name || 'Ravindu Dulakshan',
      email: user?.email || 'ravindu@salondees.com',
      phone: user?.phone || '+94 77 123 4567',
      preferredStylist
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
                    type="tel"
                    value={formValues.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-white outline-none border-b border-[#D4AF37]/40 focus:border-[#D4AF37]"
                  />
                ) : (
                  <p className="mt-2 text-sm text-white">{displayPhone}</p>
                )}
              </div>
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
    </div>
  );
}

export default Profile;
