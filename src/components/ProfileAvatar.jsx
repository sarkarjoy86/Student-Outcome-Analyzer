import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ProfileAvatar() {
  const { user, logout, changePassword, actionLoading, message } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  })
  const dropdownRef = useRef(null)

  const firstInitial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : 'U'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    try {
      await changePassword(passwordForm)
      setPasswordForm({ oldPassword: '', newPassword: '' })
    } catch {
      // Handled via auth message state
    }
  }

  return (
    <div className="profile-avatar-container" ref={dropdownRef}>
      {/* Circular Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="profile-avatar-btn"
        title={user?.fullName || 'Profile'}
      >
        {firstInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="profile-dropdown">
          {/* User Info Header */}
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-avatar">
              {firstInitial}
            </div>
            <h3 className="profile-dropdown-name">
              {user?.fullName || 'User'}
            </h3>
            <p className="profile-dropdown-email">
              {user?.email || 'N/A'}
            </p>
          </div>

          <div className="profile-dropdown-divider" />

          {/* Change Password Section */}
          <form className="profile-dropdown-form" onSubmit={handleChangePassword}>
            <p className="profile-dropdown-section-title">Change Password</p>
            <div className="profile-dropdown-field">
              <label className="profile-dropdown-label" htmlFor="profile-oldPassword">
                Current Password
              </label>
              <input
                id="profile-oldPassword"
                name="oldPassword"
                type="password"
                value={passwordForm.oldPassword}
                onChange={handlePasswordInputChange}
                required
                className="profile-dropdown-input"
                placeholder="Enter current password"
              />
            </div>
            <div className="profile-dropdown-field">
              <label className="profile-dropdown-label" htmlFor="profile-newPassword">
                New Password
              </label>
              <input
                id="profile-newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordInputChange}
                required
                minLength={6}
                className="profile-dropdown-input"
                placeholder="Enter new password"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="profile-dropdown-change-btn"
            >
              {actionLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="profile-dropdown-divider" />

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            disabled={actionLoading}
            className="profile-dropdown-logout"
          >
            {actionLoading ? 'Please Wait...' : 'Log Out'}
          </button>

          {/* Message */}
          {message.text ? (
            <p
              className={`profile-dropdown-message ${
                message.type === 'error'
                  ? 'profile-dropdown-message-error'
                  : 'profile-dropdown-message-success'
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
