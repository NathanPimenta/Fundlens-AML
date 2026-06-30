import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, Check, X, ChevronDown, User, Activity } from 'lucide-react';

export default function UserProfileBadge() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // All possible permissions for checklist display
  const allPermissions = [
    { code: 'CASE_VIEW', label: 'View Cases' },
    { code: 'CASE_ASSIGN', label: 'Assign Cases' },
    { code: 'WATCHLIST_UPDATE', label: 'Manage Watchlist' },
    { code: 'BLOCKCHAIN_APPROVE', label: 'Approve Blockchain Event' },
    { code: 'STR_SUBMIT', label: 'Submit STR Report' },
    { code: 'CONFIG_MANAGE', label: 'Manage Settings' },
  ];

  return (
    <div className="relative flex items-center gap-3" ref={dropdownRef}>
      {/* Demo Mode Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
        <Activity className="w-3.5 h-3.5 text-green-500" />
        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
          Demo Mode: {user.role}
        </span>
      </div>

      {/* User Dropdown Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#E31E24] to-[#f94d52] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-red-500/10">
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start text-left">
          <span className="text-xs font-bold text-gray-900 leading-tight">{user.name}</span>
          <span className="text-[9px] text-gray-500 font-medium">{user.role}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E31E24] to-[#f94d52] flex items-center justify-center text-white text-sm font-bold shadow-md">
              {initials}
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 leading-tight">{user.name}</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">{user.role}</p>
              <p className="text-[9px] text-gray-400 font-mono mt-0.5">ID: {user.id}</p>
            </div>
          </div>

          {/* Permissions Checklist (WOW Factor for Judges) */}
          <div className="mt-3 py-1">
            <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-500" />
              Active RBAC Permissions
            </h5>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allPermissions.map((perm) => {
                const hasPerm = user.permissions.includes(perm.code);
                return (
                  <div key={perm.code} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className={hasPerm ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'}>
                      {perm.label}
                    </span>
                    {hasPerm ? (
                      <Check className="w-3.5 h-3.5 text-green-500 font-bold" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-500 font-bold" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 mt-3 pt-3">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out / Switch Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
