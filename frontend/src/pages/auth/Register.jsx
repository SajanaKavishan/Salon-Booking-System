import { useEffect, useMemo, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';
import { apiUrl } from '../../utils/apiConfig';
import { notifyAuthSessionChanged } from '../../utils/auth';
import { storage } from '../../utils/storage';
import {
  buildAuthIntentPath,
  sanitizeInternalPath,
  sanitizeServiceId,
} from '../../utils/authIntent';

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

const MIN_PASSWORD_LENGTH = 8;

const getRoleRedirectPath = (role, isFirstLogin = false) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  if (isFirstLogin) return '/onboarding';
  return '/dashboard';
};

const isValidPhoneNumber = (phoneValue) => {
  const trimmedPhone = phoneValue.trim();
  return /^(?:\+94|0)7[0-9]{8}$/.test(trimmedPhone);
};

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { name, email, phone, password } = formData;
  const safeNextPath = sanitizeInternalPath(searchParams.get('next'));
  const requestedServiceId = sanitizeServiceId(searchParams.get('serviceId'));
  const returnTo = safeNextPath || (requestedServiceId ? '/customer/book' : '/dashboard');
  const onboardingState = useMemo(() => ({
    returnTo,
    ...(requestedServiceId ? { preSelectedServiceId: requestedServiceId } : {}),
  }), [requestedServiceId, returnTo]);
  const loginPath = buildAuthIntentPath('/login', {
    nextPath: safeNextPath,
    serviceId: requestedServiceId,
  });

  useEffect(() => {
    const token = storage.get('token');
    const userRole = storage.get('userRole');

    if (!token || !userRole) return;

    let isFirstLogin = false;
    try {
      isFirstLogin = JSON.parse(storage.get('user', '{}'))?.isFirstLogin === true;
    } catch {
      isFirstLogin = false;
    }

    if (userRole === 'customer' && isFirstLogin) {
      navigate('/onboarding', { replace: true, state: onboardingState });
      return;
    }

    const redirectPath = safeNextPath
      || (userRole === 'customer' && requestedServiceId
        ? '/customer/book'
        : getRoleRedirectPath(userRole, false));
    navigate(redirectPath, {
      replace: true,
      ...(userRole === 'customer' && requestedServiceId
        ? { state: { preSelectedServiceId: requestedServiceId } }
        : {}),
    });
  }, [navigate, onboardingState, requestedServiceId, safeNextPath]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      toast.error('Enter a valid Sri Lankan mobile number, such as 0771234567 or +94771234567.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/users/register'), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        ...(safeNextPath ? { next: safeNextPath } : {}),
        ...(requestedServiceId ? { serviceId: requestedServiceId } : {}),
      });

      storage.set('token', response.data.token);
      storage.set('userRole', response.data.role || 'customer');
      storage.set('userName', response.data.name || '');
      storage.set(
        'user',
        JSON.stringify({
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          preferredStylist: response.data.preferredStylist || '',
          profileImage: response.data.profileImage || '',
          isFirstLogin: response.data.isFirstLogin ?? true,
          role: response.data.role || 'customer',
        })
      );

      notifyAuthSessionChanged();
      toast.success('Registration successful!');
      navigate('/onboarding', { state: onboardingState });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      backgroundStyle={{
        backgroundImage: "url('/registerBg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center lg:justify-between lg:gap-12">
      <motion.div
        className="hidden w-full max-w-xl flex-col lg:flex lg:pr-8"
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
          <span className="text-xs uppercase tracking-[0.35em] text-gray-300">Start Your Client Account</span>
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
        className="w-full max-w-md"
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
          <span className="mt-3 text-xs uppercase tracking-[0.35em] text-gray-300">
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
              <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-gray-300">Full Name</label>
              <input
                id="register-name"
                type="text"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your full name"
                required
                autoComplete="name"
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required
                autoComplete="email"
                inputMode="email"
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="mb-2 block text-sm font-medium text-gray-300">Phone Number</label>
              <input
                id="register-phone"
                type="tel"
                name="phone"
                value={phone}
                onChange={onChange}
                placeholder="0771234567 or +94771234567"
                required
                autoComplete="tel"
                inputMode="tel"
                pattern={String.raw`(?:\+94|0)7[0-9]{8}`}
                title="Enter a valid Sri Lankan mobile number, such as 0771234567 or +94771234567."
                className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder="Create a password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full rounded-md bg-slate-100 px-4 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] transition-all duration-300"
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
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
              aria-busy={isLoading}
              whileTap={{ scale: 0.99 }}
              className="mt-5 flex w-full items-center justify-center rounded-md bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:scale-[1.01] hover:bg-[#b8952e] active:scale-[0.99]"
            >
              {isLoading ? <Spinner label="Creating account..." /> : 'Create Account'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to={loginPath} className="font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
      </div>
    </AuthShell>
  );
}

export default Register;
