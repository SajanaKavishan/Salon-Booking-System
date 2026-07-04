import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { GlassCard, GoldButton } from "./SystemUI";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const currentYear = new Date().getFullYear();
const leaveYearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
};

function StaffManager() {
  const fieldClassName = "w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all";
  const minimalSelectClassName = "w-full bg-transparent text-white border-b border-zinc-700 rounded-none px-2 py-1.5 text-sm font-medium outline-none transition focus:border-[#c5a880] sm:w-auto sm:py-1";
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "leaves" ? "leaves" : "directory");
  const [staffList, setStaffList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", specialty: "", offDays: "", workingHours: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [stylistFilter, setStylistFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const fileInputRef = useRef(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editData, setEditData] = useState({ name: "", specialty: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isActive = true;
    axios
      .get(`${API_BASE_URL}/api/staff`)
      .then((response) => {
        if (isActive) setStaffList(response.data);
      })
      .catch((error) => toast.error(error.response?.data?.message || "Failed to load staff list"));
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadLeaveRequests = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/leaves`, getAuthHeaders());
        if (isActive) setLeaveRequests(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load leave requests");
      }
    };

    loadLeaveRequests();
    return () => { isActive = false; };
  }, []);

  useEffect(() => () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  const specialtyOptions = ["Hair Stylist", "Colorist", "Beautician", "Massage Therapist", "All-Rounder"];

  const getLeaveStaffId = (leave) => {
    const staff = leave?.staffId;
    return typeof staff === "object" ? staff?._id : staff;
  };

  const getStaffFilterId = (staff) => staff.userId || staff._id;

  const filteredLeaveRequests = useMemo(() => leaveRequests.filter((leave) => {
    const leaveYear = new Date(leave.startDate).getFullYear().toString();
    const matchesYear = leaveYear === yearFilter;
    const matchesStylist = stylistFilter === "all" || getLeaveStaffId(leave) === stylistFilter;
    return matchesYear && matchesStylist;
  }), [leaveRequests, stylistFilter, yearFilter]);

  const formatLeaveDateRange = (startDate, endDate) => {
    const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    if (Number.isNaN(start.getTime())) return "Not set";
    if (Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) return formatter.format(start);
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  };

  const getLeaveStatusBadge = (status) => {
    const normalizedStatus = String(status || "").toLowerCase();
    if (normalizedStatus === "approved") {
      return <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Approved</span>;
    }
    if (normalizedStatus === "rejected") {
      return <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">Rejected</span>;
    }
    return <span className="rounded-full border border-[#c5a880]/25 bg-[#c5a880]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#c5a880]">Pending</span>;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (file) => {
    if (!file) {
      setSelectedImage(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e) => {
    handleImageChange(e.target.files?.[0] || null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files?.[0] || null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const clearSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEditInputChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (isAddingStaff) return;

    setIsAddingStaff(true);
    try {
      const authHeaders = getAuthHeaders();

      const registerResponse = await axios.post(
        `${API_BASE_URL}/api/users/register-staff`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        },
        authHeaders
      );

      const payload = new FormData();
      if (registerResponse.data?._id) {
        payload.append("userId", registerResponse.data._id);
      }
      payload.append("name", formData.name);
      payload.append("specialty", formData.specialty);
      if (formData.offDays) {
        payload.append("offDays", formData.offDays);
      }

      if (selectedImage) {
        payload.append("image", selectedImage);
      }

      if (formData.workingHours) {
        payload.append("workingHours", formData.workingHours);
      }

      const response = await axios.post(`${API_BASE_URL}/api/staff`, payload, authHeaders);
      setStaffList((currentStaff) => [...currentStaff, response.data]);
      setFormData({ name: "", email: "", password: "", specialty: "", offDays: "", workingHours: "" });
      clearSelectedImage();
      toast.success("Staff member added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add staff");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/staff/${itemToDelete}`, getAuthHeaders());
      setStaffList((currentStaff) => currentStaff.filter((staff) => staff._id !== itemToDelete));
      toast.success("Staff member removed!");
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove staff");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditModal = (staff) => {
    setEditData({
      name: staff.name,
      specialty: staff.specialty,
    });
    setEditingId(staff._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_BASE_URL}/api/staff/${editingId}`, editData, getAuthHeaders());
      setStaffList((currentStaff) => currentStaff.map((staff) => (staff._id === editingId ? response.data : staff)));
      setIsEditModalOpen(false);
      toast.success("Staff updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update staff");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/80 px-3 shadow-xl backdrop-blur-md sm:px-4">
        <div className="scrollbar-none flex gap-4 overflow-x-auto whitespace-nowrap sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`shrink-0 border-b-2 px-1 py-4 text-xs font-bold uppercase tracking-[0.14em] transition sm:text-sm sm:tracking-[0.18em] ${
              activeTab === "directory"
                ? "border-[#c5a880] text-[#c5a880]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Manage Directory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaves")}
            className={`shrink-0 border-b-2 px-1 py-4 text-xs font-bold uppercase tracking-[0.14em] transition sm:text-sm sm:tracking-[0.18em] ${
              activeTab === "leaves"
                ? "border-[#c5a880] text-[#c5a880]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Leave Requests
          </button>
        </div>
      </div>

      {activeTab === "directory" && (
        <>
          <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <form onSubmit={handleAddStaff} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="staff-name" className="mb-1 block text-xs font-medium text-gray-400">Name</label>
            <input id="staff-name" type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required className={fieldClassName} />
          </div>
          <div>
            <label htmlFor="staff-email" className="mb-1 block text-xs font-medium text-gray-400">Email Address</label>
            <input id="staff-email" type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} required className={fieldClassName} autoComplete="email" />
          </div>
          <div>
            <label htmlFor="staff-password" className="mb-1 block text-xs font-medium text-gray-400">Temporary Password</label>
            <div className="relative">
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Temporary Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className={`${fieldClassName} pr-12`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37] transition-colors hover:text-yellow-400"
                aria-label={showPassword ? "Hide temporary password" : "Show temporary password"}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="staff-specialty" className="mb-1 block text-xs font-medium text-gray-400">Specialty</label>
            <select id="staff-specialty" name="specialty" value={formData.specialty} onChange={handleInputChange} required className={fieldClassName}>
              <option value="" disabled className="bg-[#111111] text-gray-500">Select Specialty</option>
              {specialtyOptions.map((option) => (
                <option key={option} value={option} className="bg-[#111111]">{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staff-working-hours" className="mb-1 block text-xs font-medium text-gray-400">Working Hours</label>
            <select id="staff-working-hours" name="workingHours" value={formData.workingHours} onChange={handleInputChange} required className={fieldClassName}>
              <option value="" disabled className="bg-[#111111] text-gray-500">Select Working Hours</option>
              <option value="09:00 AM - 05:00 PM" className="bg-[#111111]">09:00 AM - 05:00 PM</option>
              <option value="10:00 AM - 06:00 PM" className="bg-[#111111]">10:00 AM - 06:00 PM</option>
              <option value="11:00 AM - 07:00 PM" className="bg-[#111111]">11:00 AM - 07:00 PM</option>
              <option value="12:00 PM - 08:00 PM" className="bg-[#111111]">12:00 PM - 08:00 PM</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="staff-off-day" className="block text-xs font-medium text-gray-400 mb-1">Weekly Off Day (Optional)</label>
            <select
              id="staff-off-day"
              name="offDays"
              value={formData.offDays}
              onChange={(e) => setFormData({ ...formData, offDays: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-800 bg-[#121212] text-white focus:outline-none focus:border-[#d4af37] transition-colors text-sm"
            >
              <option value="">No Regular Off Day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <input
              id="staff-image"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <label
              htmlFor="staff-image"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-black/30 px-6 py-6 text-center text-sm text-gray-300 transition hover:border-[#d4af37] hover:bg-black/40"
            >
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <img src={imagePreview} alt="Staff preview" className="h-24 w-24 rounded-full border border-[#d4af37]/40 object-cover" />
                  <p className="mt-4 font-medium text-white">Image selected</p>
                  <p className="mt-1 max-w-xs truncate text-xs text-gray-400">{selectedImage?.name}</p>
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 16V7m0 0-3.5 3.5M12 7l3.5 3.5M4 17.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-4 font-medium text-white">Drag and drop a staff image here</p>
                  <p className="mt-1 text-xs text-gray-400">or click to choose a file from your device</p>
                </>
              )}
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={clearSelectedImage}
                className="mx-auto mt-3 block text-xs text-[#d4af37] hover:text-yellow-400"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <GoldButton
              type="submit"
              disabled={isAddingStaff}
              className="rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAddingStaff ? "Adding Staff..." : "+ Add Staff"}
            </GoldButton>
          </div>
        </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <div className="space-y-3 md:hidden">
          {staffList.map((staff) => (
            <div key={staff._id} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-gray-100">{staff.name}</p>
                  <p className="mt-1 text-sm text-gray-400">{staff.specialty}</p>
                </div>
                {activeMenuId === staff._id ? (
                  <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} className="shrink-0 bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
                    x
                  </GoldButton>
                ) : (
                  <GoldButton type="button" variant="outline" onClick={() => setActiveMenuId(staff._id)} className="shrink-0 px-4 py-1.5">
                    Manage
                  </GoldButton>
                )}
              </div>

              {activeMenuId === staff._id && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <GoldButton type="button" variant="ghost" onClick={() => openEditModal(staff)} className="border border-blue-800/50 bg-blue-900/30 px-3 py-2 text-sm text-blue-300 hover:bg-blue-600 hover:text-white">
                    Edit
                  </GoldButton>
                  <button
                    type="button"
                    onClick={() => {
                      setItemToDelete(staff._id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-red-800/50 bg-red-900/30 px-3 py-2 text-sm font-semibold text-red-300 transition duration-300 hover:bg-red-600 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {staffList.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-black/20 p-8 text-center text-sm font-light text-gray-500">
              No staff members found.
            </div>
          )}
        </div>

        <div className="salon-scrollbar hidden overflow-x-auto rounded-xl border border-white/10 bg-black/20 md:block">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/30 text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                <th className="w-[45%] py-4 pl-4 pr-6">Name</th>
                <th className="w-[35%] px-0 py-4 pr-6">Specialty</th>
                <th className="w-[20%] py-4 pl-0 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff._id} className="group border-b border-zinc-800 transition-colors last:border-b-0 hover:bg-white/5">
                  <td className="w-[45%] py-4 pl-4 pr-6 align-middle">
                    <div className="font-medium text-gray-200">{staff.name}</div>
                  </td>
                  <td className="w-[35%] px-0 py-4 pr-6 align-middle text-gray-300">{staff.specialty}</td>
                  <td className="w-[20%] py-4 pl-0 pr-4 text-right align-middle">
                    {activeMenuId === staff._id ? (
                      <div className="flex items-center justify-end gap-2">
                        <GoldButton type="button" variant="ghost" onClick={() => openEditModal(staff)} className="border border-blue-800/50 bg-blue-900/30 px-3 py-1 text-sm text-blue-300 hover:bg-blue-600 hover:text-white">
                          Edit
                        </GoldButton>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(staff._id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-red-800/50 bg-red-900/30 px-3 py-1 text-sm font-semibold text-red-300 transition duration-300 hover:bg-red-600 hover:text-white"
                        >
                          Delete
                        </button>
                        <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} className="bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
                          x
                        </GoldButton>
                      </div>
                    ) : (
                      <GoldButton type="button" variant="outline" onClick={() => setActiveMenuId(staff._id)} className="px-4 py-1.5">
                        Manage
                      </GoldButton>
                    )}
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan="3" className="bg-[#0a0a0a]/30 p-10 text-center font-light text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </section>
        </>
      )}

      {activeTab === "leaves" && (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 border-b border-zinc-800/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
              <label className="flex w-full flex-col gap-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                Stylist
                <select value={stylistFilter} onChange={(event) => setStylistFilter(event.target.value)} className={minimalSelectClassName}>
                  <option value="all" className="bg-[#111111]">All Stylists</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={getStaffFilterId(staff)} className="bg-[#111111]">
                      {staff.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex w-full flex-col gap-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                Year
                <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className={minimalSelectClassName}>
                  {leaveYearOptions.map((year) => (
                    <option key={year} value={String(year)} className="bg-[#111111]">
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <span className="inline-block self-start rounded-full border border-[#c5a880]/30 bg-[#c5a880]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#c5a880] sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-zinc-500">
              {filteredLeaveRequests.length} leave requests
            </span>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredLeaveRequests.map((leave) => (
              <div key={leave._id} className="border-b border-zinc-800/60 pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {leave.staffId?.profileImage ? (
                      <img src={leave.staffId.profileImage} alt={leave.staffId.name || "Staff member"} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-gray-300">
                        {leave.staffId?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-[#c5a880]">{leave.staffId?.name || "Former staff member"}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatLeaveDateRange(leave.startDate, leave.endDate)}</p>
                    </div>
                  </div>
                  <div className="shrink-0">{getLeaveStatusBadge(leave.status)}</div>
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Type</p>
                    <p className="mt-0.5 text-sm text-zinc-200">{leave.leaveType || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reason</p>
                    <p className="mt-0.5 text-sm leading-6 text-zinc-200">{leave.reason || "No reason provided"}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredLeaveRequests.length === 0 && (
              <div className="py-12 text-center text-sm font-light text-gray-500">
                No leave requests found for the selected filters.
              </div>
            )}
          </div>

          <div className="salon-scrollbar hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-zinc-800/60 text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                  <th className="px-0 py-3 pr-6">Stylist Name</th>
                  <th className="px-0 py-3 pr-6">Requested Dates</th>
                  <th className="px-0 py-3 pr-6">Type</th>
                  <th className="px-0 py-3 pr-6">Reason</th>
                  <th className="px-0 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaveRequests.map((leave) => (
                  <tr key={leave._id} className="border-b border-zinc-800/60 transition-colors last:border-b-0 hover:bg-white/[0.025]">
                    <td className="py-4 pr-6 align-middle">
                      <div className="flex items-center gap-3">
                        {leave.staffId?.profileImage ? (
                          <img src={leave.staffId.profileImage} alt={leave.staffId.name || "Staff member"} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-gray-300">
                            {leave.staffId?.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-200">{leave.staffId?.name || "Former staff member"}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-6 align-middle text-sm text-gray-300">{formatLeaveDateRange(leave.startDate, leave.endDate)}</td>
                    <td className="py-4 pr-6 align-middle text-sm text-gray-300">{leave.leaveType || "Not specified"}</td>
                    <td className="max-w-md py-4 pr-6 align-middle text-sm text-gray-300">
                      <span className="line-clamp-2">{leave.reason || "No reason provided"}</span>
                    </td>
                    <td className="py-4 align-middle">{getLeaveStatusBadge(leave.status)}</td>
                  </tr>
                ))}
                {filteredLeaveRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-sm font-light text-gray-500">
                      No leave requests found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <GlassCard
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-staff-title"
            className="relative w-full max-w-md border-t-4 border-t-[#d4af37] bg-[#111111] p-8"
          >
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 text-xl text-gray-400 hover:text-white">
              x
            </button>
            <h3 id="edit-staff-title" className="salon-heading mb-6 border-b border-white/10 pb-4">Edit Staff Member</h3>
            <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
              <div>
                <label htmlFor="edit-staff-name" className="mb-1 block text-xs font-medium text-gray-400">Name</label>
                <input id="edit-staff-name" type="text" name="name" placeholder="Name" value={editData.name} onChange={handleEditInputChange} required className={fieldClassName} />
              </div>
              <div>
                <label htmlFor="edit-staff-specialty" className="mb-1 block text-xs font-medium text-gray-400">Specialty</label>
                <select id="edit-staff-specialty" name="specialty" value={editData.specialty} onChange={handleEditInputChange} required className={fieldClassName}>
                  {specialtyOptions.map((option) => (
                    <option key={option} value={option} className="bg-[#111111]">{option}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <GoldButton type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 hover:text-white">
                  Cancel
                </GoldButton>
                <GoldButton type="submit" className="px-4 py-2">
                  Save Changes
                </GoldButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-staff-title"
            className="mx-4 w-full max-w-sm border-t-4 border-t-red-600 bg-[#111111] p-6"
          >
            <h4 id="delete-staff-title" className="mb-3 text-xl font-semibold text-white">Delete Staff Member</h4>
            <p className="mb-6 text-gray-400">Are you sure you want to delete this? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <GoldButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </GoldButton>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center justify-center rounded-md bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default StaffManager;
