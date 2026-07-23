import { useEffect, useMemo, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';
import { apiUrl } from '../../utils/apiConfig';
import { getStoredSession, notifyAuthSessionChanged } from '../../utils/auth';
import { storage } from '../../utils/storage';
import {
  buildAuthIntentPath,
  sanitizeInternalPath,
  sanitizeServiceId,
} from '../../utils/authIntent';

const isGoogleOAuthConfigured = Boolean(
  String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
);

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
  const safeNextPath = sanitizeInternalPath(searchParams.get('next'));
  const requestedServiceId = sanitizeServiceId(searchParams.get('serviceId'));
  const registerPath = buildAuthIntentPath('/register', {
    nextPath: safeNextPath,
    serviceId: requestedServiceId,
  });

  const onboardingState = useMemo(() => ({
    returnTo: safeNextPath || (requestedServiceId ? '/customer/book' : '/dashboard'),
    ...(requestedServiceId ? { preSelectedServiceId: requestedServiceId } : {}),
  }), [requestedServiceId, safeNextPath]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) return;

    const isFirstLogin = session.user?.isFirstLogin === true;

    if (session.userRole === 'customer' && isFirstLogin) {
      navigate('/onboarding', { replace: true, state: onboardingState });
      return;
    }

    const redirectPath = safeNextPath
      || (session.userRole === 'customer' && requestedServiceId
        ? '/customer/book'
        : getRoleRedirectPath(session.userRole, isFirstLogin));
    navigate(redirectPath, {
      replace: true,
      ...(session.userRole === 'customer' && requestedServiceId
        ? { state: { preSelectedServiceId: requestedServiceId } }
        : {}),
    });
  }, [navigate, onboardingState, requestedServiceId, safeNextPath]);

  const getRedirectPath = (role, isFirstLogin = false) => {
    if (role === 'customer' && isFirstLogin) return '/onboarding';
    if (safeNextPath) return safeNextPath;
    if (role === 'customer' && requestedServiceId) return '/customer/book';

    if (role === 'admin') return '/admin';
    if (role === 'staff') return '/staff/dashboard';

    return '/dashboard';
  };

  const redirectAfterLogin = (role, isFirstLogin = false) => {
    if (role === 'customer' && isFirstLogin) {
      navigate('/onboarding', { state: onboardingState });
      return;
    }

    const redirectPath = getRedirectPath(role, false);

    navigate(
      redirectPath,
      role === 'customer' && requestedServiceId
        ? { state: { preSelectedServiceId: requestedServiceId } }
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

    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/users/login'), {
        email: email.trim(),
        password,
      });
      const { token, role = 'customer', name, email: responseEmail, _id: id, phone = '', preferredStylist = '', profileImage = '', isFirstLogin = false } = response.data;

      storage.set('token', token);
      storage.set('userRole', role);
      storage.set('userName', name || '');
      storage.set(
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

      notifyAuthSessionChanged();
      redirectAfterLogin(role, isFirstLogin);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      toast.error('Google did not return a valid identity credential.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(apiUrl('/api/users/google-login'), { idToken });

      storage.set('token', response.data.token);
      storage.set('userRole', response.data.role);
      storage.set('userName', response.data.name || '');
      storage.set(
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

      notifyAuthSessionChanged();
      redirectAfterLogin(response.data.role, response.data.isFirstLogin || false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google login failed on our server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      backgroundStyle={{
        backgroundImage: "url('/loginBg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
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
              <span className="text-xs uppercase tracking-[0.35em] text-gray-300">Luxury Salon Experience</span>
            </motion.div>

            <div className="space-y-4">
              <motion.p className="text-xs uppercase tracking-[0.4em] text-[#d4af37]" variants={itemVariants}>
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
                <span className="mt-3 text-xs uppercase tracking-[0.35em] text-gray-300">
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
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-400">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-md bg-[#edf2ff] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="login-password" className="text-sm font-medium text-gray-400">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={onChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-md bg-[#edf2ff] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
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
                  className="flex w-full items-center justify-center rounded-md bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:bg-[#b8952e] hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isLoading ? <Spinner label="Signing in..." /> : 'Sign In'}
                </motion.button>
              </form>

              <div className="my-8 flex items-center gap-4 text-xs text-gray-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>Or continue with</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className={`group relative mx-auto h-10 w-full max-w-[300px] overflow-hidden rounded-lg border border-white/10 bg-black shadow-sm transition-all duration-200 ease-out hover:border-white/20 hover:bg-[#0a0a0a] hover:shadow-md focus-within:ring-2 focus-within:ring-[#d4af37]/50 ${
                isLoading || !isGoogleOAuthConfigured ? 'pointer-events-none opacity-60' : ''
              }`}>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2.5"
                >
                  <FcGoogle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium text-white">Sign in with Google</span>
                </div>
                {isGoogleOAuthConfigured ? (
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => toast.error('Google authentication failed!')}
                    theme="filled_black"
                    size="large"
                    shape="rectangular"
                    text="signin_with"
                    logo_alignment="left"
                    width="300"
                    useOneTap={false}
                    containerProps={{
                      className: 'absolute inset-0 z-10 w-full cursor-pointer opacity-0',
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-label="Google sign-in is unavailable"
                    title="Google sign-in is unavailable"
                    className="absolute inset-0 z-10 w-full cursor-not-allowed opacity-0"
                  />
                )}
              </div>

              <p className="mt-8 text-center text-sm text-gray-400">
                Don&apos;t have an account?{' '}
                <Link to={registerPath} className="font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline">
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
