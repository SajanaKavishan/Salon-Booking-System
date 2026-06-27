import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getRoleRedirectPath = (role, isFirstLogin = false) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  if (isFirstLogin) return '/onboarding';
  return '/dashboard';
};

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { email, password } = formData;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userRole) return;

    let isFirstLogin = false;
    try {
      isFirstLogin = JSON.parse(localStorage.getItem('user') || '{}')?.isFirstLogin === true;
    } catch {
      isFirstLogin = false;
    }

    navigate(getRoleRedirectPath(userRole, isFirstLogin), { replace: true });
  }, [navigate]);

  const getRedirectPath = (role, isFirstLogin = false) => {
    if (role === 'admin') return '/admin';
    if (role === 'staff') return '/staff/dashboard';
    if (isFirstLogin) return '/onboarding';

    const next = searchParams.get('next');
    if (next?.startsWith('/') && !next.startsWith('//')) return next;

    return '/booking';
  };

  const redirectAfterLogin = (role, isFirstLogin = false) => {
    const redirectPath = getRedirectPath(role, isFirstLogin);
    const serviceId = searchParams.get('serviceId');

    navigate(
      redirectPath,
      role === 'customer' && serviceId
        ? { state: { preSelectedServiceId: serviceId } }
        : undefined
    );
  };

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
      const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
        email: email.trim(),
        password,
      });
      const { token, role = 'customer', name, email: responseEmail, _id: id, phone = '', preferredStylist = '', profileImage = '', isFirstLogin = false } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name || '');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id,
          name,
          email: responseEmail || email.trim(),
          phone,
          preferredStylist,
          profileImage,
          isFirstLogin,
          role,
        })
      );

      toast.success('Welcome back to Salon DEES!');
      redirectAfterLogin(role, isFirstLogin);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const response = await axios.post(`${API_BASE_URL}/api/users/google-login`, {
          token: tokenResponse.access_token
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userRole', response.data.role);
        localStorage.setItem('userName', response.data.name || '');
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: response.data._id,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone || '',
            preferredStylist: response.data.preferredStylist || '',
            profileImage: response.data.profileImage || '',
            isFirstLogin: response.data.isFirstLogin || false,
            role: response.data.role,
          })
        );

        toast.success('Successfully logged in with Google!');
        redirectAfterLogin(response.data.role, response.data.isFirstLogin || false);
      } catch {
        toast.error('Google login failed on our server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error('Google authentication failed!');
    }
  });

  return (
    <AuthShell
      backgroundStyle={{
        backgroundImage: "url('/loginBg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center lg:flex-row lg:justify-between lg:gap-16">
          <motion.div
            className="hidden w-full flex-col gap-8 lg:flex lg:w-1/2 lg:pr-6"
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
              <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400">Luxury Salon Experience</span>
            </motion.div>

            <div className="space-y-4">
              <motion.p className="text-[11px] uppercase tracking-[0.4em] text-[#d4af37]" variants={itemVariants}>
                Member Sign In
              </motion.p>
              <motion.div variants={itemVariants}>
                <h1 className="text-4xl font-serif leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                  Step back into your booking space.
                </h1>
              </motion.div>
              <motion.div variants={itemVariants}>
                <p className="max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
                  Review appointments, manage visits, and keep your salon experience moving without friction.
                </p>
              </motion.div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Fast access to appointments and account details',
                'Same dark and gold experience across every visit',
                'Staff and admin routing handled automatically',
                'Google sign-in still available'
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
            className="flex w-full justify-center lg:w-1/2 lg:justify-end"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="w-full">
              <div className="mb-6 flex flex-col items-center lg:hidden">
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
              <div className="mx-auto w-full rounded-2xl border border-white/10 bg-[#111111]/75 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl sm:max-w-lg sm:p-10 lg:max-w-md">
              <div className="text-center">
                <h2 className="text-3xl font-serif text-white sm:text-4xl">Sign In</h2>
                <p className="mt-2 text-sm text-gray-400">Enter your details to access your account.</p>
              </div>

              <form onSubmit={onSubmit} className="mt-8 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="you@email.com"
                    required
                    className="w-full rounded-md bg-[#edf2ff] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-gray-400">Password</label>
                    <span className="text-xs font-medium text-gray-500">Secure account access</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={onChange}
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-md bg-[#edf2ff] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
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
                  className="flex w-full items-center justify-center rounded-md bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:bg-[#b8952e] hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isLoading ? <Spinner /> : 'Sign In'}
                </motion.button>
              </form>

              <div className="my-8 flex items-center gap-4 text-xs text-gray-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>Or continue with</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-black/90 px-4 py-3 text-sm text-gray-200 transition duration-300 hover:bg-white/10"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M19.64 10.2045C19.64 9.51136 19.5777 8.84659 19.4614 8.20455H10V12.0057H15.4023C15.1693 13.2614 14.4568 14.3239 13.3943 15.0341V17.5H16.6477C18.5489 15.75 19.64 13.2159 19.64 10.2045Z" fill="#4285F4" />
                  <path d="M10 20C12.7 20 14.9625 19.1023 16.6477 17.5L13.3943 15.0341C12.4943 15.6364 11.3386 16 10 16C7.38977 16 5.17614 14.2386 4.38636 11.875H1.05V14.4602C2.69318 17.7216 6.07955 20 10 20Z" fill="#34A853" />
                  <path d="M4.38636 11.875C4.1875 11.2784 4.07386 10.6477 4.07386 10C4.07386 9.35227 4.1875 8.72159 4.38636 8.125V5.53977H1.05C0.377273 6.875 0 8.39773 0 10C0 11.6023 0.377273 13.125 1.05 14.4602L4.38636 11.875Z" fill="#FBBC05" />
                  <path d="M10 4C11.4716 4 12.7955 4.50568 13.8352 5.51136L16.7159 2.63068C14.9568 0.994318 12.6943 0 10 0C6.07955 0 2.69318 2.27841 1.05 5.53977L4.38636 8.125C5.17614 5.76136 7.38977 4 10 4Z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>

              <p className="mt-8 text-center text-sm text-gray-400">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline">
                  Register now
                </Link>
              </p>
              </div>
            </div>
          </motion.div>
      </div>
    </AuthShell>
  );
}

export default Login;
