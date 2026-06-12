import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { name, email, phone, password } = formData;

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
      const response = await axios.post('http://localhost:5000/api/users/register', formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          preferredStylist: response.data.preferredStylist || '',
          profileImage: response.data.profileImage || '',
          role: response.data.role || 'customer',
        })
      );

      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8"
      style={{ backgroundImage: "url('/registerBg.jpg')" }}
    >
      <div className="salon-page-overlay fixed inset-0" aria-hidden="true" />
      <motion.div
        className="relative z-10 hidden lg:flex flex-col max-w-xl pr-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-2xl font-serif tracking-[0.2em] text-white sm:text-3xl"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[#d4af37] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <Scissors className="h-5 w-5" />
            </span>
            <span>
              Salon<span className="text-[#d4af37]">DEES</span>
            </span>
          </button>
          <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400">Start Your Client Account</span>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8">
          <h1 className="text-4xl font-serif leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Create your account and book in style.
          </h1>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-4">
          <p className="max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
            Set up your profile once, then move through future bookings with less friction and a more polished client experience.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4">
          {[
            'Your profile stays ready for faster bookings',
            'Upcoming and past visits stay connected to one account',
            'You can move straight into the booking flow after sign up'
          ].map((item) => (
            <motion.div key={item} variants={itemVariants}>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/50 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#d4af37]/15 text-[#d4af37]">
                  <Check className="h-4 w-4" />
                </span>
                <p className="text-[13px] leading-6 text-gray-300">{item}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      >
        <div className="block lg:hidden flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 text-2xl font-serif tracking-[0.2em] text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[#d4af37] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <Scissors className="h-5 w-5" />
            </span>
            <span>
              Salon<span className="text-[#d4af37]">DEES</span>
            </span>
          </div>
          <span className="mt-3 text-[11px] uppercase tracking-[0.35em] text-gray-400">
            Luxury Salon Experience
          </span>
        </div>

        <div className="bg-[#111111]/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl p-6 sm:p-8 w-full">
          <div className="text-center">
            <h2 className="text-3xl font-serif text-white sm:text-4xl">Create your account</h2>
            <p className="mt-2 text-sm text-gray-400">
              Join Salon DEES and step into a smoother booking experience.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Full Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={onChange}
                placeholder="Enter your phone number"
                required
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder="Create a password"
                  required
                  className="w-full rounded-md bg-slate-100 px-4 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-[#d4af37]"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.99 }}
              className="mt-5 flex w-full items-center justify-center rounded-md bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:scale-[1.01] hover:bg-[#b8952e] active:scale-[0.99]"
            >
              {isLoading ? <Spinner /> : 'Create Account'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
