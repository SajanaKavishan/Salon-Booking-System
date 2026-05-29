import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthShell, BrandMark, DarkInput, GlassCard, GoldButton } from '../../components/admin/SystemUI';

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
          role: response.data.role,
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
    <AuthShell backgroundImage="bg-[url('/registerBg.jpg')]">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.22),_transparent_42%),linear-gradient(180deg,rgba(20,20,20,0.92),rgba(9,9,9,0.88))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-10 lg:flex">
            <BrandMark onClick={() => navigate('/')} subtitle="Start Your Client Account" className="text-left" />

            <div className="mt-10">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]/80">New Member Setup</p>
              <h1 className="mt-4 max-w-md font-serif text-4xl leading-tight text-white sm:text-5xl">
                Create your account and book in style.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-gray-300">
                Set up your profile once, then move through future bookings with less friction and a more polished client experience.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                'Your profile stays ready for faster bookings',
                'Upcoming and past visits stay connected to one account',
                'You can move straight into the booking flow after sign up'
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm leading-6 text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="mb-4 rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_48%),linear-gradient(180deg,rgba(19,19,19,0.9),rgba(8,8,8,0.82))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
              <div className="flex items-start justify-between gap-4">
                <BrandMark onClick={() => navigate('/')} subtitle="New Client Setup" className="text-left" />
                <div className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                  Sign Up
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-300">
                Create your account with a cleaner mobile flow and move straight into your first booking.
              </p>
            </div>

            <GlassCard className="overflow-hidden rounded-[1.75rem] p-0 sm:rounded-[2rem]">
            <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8 md:px-10 md:pt-10">
              <div>
                <h2 className="text-2xl font-serif text-white sm:text-3xl">Create your account</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Join Salon DEES and step into a smoother booking experience.
                </p>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Full Name</label>
                  <DarkInput
                    type="text"
                    name="name"
                    value={name}
                    onChange={onChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
                  <DarkInput
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Phone Number</label>
                  <DarkInput
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={onChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
                  <div className="relative">
                    <DarkInput
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={onChange}
                      placeholder="Create a password"
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

                <GoldButton type="submit" disabled={isLoading} className="mt-6 w-full py-3 text-lg">
                  {isLoading ? <Spinner /> : 'Create Account'}
                </GoldButton>
              </form>

              <p className="mt-8 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-[#d4af37] transition hover:text-yellow-400 hover:underline">
                  Sign in here
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

export default Register;
