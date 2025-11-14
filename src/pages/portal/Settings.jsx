import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import {
    Settings as SettingsIcon,
    Lock,
    Bell,
    User,
    Mail,
    Calendar,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle,
    X
} from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'
import '../../styles/portal/settings.css'

const PortalSettings = () => {
    const { userProfile, signOut } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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
    const [passwordError, setPasswordError] = useState('') // Inline error for password section
    const [passwordSuccess, setPasswordSuccess] = useState('') // Inline success for password section

    // Notification preferences state
    const [notifications, setNotifications] = useState({
        email: true,
        whatsapp: true
    })
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifSuccess, setNotifSuccess] = useState('') // Inline notification feedback

    // Delete account modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState('') // Inline error for delete modal

    useEffect(() => {
        fetchNotificationPreferences()
    }, [])

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

    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        // Validation
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
            // Verify current password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userProfile.email,
                password: passwordData.currentPassword
            })

            if (signInError) {
                setPasswordError('Current password is incorrect')
                setPasswordLoading(false)
                return
            }

            // Update password
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

    // Handle notification preference toggle
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

    // Handle account deletion
    const handleDeleteAccount = async () => {
        setDeleteError('')

        if (!deleteConfirmPassword) {
            setDeleteError('Please enter your password to confirm deletion')
            return
        }

        setDeleteLoading(true)

        try {
            // Verify password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userProfile.email,
                password: deleteConfirmPassword
            })

            if (signInError) {
                setDeleteError('Incorrect password')
                setDeleteLoading(false)
                return
            }

            // Delete user account (cascade will handle related data)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(
                userProfile.id
            )

            if (deleteError) {
                // If admin.deleteUser fails (requires service role), 
                // we can mark the account as deleted in the users table
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        is_active: false,
                        deleted_at: new Date().toISOString()
                    })
                    .eq('id', userProfile.id)

                if (updateError) throw updateError
            }

            // Sign out and redirect
            await signOut()
            navigate('/app/auth?tab=signup')
        } catch (error) {
            console.error('Error deleting account:', error)
            setDeleteError('Failed to delete account. Please contact support.')
        } finally {
            setDeleteLoading(false)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="page-subtitle">Manage your account preferences and security</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            <div className="settings-sections">
                {/* Account Information */}
                <div className="settings-section">
                    <div className="section-header">
                        <User size={20} />
                        <h2>Account Information</h2>
                    </div>
                    <div className="section-content">
                        <div className="info-grid">
                            <div className="info-item">
                                <Mail size={16} className="info-icon" />
                                <div className="info-details">
                                    <label>Email</label>
                                    <p>{userProfile?.email}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <User size={16} className="info-icon" />
                                <div className="info-details">
                                    <label>Full Name</label>
                                    <p>{userProfile?.full_name || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <SettingsIcon size={16} className="info-icon" />
                                <div className="info-details">
                                    <label>Account Type</label>
                                    <p className="capitalize">{userProfile?.user_type || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <Calendar size={16} className="info-icon" />
                                <div className="info-details">
                                    <label>Member Since</label>
                                    <p>{formatDate(userProfile?.created_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="settings-section">
                    <div className="section-header">
                        <Lock size={20} />
                        <h2>Change Password</h2>
                    </div>
                    <div className="section-content">
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

                            {/* Inline password error message */}
                            {passwordError && (
                                <div className="inline-alert inline-alert-error">
                                    <AlertTriangle size={16} />
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            {/* Inline password success message */}
                            {passwordSuccess && (
                                <div className="inline-alert inline-alert-success">
                                    <CheckCircle size={16} />
                                    <span>{passwordSuccess}</span>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="settings-section">
                    <div className="section-header">
                        <Bell size={20} />
                        <h2>Notification Preferences</h2>
                    </div>
                    <div className="section-content">
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

                        {/* Inline notification feedback */}
                        {notifSuccess && (
                            <div className="inline-alert inline-alert-success">
                                <CheckCircle size={16} />
                                <span>{notifSuccess}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="settings-section danger-zone">
                    <div className="section-header">
                        <AlertTriangle size={20} />
                        <h2>Danger Zone</h2>
                    </div>
                    <div className="section-content">
                        <div className="danger-warning">
                            <Trash2 size={18} />
                            <div>
                                <h3>Delete Account</h3>
                                <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowDeleteModal(true)
                                setDeleteError('')
                                setDeleteConfirmPassword('')
                            }}
                            className="btn btn-danger">
                            <Trash2 size={16} />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => {
                    if (!deleteLoading) {
                        setShowDeleteModal(false)
                        setDeleteError('')
                        setDeleteConfirmPassword('')
                    }
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Account</h2>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteError('')
                                    setDeleteConfirmPassword('')
                                }}
                                disabled={deleteLoading}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="warning-box">
                                <AlertTriangle size={24} />
                                <div>
                                    <h3>Are you absolutely sure?</h3>
                                    <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="deletePassword">
                                    Enter your password to confirm <span className="required">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="deletePassword"
                                    value={deleteConfirmPassword}
                                    onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                                    onFocus={() => setDeleteError('')}
                                    placeholder="Enter your password"
                                    disabled={deleteLoading}
                                />
                            </div>

                            {/* Inline delete error message */}
                            {deleteError && (
                                <div className="inline-alert inline-alert-error">
                                    <AlertTriangle size={16} />
                                    <span>{deleteError}</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn--outline"
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteError('')
                                    setDeleteConfirmPassword('')
                                }}
                                disabled={deleteLoading}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading || !deleteConfirmPassword}>
                                {deleteLoading ? 'Deleting Account...' : 'Delete My Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PortalSettings