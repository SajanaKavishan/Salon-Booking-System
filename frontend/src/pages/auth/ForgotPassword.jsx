import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';
import { apiUrl } from '../../utils/apiConfig';

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const GENERIC_RECOVERY_MESSAGE = 'If an account exists with that email, a password reset link has been sent.';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setMessage('');

    try {
      await axios.post(apiUrl('/api/users/forgot-password'), {
        email: email.trim(),
      });

      setMessage(GENERIC_RECOVERY_MESSAGE);
      toast.success(GENERIC_RECOVERY_MESSAGE);
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setMessage(GENERIC_RECOVERY_MESSAGE);
        toast.success(GENERIC_RECOVERY_MESSAGE);
        return;
      }

      const errorMessage = requestError.response?.data?.message || 'Unable to send reset link. Please try again.';
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
            <span className="text-[11px] uppercase tracking-[0.35em] text-[#d4af37]">Account Recovery</span>
            <p className="pt-2 text-sm leading-6 text-gray-400">
              Enter your account email and we will send you a secure reset link.
            </p>
          </motion.div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-medium text-gray-400">Email Address</label>
              <div className="relative">
                <input
                  id="forgot-password-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full rounded-md bg-[#edf2ff] px-4 py-3 pl-11 text-sm text-gray-900 placeholder:text-gray-500 shadow-inner transition-all duration-300 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                />
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {message && (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">
                {message}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center rounded-md bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(212,175,55,0.25)] transition-all duration-200 hover:bg-[#b8952e] hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Spinner /> : 'Send Reset Link'}
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

export default ForgotPassword;
