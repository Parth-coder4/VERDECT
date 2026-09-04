import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VerdectLogo } from '../components/common/VerdectLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  // Mode: Sign In vs Sign Up
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeRole, setActiveRole] = useState<'ADMINISTRATOR' | 'INSPECTOR'>('INSPECTOR');

  // Sign In form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up form state
  const [regName, setRegName] = useState('');
  const [regBadge, setRegBadge] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regJurisdiction, setRegJurisdiction] = useState('Northern Metrology Zone - Sector 4');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Determine redirect URL
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || (activeRole === 'ADMINISTRATOR' ? '/admin' : '/');

  // Password strength calculation for Sign Up
  const passwordStrength = useMemo(() => {
    if (!regPassword) return 0;
    let score = 0;
    if (regPassword.length >= 6) score += 25;
    if (regPassword.length >= 10) score += 25;
    if (/[A-Z]/.test(regPassword)) score += 25;
    if (/[0-9]/.test(regPassword) || /[^A-Za-z0-9]/.test(regPassword)) score += 25;
    return score;
  }, [regPassword]);

  const handleRoleToggle = (role: 'ADMINISTRATOR' | 'INSPECTOR') => {
    setActiveRole(role);
    setError(null);
    setSuccessMsg(null);
  };

  // Quick Demo Auto-Fill helper
  const handleQuickFill = (role: 'ADMINISTRATOR' | 'INSPECTOR') => {
    setAuthMode('signin');
    setActiveRole(role);
    setError(null);
    if (role === 'ADMINISTRATOR') {
      setUsername('ADMIN-DIR-01');
      setPassword('demo-password');
    } else {
      setUsername('9402-INSP');
      setPassword('demo-password');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await login({
        badgeOrUsername: username.trim(),
        pinOrPassword: password,
        role: activeRole
      });

      if (res.success) {
        setFailedAttempts(0);
        navigate(redirectPath, { replace: true });
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setError(res.error || 'Authentication failed. Please verify credentials.');

        if (nextAttempts >= 4) {
          setLockoutTimer(30);
          const interval = setInterval(() => {
            setLockoutTimer((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regBadge.trim() || !regPassword) {
      setError('All mandatory fields are required.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        name: regName.trim(),
        badgeNumber: regBadge.trim().toUpperCase(),
        email: regEmail.trim() || `${regBadge.trim().toLowerCase()}@metrology.gov.in`,
        password: regPassword,
        role: activeRole,
        jurisdiction: regJurisdiction,
        phone: regPhone.trim()
      });

      if (res.success) {
        setSuccessMsg(`Account created for ${regName}! Redirecting to portal...`);
        setTimeout(() => {
          navigate(activeRole === 'ADMINISTRATOR' ? '/admin' : '/', { replace: true });
        }, 1000);
      } else {
        setError(res.error || 'Registration failed. Badge ID may already exist.');
      }
    } catch {
      setError('An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D19] flex items-center justify-center p-4 sm:p-6 select-none font-sans transition-colors duration-200 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle showLabel={true} />
      </div>

      <div className="w-full max-w-[940px] bg-white dark:bg-[#0E1A2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Left Column: Dark Navy Emblem Brand Side */}
        <div className="w-full md:w-[42%] bg-[#081324] relative p-8 sm:p-10 flex flex-col items-center justify-between text-center overflow-hidden border-r border-slate-800">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          <div className="w-full flex-1 flex flex-col items-center justify-center my-4 relative z-10">
            {/* VERDECT Full Brand Logo */}
            <div className="mb-2">
              <VerdectLogo variant="full" size="lg" lightText={true} />
            </div>

            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>VERDECT • Legal Metrology</span>
            </div>

            <p className="text-xs text-slate-400 mt-2 max-w-[240px] leading-relaxed font-medium">
              Automated Packaged Commodity Compliance &amp; Forensic Metrology Surveillance Platform
            </p>

            {/* Quick Demo Credentials Autofill Banner */}
            <div className="mt-6 p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-left w-full max-w-[270px] space-y-2 shadow-lg">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                Quick Demo Credentials
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('INSPECTOR')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl flex items-center justify-between transition-colors text-left border border-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-sky-400">badge</span>
                    Inspector Vikram
                  </span>
                  <span className="text-[10px] text-sky-300 font-mono font-bold">Autofill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('ADMINISTRATOR')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl flex items-center justify-between transition-colors text-left border border-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-amber-400">admin_panel_settings</span>
                    Director Rajesh
                  </span>
                  <span className="text-[10px] text-sky-300 font-mono font-bold">Autofill</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4 border-t border-slate-800 w-full">
            <span className="material-symbols-outlined text-xs text-sky-400" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
            <span>Legal Metrology (PC) Rules, 2011</span>
          </div>
        </div>

        {/* Right Column: Interactive Auth Panel */}
        <div className="w-full md:w-[58%] p-8 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#0E1A2E] overflow-y-auto max-h-[90vh] transition-colors duration-200">
          <div>
            {/* Header with Mode Switcher (Sign In vs Sign Up) */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {authMode === 'signin' ? 'Portal Authentication' : 'Create Officer Account'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {authMode === 'signin'
                    ? 'Authenticate with official Agency ID or Badge'
                    : 'Register officer credentials for field surveillance'}
                </p>
              </div>

              {/* Mode Toggle Button */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'signin'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'signup'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Role Switcher Tab (Administrator vs Inspector) */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleRoleToggle('INSPECTOR')}
                className={`py-2 text-xs font-bold rounded-xl transition-all text-center tracking-wide flex items-center justify-center gap-1.5 ${
                  activeRole === 'INSPECTOR'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">badge</span>
                FIELD INSPECTOR
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('ADMINISTRATOR')}
                className={`py-2 text-xs font-bold rounded-xl transition-all text-center tracking-wide flex items-center justify-center gap-1.5 ${
                  activeRole === 'ADMINISTRATOR'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                DIRECTOR / ADMIN
              </button>
            </div>

            {/* Error and Success Alerts */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-700 dark:text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            {lockoutTimer > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm shrink-0">lock_clock</span>
                <span>Too many attempts. Security cooldown active: {lockoutTimer}s remaining.</span>
              </div>
            )}

            {/* FORM: SIGN IN */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Agency ID / Officer Badge
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-slate-400 dark:text-slate-500 text-[18px]">
                      badge
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. 9402-INSP or ADMIN-DIR-01"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Password / Security PIN
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'Test Credentials Hint:\n• Inspector: 9402-INSP / demo-password\n• Admin: ADMIN-DIR-01 / demo-password'
                        )
                      }
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Credential Hint?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-slate-400 dark:text-slate-500 text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || lockoutTimer > 0}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  {loading ? 'AUTHENTICATING...' : `SIGN IN AS ${activeRole}`}
                </button>
              </form>
            ) : (
              /* FORM: SIGN UP / REGISTRATION */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Insp. Amit Deshmukh"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Agency Badge ID
                    </label>
                    <input
                      type="text"
                      required
                      value={regBadge}
                      onChange={(e) => setRegBadge(e.target.value)}
                      placeholder="e.g. LMPC-5510"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Official Gov Email
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="officer@metrology.gov.in"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98000 00000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Enforcement Jurisdiction / Directorate Zone
                  </label>
                  <select
                    value={regJurisdiction}
                    onChange={(e) => setRegJurisdiction(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                  >
                    <option>Northern Metrology Zone - Sector 4</option>
                    <option>Western Metrology Zone - Sector 2</option>
                    <option>Southern Metrology Zone - Sector 1</option>
                    <option>Eastern Metrology Zone - Sector 3</option>
                    <option>Central Metrology Headquarters, New Delhi</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Password (min 6 chars)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showRegPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Password Security Strength</span>
                      <span>
                        {passwordStrength <= 25 ? 'Weak' : passwordStrength <= 75 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 25
                            ? 'bg-rose-500'
                            : passwordStrength <= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">how_to_reg</span>
                  {loading ? 'REGISTERING ACCOUNT...' : `CREATE ${activeRole} ACCOUNT`}
                </button>
              </form>
            )}
          </div>

          {/* Footer Terms Note */}
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Authorized personnel usage under the{' '}
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Legal Metrology Act, 2009</span>. Powered by{' '}
            <span className="text-sky-600 dark:text-sky-400 font-bold">VERDECT AI</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
