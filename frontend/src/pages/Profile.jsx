import React, { useState } from 'react'; 
import axios from 'axios';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function Profile() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : { name: '', email: '', role: '' };
  });
  
  const [password, setPassword] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Look for the user in localStorage on component mount and update state
  const [isEditing, setIsEditing] = useState(false);

  const onChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // Clicking Cancel will exit Edit Mode and reset any unsaved changes
  const handleCancel = () => {
    setIsEditing(false);
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setPassword('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const updateData = {
        name: user.name,
        email: user.email,
      };
      if (password) {
        updateData.password = password;
      }

      const response = await axios.put('http://localhost:5000/api/users/profile', updateData, config);

      localStorage.setItem('user', JSON.stringify({
        id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
      }));

      toast.success("Profile updated successfully!");
      setPassword(''); 
      setIsEditing(false); // Exit Edit Mode after successful update

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-white selection:bg-[#d4af37] selection:text-black bg-[url('/profileBg.jpg')] bg-cover bg-center bg-no-repeat fixed bg-fixed">
      
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      <div className="relative z-10 w-full max-w-3xl mx-auto">
        
        <div className="bg-[#111111]/70 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-white/10 w-full">
          
          <div className="bg-gradient-to-r from-black/80 to-[#d4af37]/20 h-32 relative border-b border-white/5">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              <div className="w-24 h-24 bg-[#0a0a0a] rounded-full border-4 border-[#111111] ring-2 ring-[#d4af37] flex items-center justify-center text-[#d4af37] text-4xl font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif text-white mb-2">{user.name}</h2>
              <p className="text-sm text-[#d4af37] capitalize mt-1 border border-[#d4af37]/30 inline-block px-4 py-1 rounded-full bg-[#d4af37]/10 tracking-wider">
                {user.role} Account
              </p>
            </div>

            {/* View or Edit Mode */}
            {!isEditing ? (
              // VIEW MODE (Dsiplay user info) 
              <div className="max-w-lg mx-auto space-y-6">
                <div className="bg-[#0a0a0a]/60 border border-white/10 p-5 rounded-lg">
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-lg text-gray-200">{user.name}</p>
                  </div>
                  <div className="border-t border-white/5 my-4"></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-lg text-gray-200">{user.email}</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full text-black font-semibold py-3 px-4 rounded-md transition duration-300 text-lg flex justify-center items-center shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] bg-[#d4af37] hover:bg-yellow-400"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            ) : (
              // EDIT MODE (Form to update user info)
              <form onSubmit={handleUpdate} className="space-y-6 max-w-lg mx-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={user.name || ''} 
                    onChange={onChange}
                    required
                    className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={user.email || ''} 
                    onChange={onChange}
                    required
                    className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password (Optional)</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 pr-12 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#d4af37] transition-colors focus:outline-none"
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="w-full sm:w-1/3 text-gray-300 font-semibold py-3 px-4 rounded-md transition duration-300 bg-[#1a1a1a] border border-white/10 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full sm:w-2/3 text-black font-semibold py-3 px-4 rounded-md transition duration-300 flex justify-center items-center shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] ${
                      isLoading ? 'bg-yellow-600/70 cursor-not-allowed' : 'bg-[#d4af37] hover:bg-yellow-400'
                    }`}
                  >
                    {isLoading ? <Spinner /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;