import { useState } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { name, email, password } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Registering User:", formData);

    try {
      // Here we send a POST request to the backend to create a new user with the registration data. If successful, we save the returned token and user info in localStorage, just like we do in the login process, so that the user can be automatically logged in after registering. Finally, we navigate the user to the dashboard.
      const response = await axios.post('http://localhost:5000/api/users/register', formData);
      
      // After successful registration, we save the token and user info in localStorage so that the user can be automatically logged in. This is similar to what we do in the login process, allowing for a seamless experience where the user doesn't have to log in immediately after registering. We also navigate the user to the dashboard right after registration.
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

      console.log("Registration Success:", response.data);
      toast.success("Registration successful!");
      navigate('/dashboard'); // After successful registration, we navigate the user to the dashboard where they can start booking appointments and managing their account.
      
    } catch (error) {
      console.error("Registration Failed:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-800">
            Create an Account
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Join our Salon Booking System today!
          </p>
        </div>
        
        {/* Register Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          
          {/* Name Input */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={onChange}
              placeholder="Enter your full name"
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
            />
          </div>

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
              placeholder="Create a password"
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg mt-4 ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'
            }`}
          >
            {isLoading ? <Spinner /> : 'Register'}
          </button>
          
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <span 
              onClick={() => navigate('/login')} 
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Login here
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Register;