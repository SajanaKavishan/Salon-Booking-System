import { useState } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';
import { useGoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  
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

      toast.success("Welcome back to Salon DEES!");
      
      if (response.data.role === 'admin') {
        navigate('/admin'); 
      } else {
        navigate('/dashboard'); 
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Check your email & password.");
    } finally {
      setIsLoading(false); 
    }
  };

  // Google Login Function
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const response = await axios.post('http://localhost:5000/api/users/google-login', {
          token: tokenResponse.access_token
        });

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

        toast.success("Successfully logged in with Google!");
        navigate(response.data.role === 'admin' ? '/admin' : '/dashboard');

      } catch {
        toast.error("Google login failed on our server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error("Google authentication failed!");
    }
  });

  return (
    /* Background Image Container */
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 font-sans text-white selection:bg-[#d4af37] selection:text-black bg-[url('/loginBg.jpg')] bg-cover bg-center bg-no-repeat fixed bg-fixed">
      
      {/* Dark Overlay (80% Black) */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* Logo */}
        <div className="text-4xl font-bold tracking-widest mb-10 cursor-pointer drop-shadow-lg" onClick={() => navigate('/')}>
          Salon<span className="text-[#d4af37]">DEES</span>
        </div>

        {/* Login Card - Glass effect */}
        <div className="bg-[#111111]/70 backdrop-blur-md p-8 md:p-10 rounded-xl border border-white/10 shadow-2xl w-full max-w-md">
          
          {/* Title Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif mb-2 text-white">
              Sign In
            </h2>
            <p className="text-gray-300 font-light text-sm">
              Enter your details to access your account
            </p>
          </div>
          
          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            
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
                placeholder="you@email.com"
                required 
                className="w-full bg-[#0a0a0a]/80 border border-white/10 p-3 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                {/* Forgot Password Link */}
                <span 
                  onClick={() => navigate('/forgot-password')} 
                  className="text-xs text-[#d4af37] hover:text-yellow-400 transition cursor-pointer font-medium"
                >
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder="Enter your password"
                  required 
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

            {/* Submit Button (Updated to Gold) */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className={`w-full text-black font-semibold py-3 px-4 rounded-md transition duration-300 text-lg flex justify-center items-center mt-6 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] ${
                isLoading ? 'bg-yellow-600/70 cursor-not-allowed' : 'bg-[#d4af37] hover:bg-yellow-400'
              }`}
            >
              {isLoading ? <Spinner /> : 'Sign In'}
            </button>
            
          </form>

          {/* Or Continue With */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#111111] text-gray-400 rounded-full">Or continue with</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-[#0a0a0a]/80 hover:bg-white/10 text-gray-200 border border-white/10 py-3 px-4 rounded-md transition duration-300 flex justify-center items-center gap-3 backdrop-blur-sm"
          >
            {/* Google Icon (SVG) */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.64 10.2045C19.64 9.51136 19.5777 8.84659 19.4614 8.20455H10V12.0057H15.4023C15.1693 13.2614 14.4568 14.3239 13.3943 15.0341V17.5H16.6477C18.5489 15.75 19.64 13.2159 19.64 10.2045Z" fill="#4285F4"/>
              <path d="M10 20C12.7 20 14.9625 19.1023 16.6477 17.5L13.3943 15.0341C12.4943 15.6364 11.3386 16 10 16C7.38977 16 5.17614 14.2386 4.38636 11.875H1.05V14.4602C2.69318 17.7216 6.07955 20 10 20Z" fill="#34A853"/>
              <path d="M4.38636 11.875C4.1875 11.2784 4.07386 10.6477 4.07386 10C4.07386 9.35227 4.1875 8.72159 4.38636 8.125V5.53977H1.05C0.377273 6.875 0 8.39773 0 10C0 11.6023 0.377273 13.125 1.05 14.4602L4.38636 11.875Z" fill="#FBBC05"/>
              <path d="M10 4C11.4716 4 12.7955 4.50568 13.8352 5.51136L16.7159 2.63068C14.9568 0.994318 12.6943 0 10 0C6.07955 0 2.69318 2.27841 1.05 5.53977L4.38636 8.125C5.17614 5.76136 7.38977 4 10 4Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400 font-light">
              Don't have an account?{' '}
              <span 
                onClick={() => navigate('/register')} 
                className="text-[#d4af37] font-medium hover:text-yellow-400 transition cursor-pointer hover:underline"
              >
                Register Now
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;