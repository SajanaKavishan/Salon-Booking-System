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
      const response = await axios.post('http://localhost:5000/api/users/register', formData);
      
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
      navigate('/dashboard'); 
      
    } catch (error) {
      console.error("Registration Failed:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* Background Image Container */
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 font-sans text-white selection:bg-[#d4af37] selection:text-black bg-[url('/registerBg.jpg')] bg-cover bg-center bg-no-repeat fixed bg-fixed">
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* Logo */}
        <div className="text-4xl font-bold tracking-widest mb-10 cursor-pointer drop-shadow-lg" onClick={() => navigate('/')}>
          Salon<span className="text-[#d4af37]">DEES</span>
        </div>

        {/* Register Card - Glass effect (backdrop-blur-md) */}
        <div className="bg-[#111111]/70 backdrop-blur-md p-8 md:p-10 rounded-xl border border-white/10 shadow-2xl w-full max-w-md">
          
          {/* Title Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif mb-2 text-white">
              Create an Account
            </h2>
            <p className="text-gray-300 font-light text-sm">
              Join our Salon Booking System today!
            </p>
          </div>
          
          {/* Register Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your full name"
                required 
                className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required 
                className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="Create a password"
                required 
                className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full text-black font-semibold py-3 px-4 rounded-md transition duration-300 text-lg flex justify-center items-center mt-6 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] ${
                isLoading ? 'bg-yellow-600/70 cursor-not-allowed' : 'bg-[#d4af37] hover:bg-yellow-400'
              }`}
            >
              {isLoading ? <Spinner /> : 'Register'}
            </button>
          </form>

          {/* Already have an account? */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account? <a href="/login" className="text-[#d4af37] hover:text-yellow-400 font-semibold hover:underline transition">Log in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;