import { useState } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // Loading state 
  const [isLoading, setIsLoading] = useState(false); 

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // After the user clicks the login button, we set the loading state to true to indicate that the login process has started. This will trigger the UI to show a loading spinner on the login button and disable it to prevent multiple submissions while the login request is being processed.
    setIsLoading(true); 
    console.log("Your data:", formData);

    try {
      const response = await axios.post('http://localhost:5000/api/users/login', formData);
      
      // Save the token and user info in localStorage for later use
      localStorage.setItem('token', response.data.token);
      
      // Save user info (except password) in localStorage
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
        })
      );

      console.log("Login Success:", response.data);
      toast.success("Login successful!");
      
      // Navigate based on role
      if (response.data.role === 'admin') {
        navigate('/admin'); 
      } else {
        navigate('/dashboard'); 
      }
      
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message || error.message);
      toast.error("Login failed: enter correct email and password.");
    } finally {
      // After the login attempt is completed (whether successful or failed), we set the loading state back to false to re-enable the login button and hide the loading spinner, allowing the user to try logging in again if needed.
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-800">
            Salon Booking System
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Please login to your account
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              placeholder="Enter your email"
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading} // As we set the loading state to true when the login process starts, we disable the login button to prevent multiple clicks and submissions while the login request is being processed. This ensures that the user cannot accidentally submit the form multiple times while waiting for a response from the server.
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'
            }`}
          >
            {/* If loading, show spinner; otherwise, show login text */}
            {isLoading ? <Spinner /> : 'Login'}
          </button>
          
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <span 
              onClick={() => navigate('/register')} 
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Register here
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Login;