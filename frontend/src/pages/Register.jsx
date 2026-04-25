import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import { AuthShell, BrandMark, DarkInput, GlassCard, GoldButton } from '../components/SystemUI';

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
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-stretch lg:gap-14">
        <div className="flex w-full max-w-xl flex-col justify-center">
          <BrandMark onClick={() => navigate('/')} subtitle="Start Your Client Account" className="text-left lg:text-left" />
          <div className="mt-10 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/85">New Member Setup</p>
              <h1 className="mt-4 font-serif text-4xl text-white sm:text-5xl">Create your salon profile in one clean step.</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-gray-300">
                Book faster, track your visits, and keep your preferences connected to every appointment.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Store your booking details in one place',
                'Easy access to upcoming and past appointments',
                'Smooth handoff into the booking flow after sign-up',
                'Consistent dark and gold experience from day one'
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
            <h2 className="text-3xl font-serif text-white">Create an Account</h2>
            <p className="mt-2 text-sm text-gray-400">Join Salon DEES and start booking with less friction.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
        </GlassCard>
      </div>
    </AuthShell>
  );
}

export default Register;
