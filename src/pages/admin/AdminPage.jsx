// AdminPage.jsx - Admin page with simple auth and custom header/footer
// Location: src/pages/admin/AdminPage.jsx

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import AdminHeader from './AdminHeader'
import AdminFooter from './AdminFooter'
import AdminDash from './AdminDash'
import '../../styles/admin/admin.css'

// Simple credentials (not secure, just basic gate)
const ADMIN_CREDENTIALS = {
    username: 'locappoint',
    password: 'admin2025'
}

const AdminPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Handle loader dismissal
    useEffect(() => {
        const hideLoader = () => {
            const loader = document.getElementById('initial-loader')
            if (loader) {
                loader.classList.add('fade-out')
                setTimeout(() => {
                    loader.remove()
                }, 400)
            }
        }

        // Check if already authenticated from session
        const savedAuth = sessionStorage.getItem('admin-auth')
        if (savedAuth === 'true') {
            setIsAuthenticated(true)
        }

        // Hide loader after short delay
        const timer = setTimeout(hideLoader, 500)
        return () => clearTimeout(timer)
    }, [])

    const handleLogin = (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Simulate brief loading
        setTimeout(() => {
            if (username === ADMIN_CREDENTIALS.username && 
                password === ADMIN_CREDENTIALS.password) {
                setIsAuthenticated(true)
                sessionStorage.setItem('admin-auth', 'true')
            } else {
                setError('Invalid credentials')
            }
            setLoading(false)
        }, 500)
    }

    const handleLogout = () => {
        setIsAuthenticated(false)
        sessionStorage.removeItem('admin-auth')
        setUsername('')
        setPassword('')
    }

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <div className="admin-login__container">
                    {/* Background effects */}
                    <div className="admin-login__bg">
                        <div className="admin-login__orb admin-login__orb--1" />
                        <div className="admin-login__orb admin-login__orb--2" />
                        <div className="admin-login__grid" />
                    </div>

                    {/* Login Card */}
                    <div className="admin-login__card">
                        <div className="admin-login__header">
                            <div className="admin-login__icon">
                                <Lock size={24} />
                            </div>
                            <h1>Admin Access</h1>
                            <p>Enter credentials to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="admin-login__form">
                            {error && (
                                <div className="admin-login__error">
                                    {error}
                                </div>
                            )}

                            <div className="admin-login__field">
                                <label htmlFor="admin-username">
                                    <User size={14} />
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="admin-username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter username"
                                    disabled={loading}
                                    autoComplete="username"
                                    required
                                />
                            </div>

                            <div className="admin-login__field">
                                <label htmlFor="admin-password">
                                    <Lock size={14} />
                                    Password
                                </label>
                                <div className="admin-login__password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="admin-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        disabled={loading}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="admin-login__toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="admin-login__submit"
                                disabled={loading}
                            >
                                {loading ? 'Authenticating...' : 'Access Dashboard'}
                            </button>
                        </form>

                        <a href="/" className="admin-login__back">
                            ← Back to website
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Authenticated - Show Dashboard
    return (
        <div className="admin-page">
            <AdminHeader onLogout={handleLogout} />
            <AdminDash />
            <AdminFooter />
        </div>
    )
}

export default AdminPage