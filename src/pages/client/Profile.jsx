import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { User, Mail, Phone, Lock, Bell, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'
import '../../styles/portal/settings.css'
import '../../styles/client/client.css'

const ClientProfile = () => {
    const { userProfile, user } = useAuth()
    const [loading, setLoading] = useState(false)

    // Profile data state
    const [profileData, setProfileData] = useState({
        full_name: '',
        phone: ''
    })
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileError, setProfileError] = useState('')
    const [profileSuccess, setProfileSuccess] = useState('')

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')

    // Notification preferences state
    const [notifications, setNotifications] = useState({
        email: true,
        whatsapp: true
    })
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifSuccess, setNotifSuccess] = useState('')

    useEffect(() => {
        if (userProfile) {
            setProfileData({
                full_name: userProfile.full_name || '',
                phone: userProfile.phone || ''
            })
        }
        fetchNotificationPreferences()
    }, [userProfile])

    const fetchNotificationPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('email_notifications, whatsapp_notifications')
                .eq('id', userProfile.id)
                .single()

            if (error) throw error

            if (data) {
                setNotifications({
                    email: data.email_notifications !== false,
                    whatsapp: data.whatsapp_notifications !== false
                })
            }
        } catch (error) {
            console.error('Error fetching notification preferences:', error)
        }
    }

    // Handle profile update
    const handleProfileUpdate = async (e) => {
        e.preventDefault()
        setProfileError('')
        setProfileSuccess('')

        if (!profileData.full_name.trim()) {
            setProfileError('Name is required')
            return
        }

        setProfileLoading(true)

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: profileData.full_name.trim(),
                    phone: profileData.phone.trim() || null
                })
                .eq('id', userProfile.id)

            if (error) throw error

            setProfileSuccess('Profile updated successfully!')
            setTimeout(() => setProfileSuccess(''), 3000)
        } catch (error) {
            console.error('Error updating profile:', error)
            setProfileError('Failed to update profile')
        } finally {
            setProfileLoading(false)
        }
    }

    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('Please fill in all password fields')
            return
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters')
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match')
            return
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
            setPasswordError('New password must be different from current password')
            return
        }

        setPasswordLoading(true)

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordData.currentPassword
            })

            if (signInError) {
                setPasswordError('Current password is incorrect')
                setPasswordLoading(false)
                return
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            })

            if (updateError) throw updateError

            setPasswordSuccess('Password changed successfully!')
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })
            setTimeout(() => setPasswordSuccess(''), 5000)
        } catch (error) {
            console.error('Error changing password:', error)
            setPasswordError('Failed to change password. Please try again.')
        } finally {
            setPasswordLoading(false)
        }
    }

    // Handle notification toggle
    const handleNotificationToggle = async (type) => {
        setNotifLoading(true)
        setNotifSuccess('')
        const newValue = !notifications[type]

        try {
            const updateField = type === 'email' ? 'email_notifications' : 'whatsapp_notifications'

            const { error } = await supabase
                .from('users')
                .update({ [updateField]: newValue })
                .eq('id', userProfile.id)

            if (error) throw error

            setNotifications(prev => ({
                ...prev,
                [type]: newValue
            }))

            setNotifSuccess(`${type === 'email' ? 'Email' : 'WhatsApp'} notifications ${newValue ? 'enabled' : 'disabled'}`)
            setTimeout(() => setNotifSuccess(''), 3000)
        } catch (error) {
            console.error('Error updating notification preference:', error)
            setNotifSuccess('Failed to update notification preference')
        } finally {
            setNotifLoading(false)
        }
    }

    return (
        <div className="client-profile-page">
            <div className="page-header">
                <div>
                    <h1>My Profile</h1>
                    <p className="page-subtitle">Manage your account settings</p>
                </div>
            </div>

            <div className="profile-sections">
                {/* Personal Information */}
                <div className="profile-section">
                    <div className="profile-section-header">
                        <User size={20} />
                        <h2>Personal Information</h2>
                    </div>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="full_name">
                                    Full Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    value={profileData.full_name}
                                    onChange={(e) => setProfileData(prev => ({
                                        ...prev,
                                        full_name: e.target.value
                                    }))}
                                    onFocus={() => setProfileError('')}
                                    placeholder="Enter your full name"
                                    disabled={profileLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={user?.email || ''}
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                                <small style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                    Email cannot be changed
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData(prev => ({
                                        ...prev,
                                        phone: e.target.value
                                    }))}
                                    onFocus={() => setProfileError('')}
                                    placeholder="+351 912 345 678"
                                    disabled={profileLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={profileLoading}
                        >
                            {profileLoading ? 'Saving...' : 'Save Changes'}
                        </button>

                        {profileError && (
                            <div className="inline-alert inline-alert-error">
                                <AlertTriangle size={16} />
                                <span>{profileError}</span>
                            </div>
                        )}

                        {profileSuccess && (
                            <div className="inline-alert inline-alert-success">
                                <CheckCircle size={16} />
                                <span>{profileSuccess}</span>
                            </div>
                        )}
                    </form>
                </div>

                {/* Change Password */}
                <div className="profile-section">
                    <div className="profile-section-header">
                        <Lock size={20} />
                        <h2>Change Password</h2>
                    </div>
                    <form onSubmit={handlePasswordChange} className="password-form">
                        <div className="form-group">
                            <label htmlFor="currentPassword">
                                Current Password <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    id="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData(prev => ({
                                        ...prev,
                                        currentPassword: e.target.value
                                    }))}
                                    onFocus={() => setPasswordError('')}
                                    placeholder="Enter current password"
                                    disabled={passwordLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords(prev => ({
                                        ...prev,
                                        current: !prev.current
                                    }))}
                                    tabIndex="-1"
                                >
                                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">
                                New Password <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    id="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData(prev => ({
                                        ...prev,
                                        newPassword: e.target.value
                                    }))}
                                    onFocus={() => setPasswordError('')}
                                    placeholder="Enter new password (min. 6 characters)"
                                    disabled={passwordLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords(prev => ({
                                        ...prev,
                                        new: !prev.new
                                    }))}
                                    tabIndex="-1"
                                >
                                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">
                                Confirm New Password <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    id="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData(prev => ({
                                        ...prev,
                                        confirmPassword: e.target.value
                                    }))}
                                    onFocus={() => setPasswordError('')}
                                    placeholder="Confirm new password"
                                    disabled={passwordLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords(prev => ({
                                        ...prev,
                                        confirm: !prev.confirm
                                    }))}
                                    tabIndex="-1"
                                >
                                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={passwordLoading}
                        >
                            {passwordLoading ? 'Changing Password...' : 'Change Password'}
                        </button>

                        {passwordError && (
                            <div className="inline-alert inline-alert-error">
                                <AlertTriangle size={16} />
                                <span>{passwordError}</span>
                            </div>
                        )}

                        {passwordSuccess && (
                            <div className="inline-alert inline-alert-success">
                                <CheckCircle size={16} />
                                <span>{passwordSuccess}</span>
                            </div>
                        )}
                    </form>
                </div>

                {/* Notification Preferences */}
                <div className="profile-section">
                    <div className="profile-section-header">
                        <Bell size={20} />
                        <h2>Notification Preferences</h2>
                    </div>
                    <p className="section-description">
                        Choose how you want to receive notifications about your appointments
                    </p>

                    <div className="notification-toggles">
                        <div className="toggle-item">
                            <div className="toggle-info">
                                <Mail size={18} className="toggle-icon" />
                                <div>
                                    <h3>Email Notifications</h3>
                                    <p>Receive appointment updates via email</p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={notifications.email}
                                    onChange={() => handleNotificationToggle('email')}
                                    disabled={notifLoading}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div className="toggle-info">
                                <div className="whatsapp-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3>WhatsApp Notifications</h3>
                                    <p>Receive appointment updates via WhatsApp</p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={notifications.whatsapp}
                                    onChange={() => handleNotificationToggle('whatsapp')}
                                    disabled={notifLoading}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {notifSuccess && (
                        <div className="inline-alert inline-alert-success">
                            <CheckCircle size={16} />
                            <span>{notifSuccess}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ClientProfile