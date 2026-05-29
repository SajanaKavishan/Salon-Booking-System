import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthShell, BrandMark, DarkInput, GlassCard, GoldButton } from '../../components/admin/SystemUI';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { email, password } = formData;

  const getRedirectPath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'staff') return '/staff/dashboard';
    return '/booking';
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
      const response = await axios.post('/api/auth/login', {
        email: email.trim(),
        password,
      });
      const { token, role = 'customer', name, email: responseEmail, _id: id } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name || '');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id,
          name,
          email: responseEmail || email.trim(),
          role,
        })
      );

      toast.success('Welcome back to Salon DEES!');
      navigate(getRedirectPath(role));
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
        const response = await axios.post('http://localhost:5000/api/users/google-login', {
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
            role: response.data.role,
          })
        );

        toast.success('Successfully logged in with Google!');
        navigate(getRedirectPath(response.data.role));
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
    <AuthShell backgroundImage="bg-[url('/loginBg.jpg')]">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.22),_transparent_42%),linear-gradient(180deg,rgba(20,20,20,0.92),rgba(9,9,9,0.88))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-10 lg:flex">
            <BrandMark onClick={() => navigate('/')} subtitle="Luxury Salon Experience" className="text-left" />

            <div className="mt-10">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]/80">Member Sign In</p>
              <h1 className="mt-4 max-w-md font-serif text-4xl leading-tight text-white sm:text-5xl">
                Welcome back to your beauty routine.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-gray-300">
                Access your account, check your upcoming visits, and continue booking with a calmer, faster flow.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { value: '24/7', label: 'Booking access' },
                { value: 'Fast', label: 'Sign-in flow' },
                { value: 'Secure', label: 'Account session' }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-serif text-2xl text-[#d4af37]">{item.value}</p>
                  <p className="mt-1 text-sm text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="mb-4 rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_48%),linear-gradient(180deg,rgba(19,19,19,0.9),rgba(8,8,8,0.82))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
              <div className="flex items-start justify-between gap-4">
                <BrandMark onClick={() => navigate('/')} subtitle="Member Access" className="text-left" />
                <div className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                  Sign In
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-300">
                Securely continue your salon journey and get back to booking in a few taps.
              </p>
            </div>

            <GlassCard className="overflow-hidden rounded-[1.75rem] p-0 sm:rounded-[2rem]">
            <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8 md:px-10 md:pt-10">
              <div>
                <h2 className="text-2xl font-serif text-white sm:text-3xl">Access your account</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Use your email and password or continue with Google.
                </p>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
                  <DarkInput
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="you@email.com"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label className="block text-sm font-medium text-gray-300">Password</label>
                    <span className="text-xs font-medium text-gray-500">Secure account access</span>
                  </div>
                  <div className="relative">
                    <DarkInput
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={onChange}
                      placeholder="Enter your password"
                      required
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#d4af37]"
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                </div>

                <GoldButton type="submit" disabled={isLoading} className="w-full py-3 text-lg">
                  {isLoading ? <Spinner /> : 'Sign In'}
                </GoldButton>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="rounded-full bg-[#111111] px-3 text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-4 py-3 text-gray-200 transition duration-300 hover:bg-white/10"
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
            </GlassCard>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default Login;
