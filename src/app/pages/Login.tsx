import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Loader2, Shield, Building2, Sparkles } from 'lucide-react';

const DEMO_PROFILES = [
  {
    id: 'RK-001',
    name: 'Rajesh Kumar',
    role: 'Senior Investigator',
    branch: 'Mumbai HQ',
  },
  {
    id: 'PS-002',
    name: 'Priya Sharma',
    role: 'AML Analyst',
    branch: 'Delhi',
  },
  {
    id: 'AM-003',
    name: 'Amit Mehta',
    role: 'Supervisor',
    branch: 'Mumbai HQ',
  },
  {
    id: 'SK-004',
    name: 'Sneha Kapoor',
    role: 'FIU Liaison',
    branch: 'Central Ops',
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await login(userId);
      navigate('/');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Invalid user ID credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSelect = async (id: string) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await login(id);
      navigate('/');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to authenticate demo user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background soft red and teal gradients matching dashboard visual language */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#00C9A7]/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Grid pattern background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E31E24] to-[#f94d52] flex items-center justify-center shadow-lg shadow-red-500/20">
            <Shield className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'Syne' }}>
            Fund<span className="text-[#E31E24]">Lens</span> AML
          </span>
        </div>
        <h2 className="mt-4 text-center text-xs font-bold tracking-widest text-gray-500 uppercase">
          Union Bank of India — Audit & Surveillance Portal
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white/80 backdrop-blur-md border border-gray-200/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleFormSubmit}>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
                <span className="font-bold">Authentication Error:</span> {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Syne' }}>
                User ID / Corporate Email
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. PS-002"
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Syne' }}>
                Password
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#E31E24] hover:bg-[#d4183d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                style={{ fontFamily: 'Syne' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                <span className="bg-white px-3 text-gray-500 flex items-center gap-1.5" style={{ fontFamily: 'Syne' }}>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  Continue as Demo User
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleDemoSelect(profile.id)}
                  disabled={submitting}
                  className="flex flex-col items-start p-3 bg-white hover:bg-red-50/10 border border-gray-200 hover:border-[#E31E24]/60 rounded-xl transition-all text-left group shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="text-gray-900 text-xs font-bold group-hover:text-[#E31E24] transition-colors">
                    {profile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{profile.role}</div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2 font-mono">
                    <Building2 className="w-3 h-3 text-gray-300" />
                    {profile.branch}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extensibility note */}
      <div className="mt-8 text-center text-[10px] text-gray-400 max-w-xs mx-auto">
        Authentication is simulated via predefined roster lookup. Decoupled design allows seamless migration to JWT or OAuth2 without altering RBAC permission checkers.
      </div>
    </div>
  );
}
