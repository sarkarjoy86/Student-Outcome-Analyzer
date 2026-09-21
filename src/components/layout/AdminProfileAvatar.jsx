import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, ShieldCheck, Mail } from "lucide-react";

export default function AdminProfileAvatar() {
  const { user, logout, actionLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initial = "A";
  const displayName = "Admin";
  const displayEmail = user?.email || "admin@gmail.com";

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative z-50 inline-block text-left" ref={dropdownRef}>
      {/* Circular Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md hover:shadow-indigo-500/25 ring-2 ring-purple-400/50 hover:ring-purple-500 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none focus:outline-none"
        title={`${displayName} (${displayEmail})`}
        aria-expanded={isOpen}
      >
        {initial}
      </button>

      {/* Profile Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(79,70,229,0.12)] border border-purple-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Glassy Header Card */}
          <div className="p-6 text-center bg-gradient-to-b from-purple-100/70 via-indigo-50/40 to-white/90 flex flex-col items-center">
            {/* Big Avatar with Ring */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-white mb-3 select-none">
              {initial}
            </div>

            {/* Admin Name */}
            <h3 className="font-extrabold text-gray-900 text-lg tracking-tight">
              {displayName}
            </h3>

            {/* Admin Email */}
            <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5">
              <Mail size={12} className="text-purple-500" />
              <span>{displayEmail}</span>
            </p>

            {/* Role Badge */}
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200/80 shadow-xs">
                <ShieldCheck size={13} className="text-purple-600" />
                Administrator
              </span>
            </div>
          </div>

          <div className="h-px bg-gray-200/70 mx-4" />

          {/* Actions Section */}
          <div className="p-4 bg-gray-50/70">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100/90 text-red-600 hover:text-red-700 border border-red-200/90 rounded-xl font-bold text-xs shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              <LogOut size={15} />
              {actionLoading ? "Logging out..." : "Log Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
