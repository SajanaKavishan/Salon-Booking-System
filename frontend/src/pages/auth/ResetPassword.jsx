import { useEffect, useRef, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Scissors } from 'lucide-react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';
import { apiUrl } from '../../utils/apiConfig';
import { clearAuthStorage } from '../../utils/auth';

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [resetSucceeded, setResetSucceeded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const onChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (isLoading || resetSucceeded) return;

    setMessage('');
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.put(apiUrl(`/api/users/reset-password/${token}`), {
        password: formData.password,
      });

      clearAuthStorage();
      const successMessage = response.data?.message || 'Password reset successful. You can now sign in.';
      setMessage(successMessage);
      setResetSucceeded(true);
      toast.success(successMessage);

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }

      redirectTimerRef.current = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (requestError) {
      const errorMessage = requestError.response?.data?.message || 'Unable to reset password. Please request a new link.';
      toast.error(errorMessage);
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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111]/80 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div variants={itemVariants} className="mb-8 flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mx-auto flex items-center justify-center gap-3 text-2xl font-serif tracking-[0.2em] text-white sm:text-3xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[#d4af37] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <Scissors className="h-5 w-5" />
              </span>
              <span>
                Salon<span className="text-[#d4af37]">DEES</span>
              </span>
            </button>
            <span className="text-xs uppercase tracking-[0.35em] text-[#d4af37]">Secure Reset</span>
            <p className="pt-2 text-sm leading-6 text-gray-400">
              Create a new password for your Salon DEES account.
            </p>
          </motion.div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-sm font-medium text-gray-400">New Password</label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-md bg-[#edf2ff] px-4 py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                />
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-[#d4af37]"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Use at least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="mb-2 block text-sm font-medium text-gray-400">Confirm New Password</label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={onChange}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-md bg-[#edf2ff] px-4 py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                />
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-[#d4af37]"
                >
                  {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            {message && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200"
              >
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || resetSucceeded}
              aria-busy={isLoading}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center rounded-md bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:bg-[#b8952e] hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Spinner label="Resetting password..." /> : 'Reset Password'}
            </motion.button>
          </form>

          <Link
            to="/login"
            className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 transition hover:text-[#d4af37]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    </AuthShell>
  );
}

export default ResetPassword;
