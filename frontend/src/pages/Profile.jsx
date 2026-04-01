import React, { useState } from 'react'; 
import axios from 'axios';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';

function Profile() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : { name: '', email: '', role: '' };
  });
  
  const [password, setPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // When changing the name or email input fields, we update the user state with the new values. The onChange function takes the event object, extracts the name of the input field (either 'name' or 'email') and its value, and updates the corresponding property in the user state using the spread operator to keep the other properties unchanged.
  const onChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // When the user submits the form to update their profile, we send a PUT request to the backend API with the updated name, email, and optionally a new password. We also include the authentication token in the request headers to ensure that only authenticated users can update their profiles. If the update is successful, we update the user information in localStorage and show a success toast notification. If there's an error, we show an error toast notification with the error message from the backend.
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

      // Data for the PUT request, we include the updated name and email from the user state, and if a new password is provided, we include that as well. The backend will handle updating only the fields that are provided, so if the password is left blank, it will keep the existing password.
      const updateData = {
        name: user.name,
        email: user.email,
      };
      if (password) {
        updateData.password = password;
      }

      // Send the PUT request to the backend API to update the user's profile. The endpoint is /api/users/profile, and we include the updated data and the authentication token in the request. If the request is successful, we get the updated user information in the response, which we then use to update the user information in localStorage so that it reflects the changes immediately in the UI.
      const response = await axios.put('http://localhost:5000/api/users/profile', updateData, config);

      // After successfully updating the profile, we update the user information in localStorage with the new name, email, and role from the response. This ensures that the updated profile information is stored locally and can be accessed throughout the app without needing to refresh or log out and back in.
      localStorage.setItem('user', JSON.stringify({
        id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
      }));

      toast.success("Profile updated successfully! ");
      setPassword(''); // After updating, we clear the password field for security reasons, so that the new password is not visible in the input field after the update.

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border-t-4 border-blue-500 dark:border-blue-400 transition-colors duration-300">
          
          <div className="bg-gradient-to-r from-blue-200 to-blue-100 dark:from-gray-800 dark:to-gray-700 h-32 relative transition-colors duration-300">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              <div className="w-24 h-24 bg-blue-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-4xl font-bold shadow-md transition-colors duration-300">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{user.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300 capitalize mt-1 border border-gray-200 dark:border-slate-700 inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                {user.role} Account
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6 max-w-lg mx-auto">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={user.name || ''} 
                  onChange={onChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={user.email || ''} 
                  onChange={onChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password (Optional)</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 transform hover:-translate-y-1'
                  }`}
                >
                  {isLoading ? <Spinner /> : 'Update Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

