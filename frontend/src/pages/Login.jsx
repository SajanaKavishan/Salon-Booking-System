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
    setIsLoading(true); 

    try {
      const response = await axios.post('http://localhost:5000/api/users/login', formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
        })
      );

      toast.success("Login successful!");
      
      if (response.data.role === 'admin') {
        navigate('/admin'); 
      } else {
        navigate('/dashboard'); 
      }
      
    } catch {
      toast.error("Login failed: enter correct email and password.");
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4 transition-colors duration-300">
      
      {/* Login Card */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600 dark:border-blue-500 transition-colors duration-300">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">
            Salon Booking
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Please login to your account
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              placeholder="Enter your email"
              required 
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              required 
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading} 
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'
            }`}
          >
            {isLoading ? <Spinner /> : 'Login'}
          </button>
          
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
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