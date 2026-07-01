import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Scissors } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { AuthShell } from '../../components/admin/SystemUI';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/forgot-password`, {
        email: email.trim(),
      });

      const successMessage = response.data?.message || 'Password reset link sent to your email.';
      setMessage(successMessage);
      toast.success(successMessage);
    } catch (requestError) {
      const errorMessage = requestError.response?.data?.message || 'Unable to send reset link. Please try again.';
      setError(errorMessage);
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
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111]/80 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 text-[#d4af37]">
              <Scissors className="h-5 w-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#d4af37]">Account Recovery</p>
            <h1 className="mt-3 text-3xl font-serif text-white">Forgot Password</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Enter your account email and we will send you a secure reset link.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">Email Address</label>
              <div className="relative">
                <input
                  type="email"
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

            {error && (
              <div className="rounded-md border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
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
