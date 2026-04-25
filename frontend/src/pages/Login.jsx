import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import { AuthShell, BrandMark, DarkInput, GlassCard, GoldButton } from '../components/SystemUI';

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
    if (role === 'staff') return '/staff';
    return '/dashboard';
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

      toast.success('Welcome back to Salon DEES!');
      navigate(getRedirectPath(response.data.role));
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
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-stretch lg:gap-14">
        <div className="flex w-full max-w-xl flex-col justify-center">
          <BrandMark onClick={() => navigate('/')} subtitle="Luxury Salon Experience" className="text-left lg:text-left" />
          <div className="mt-10 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/85">Member Sign In</p>
              <h1 className="mt-4 font-serif text-4xl text-white sm:text-5xl">Step back into your booking space.</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-gray-300">
                Review appointments, manage visits, and keep your salon experience moving without friction.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Fast access to appointments and account details',
                'Same dark and gold experience across the whole system',
                'Staff and admin routing handled automatically',
                'Google sign-in still available'
              ].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-[#111111]/45 px-4 py-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm leading-6 text-gray-300">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <GlassCard className="w-full max-w-md p-8 md:p-10">
          <div className="text-center">
            <h2 className="text-3xl font-serif text-white">Sign In</h2>
            <p className="mt-2 text-sm text-gray-400">Enter your details to access your account.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
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
            className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#0a0a0a]/80 px-4 py-3 text-gray-200 transition duration-300 hover:bg-white/10"
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
        </GlassCard>
      </div>
    </AuthShell>
  );
}

export default Login;
