import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Check, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { GlassCard, GoldButton } from "./SystemUI";
import API_BASE_URL from "../../utils/apiConfig";

const currentYear = new Date().getFullYear();
const leaveYearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
const mutedGoldButtonClassName = "disabled:cursor-not-allowed disabled:border-[#756a1d] disabled:bg-[#756a1d] disabled:text-black/70 disabled:shadow-none disabled:brightness-75 disabled:hover:bg-[#756a1d] disabled:hover:text-black/70";
const SRI_LANKAN_MOBILE_REGEX = /^(?:\+94|0)7\d{8}$/;
const workingHourOptions = [
  "09:00 AM - 05:00 PM",
  "10:00 AM - 06:00 PM",
  "11:00 AM - 07:00 PM",
  "12:00 PM - 08:00 PM",
];
const initialStaffFormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  specialty: "",
  offDays: "",
  workingHours: "",
  description: "",
};
const initialStaffEditData = {
  name: "",
  specialty: "",
  workingHours: "",
  offDays: "",
  imageUrl: "",
  description: "",
};

const appendStaffProfileFields = (payload, source) => {
  payload.append("description", source.description || "");
};

const to12HourTime = (value) => {
  const [hourValue, minuteValue = "00"] = String(value || "").split(":");
  const hourNumber = Number(hourValue);
  if (Number.isNaN(hourNumber)) return "";

  const period = hourNumber >= 12 ? "PM" : "AM";
  const displayHour = hourNumber % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minuteValue.padStart(2, "0")} ${period}`;
};

const getWorkingHoursValue = (workingHours) => {
  if (!workingHours) return "";
  if (typeof workingHours === "string") return workingHours;
  return `${to12HourTime(workingHours.start)} - ${to12HourTime(workingHours.end)}`;
};

const getOffDayValue = (offDays) => {
  if (Array.isArray(offDays)) return offDays[0] || "";
  return offDays || "";
};

const offDayOptions = [
  { value: "", label: "No Regular Off Day" },
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
};

function SalonSelect({ id, label, value, onChange, options, placeholder = "Select an option", required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const normalizedOptions = options.map((option) => (
    typeof option === "string" ? { value: option, label: option } : option
  ));
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const visibleLabel = selectedOption?.label || placeholder;
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const chooseOption = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleButtonKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown"
        ? (activeIndex + 1) % normalizedOptions.length
        : (activeIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
      setActiveIndex(nextIndex);
      setIsOpen(true);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        chooseOption(normalizedOptions[activeIndex]);
      } else {
        const selectedIndex = normalizedOptions.findIndex((option) => option.value === value);
        setActiveIndex(Math.max(selectedIndex, 0));
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      <button
        id={id}
        type="button"
        onClick={() => {
          const selectedIndex = normalizedOptions.findIndex((option) => option.value === value);
          setActiveIndex(Math.max(selectedIndex, 0));
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-lg border bg-black/50 p-3 text-left text-white outline-none transition-all ${
          isOpen
            ? "border-[#d4af37] ring-1 ring-[#d4af37]"
            : "border-gray-700 hover:border-[#c5a880]/70"
        }`}
      >
        <span className={selectedOption ? "truncate text-white" : "truncate text-zinc-600"}>{visibleLabel}</span>
        <ChevronDown size={18} className={`shrink-0 text-[#d4af37] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={() => {}}
          required
          className="pointer-events-none absolute bottom-0 left-3 h-px w-px opacity-0"
        />
      )}

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="salon-scrollbar absolute z-[120] mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-[#d4af37]/20 bg-[#0c0c0c]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={`${id}-${option.value || "empty"}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  isSelected
                    ? "bg-[#d4af37]/15 text-[#f4d46f]"
                    : isActive
                      ? "bg-white/8 text-white"
                      : "text-gray-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={16} className="shrink-0 text-[#d4af37]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StaffManager() {
  const fieldClassName = "w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all";
  const minimalSelectClassName = "w-full bg-transparent text-white border-b border-zinc-700 rounded-none px-2 py-1.5 text-sm font-medium outline-none transition focus:border-[#c5a880] sm:w-auto sm:py-1";
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "leaves" ? "leaves" : "directory");
  const [staffList, setStaffList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [formData, setFormData] = useState(initialStaffFormData);
  const [phoneError, setPhoneError] = useState("");
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
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [editData, setEditData] = useState(initialStaffEditData);
  const [originalEditData, setOriginalEditData] = useState(initialStaffEditData);
  const [selectedEditImage, setSelectedEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const editFileInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const hasEditChanges = JSON.stringify(editData) !== JSON.stringify(originalEditData) || Boolean(selectedEditImage);
  const canAddStaff = Boolean(
    formData.name.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.password &&
    formData.specialty &&
    formData.workingHours
  );

  useEffect(() => {
    let isActive = true;
    axios
      .get(`${API_BASE_URL}/api/staff`, getAuthHeaders())
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

  useEffect(() => () => {
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
  }, [editImagePreview]);

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
    if (e.target.name === "phone" && phoneError) {
      setPhoneError("");
    }
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

  const handleEditImageChange = (file) => {
    if (!file) {
      setSelectedEditImage(null);
      setEditImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }

    setSelectedEditImage(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedEditImage = () => {
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
    setSelectedEditImage(null);
    setEditImagePreview("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (isAddingStaff || !canAddStaff) return;

    const normalizedPhone = formData.phone.replace(/[\s-]/g, "");
    if (!SRI_LANKAN_MOBILE_REGEX.test(normalizedPhone)) {
      const message = "Enter a valid Sri Lankan mobile number, such as 0771234567 or +94771234567.";
      setPhoneError(message);
      toast.error(message);
      return;
    }

    setPhoneError("");

    setIsAddingStaff(true);
    try {
      const authHeaders = getAuthHeaders();

      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("email", formData.email);
      payload.append("phone", normalizedPhone);
      payload.append("password", formData.password);
      payload.append("specialty", formData.specialty);
      appendStaffProfileFields(payload, formData);
      if (formData.offDays) {
        payload.append("offDays", formData.offDays);
      }

      if (selectedImage) {
        payload.append("image", selectedImage);
      }

      if (formData.workingHours) {
        payload.append("workingHours", formData.workingHours);
      }

      const response = await axios.post(`${API_BASE_URL}/api/staff/register`, payload, authHeaders);
      setStaffList((currentStaff) => [...currentStaff, response.data.staff]);
      setFormData(initialStaffFormData);
      setPhoneError("");
      clearSelectedImage();
      toast.success("Staff member added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add staff");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isDeletingStaff) return;

    setIsDeletingStaff(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/staff/${itemToDelete}`, getAuthHeaders());
      setStaffList((currentStaff) => currentStaff.filter((staff) => staff._id !== itemToDelete));
      toast.success("Staff member removed!");
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove staff");
    } finally {
      setIsDeletingStaff(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditModal = (staff) => {
    const nextEditData = {
      name: staff.name || "",
      specialty: staff.specialty,
      workingHours: getWorkingHoursValue(staff.workingHours),
      offDays: getOffDayValue(staff.offDays),
      imageUrl: staff.imageUrl || "",
      description: staff.description || "",
    };
    clearSelectedEditImage();
    setEditData(nextEditData);
    setOriginalEditData(nextEditData);
    setEditingId(staff._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (isUpdatingStaff || !hasEditChanges) return;

    setIsUpdatingStaff(true);
    try {
      const payload = new FormData();
      payload.append("name", editData.name);
      payload.append("specialty", editData.specialty);
      payload.append("workingHours", editData.workingHours);
      payload.append("offDays", editData.offDays);
      appendStaffProfileFields(payload, editData);
      if (selectedEditImage) {
        payload.append("image", selectedEditImage);
      }

      const response = await axios.put(`${API_BASE_URL}/api/staff/${editingId}`, payload, getAuthHeaders());
      const nextEditData = {
        name: response.data.name || "",
        specialty: response.data.specialty || "",
        workingHours: getWorkingHoursValue(response.data.workingHours),
        offDays: getOffDayValue(response.data.offDays),
        imageUrl: response.data.imageUrl || "",
        description: response.data.description || "",
      };
      setStaffList((currentStaff) => currentStaff.map((staff) => (staff._id === editingId ? response.data : staff)));
      setIsEditModalOpen(false);
      setOriginalEditData(nextEditData);
      clearSelectedEditImage();
      toast.success("Staff updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update staff");
    } finally {
      setIsUpdatingStaff(false);
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
            <label htmlFor="staff-phone" className="mb-1 block text-xs font-medium text-gray-400">Mobile Number</label>
            <input
              id="staff-phone"
              type="tel"
              name="phone"
              placeholder="+94......... or 07........"
              value={formData.phone}
              onChange={handleInputChange}
              required
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "staff-phone-error" : undefined}
              className={`${fieldClassName} ${phoneError ? "border-red-400 focus:border-red-400 focus:ring-red-400/30" : ""}`}
            />
            {phoneError && (
              <p id="staff-phone-error" role="alert" className="mt-1.5 text-xs leading-5 text-red-300">
                {phoneError}
              </p>
            )}
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
          <SalonSelect
            id="staff-specialty"
            label="Specialty"
            value={formData.specialty}
            onChange={(value) => setFormData((current) => ({ ...current, specialty: value }))}
            options={specialtyOptions}
            placeholder="Select Specialty"
            required
          />

          <SalonSelect
            id="staff-working-hours"
            label="Working Hours"
            value={formData.workingHours}
            onChange={(value) => setFormData((current) => ({ ...current, workingHours: value }))}
            options={workingHourOptions}
            placeholder="Select Working Hours"
            required
          />

          <SalonSelect
            id="staff-off-day"
            label="Weekly Off Day (Optional)"
            value={formData.offDays}
            onChange={(value) => setFormData((current) => ({ ...current, offDays: value }))}
            options={offDayOptions}
          />

          <div className="md:col-span-2 xl:col-span-3">
            <label htmlFor="staff-description" className="mb-1 block text-xs font-medium text-gray-400">Description</label>
            <textarea
              id="staff-description"
              name="description"
              placeholder="Add everything customers should know: experience, personality, specialties, strengths, preferred services, and any short notes for the AI concierge."
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              maxLength={600}
              className={`${fieldClassName} resize-none leading-6`}
            />
            <p className="mt-1.5 text-xs leading-5 text-gray-500">
              This is used by the concierge when users ask about staff.
            </p>
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
              disabled={!canAddStaff || isAddingStaff}
              className={`rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] ${mutedGoldButtonClassName}`}
            >
              {isAddingStaff ? "Adding..." : "+ Add Staff"}
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

      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/35 px-4 py-6 backdrop-blur-2xl backdrop-saturate-50">
          <GlassCard
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-staff-title"
            className="relative w-full max-w-md border-t-4 border-t-[#d4af37] bg-[#111111] p-8"
          >
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                clearSelectedEditImage();
              }}
              aria-label="Close dialog"
              className="absolute right-4 top-4 text-xl text-gray-400 hover:text-white"
            >
              x
            </button>
            <h3 id="edit-staff-title" className="salon-heading mb-6 border-b border-white/10 pb-4">Edit Staff Member</h3>
            <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
              <div>
                <label htmlFor="edit-staff-name" className="mb-1 block text-xs font-medium text-gray-400">Name</label>
                <input
                  id="edit-staff-name"
                  type="text"
                  value={editData.name}
                  onChange={(event) => setEditData((current) => ({ ...current, name: event.target.value }))}
                  required
                  className={fieldClassName}
                />
              </div>
              <SalonSelect
                id="edit-staff-specialty"
                label="Specialty"
                value={editData.specialty}
                onChange={(value) => setEditData((current) => ({ ...current, specialty: value }))}
                options={specialtyOptions}
                placeholder="Select Specialty"
                required
              />
              <SalonSelect
                id="edit-staff-working-hours"
                label="Working Hours"
                value={editData.workingHours}
                onChange={(value) => setEditData((current) => ({ ...current, workingHours: value }))}
                options={workingHourOptions}
                placeholder="Select Working Hours"
                required
              />
              <SalonSelect
                id="edit-staff-off-day"
                label="Weekly Off Day"
                value={editData.offDays}
                onChange={(value) => setEditData((current) => ({ ...current, offDays: value }))}
                options={offDayOptions}
              />
              <div>
                <label htmlFor="edit-staff-description" className="mb-1 block text-xs font-medium text-gray-400">Description</label>
                <textarea
                  id="edit-staff-description"
                  value={editData.description}
                  onChange={(event) => setEditData((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  maxLength={600}
                  placeholder="Add everything customers should know: experience, personality, specialties, strengths, preferred services, and any short notes for the AI concierge."
                  className={`${fieldClassName} resize-none leading-6`}
                />
                <p className="mt-1.5 text-xs leading-5 text-gray-500">
                  This is used by the concierge when users ask about staff.
                </p>
              </div>
              <div>
                <input
                  id="edit-staff-image"
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleEditImageChange(event.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="edit-staff-image"
                  className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-gray-700 bg-black/30 p-4 text-sm text-gray-300 transition hover:border-[#d4af37] hover:bg-black/40"
                >
                  {editImagePreview || editData.imageUrl ? (
                    <img
                      src={editImagePreview || editData.imageUrl}
                      alt="Staff preview"
                      className="h-16 w-16 shrink-0 rounded-full border border-[#d4af37]/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 16V7m0 0-3.5 3.5M12 7l3.5 3.5M4 17.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{selectedEditImage ? "Replacement image selected" : "Change staff image"}</span>
                    <span className="mt-1 block truncate text-xs text-gray-400">{selectedEditImage?.name || "Choose a new image file"}</span>
                  </span>
                </label>
                {selectedEditImage && (
                  <button
                    type="button"
                    onClick={clearSelectedEditImage}
                    className="mt-2 text-xs text-[#d4af37] hover:text-yellow-400"
                  >
                    Remove selected image
                  </button>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <GoldButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    clearSelectedEditImage();
                  }}
                  disabled={isUpdatingStaff}
                  className="bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </GoldButton>
                <GoldButton
                  type="submit"
                  disabled={!hasEditChanges || isUpdatingStaff}
                  className={`px-4 py-2 ${mutedGoldButtonClassName}`}
                >
                  {isUpdatingStaff ? "Saving..." : "Save Changes"}
                </GoldButton>
              </div>
            </form>
          </GlassCard>
        </div>,
        document.body
      )}

      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 px-4 backdrop-blur-2xl backdrop-saturate-50">
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
                disabled={isDeletingStaff}
                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </GoldButton>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeletingStaff}
                className="inline-flex items-center justify-center rounded-md bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingStaff ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </GlassCard>
        </div>,
        document.body
      )}
    </div>
  );
}

export default StaffManager;
