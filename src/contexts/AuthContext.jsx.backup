import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../config/supabase' 
import { AuthContext } from '../context_definition/AuthContextDefinition'

const MODE_KEY = 'locappoint_mode'

const readMode = () => {
    try {
        const stored = localStorage.getItem(MODE_KEY)
        return stored === 'business' || stored === 'client' ? stored : null
    } catch {
        return null
    }
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [profileStatus, setProfileStatus] = useState('idle')
    const [business, setBusiness] = useState(null)
    const [mode, setModeState] = useState(readMode)
    const [loading, setLoading] = useState(true)
    const profileFor = useRef(null)

    const fetchUserProfile = async (userId) => {
        setProfileStatus('loading')
        const [{ data, error }, { data: owned, error: ownedError }] = await Promise.all([
            supabase.from('users').select('*').eq('id', userId).maybeSingle(),
            supabase.from('businesses').select('id, business_name, slug, is_active').eq('user_id', userId).maybeSingle(),
        ])

        if (error) console.error('Error fetching user profile:', error)
        if (ownedError) console.error('Error fetching business:', ownedError)
        setUserProfile(data ?? null)
        setBusiness(owned ?? null)
        setProfileStatus(data ? 'ready' : 'missing')
        setLoading(false)
    }

    const refreshProfile = () => {
        if (user) return fetchUserProfile(user.id)
    }

    useEffect(() => {
        const applySession = (session) => {
            const nextUser = session?.user ?? null
            setUser(nextUser)
            if (!nextUser) {
                profileFor.current = null
                setUserProfile(null)
                setBusiness(null)
                setProfileStatus('idle')
                setLoading(false)
                return
            }
            if (profileFor.current === nextUser.id) return
            profileFor.current = nextUser.id
            setProfileStatus('loading')
            // Deferred: supabase-js can deadlock when queried inside onAuthStateChange.
            setTimeout(() => fetchUserProfile(nextUser.id), 0)
        }

        supabase.auth.getSession().then(({ data: { session } }) => applySession(session))

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => applySession(session))

        return () => subscription.unsubscribe()
    }, [])

    const signUp = async (email, password, userData) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.full_name,
                        phone: userData.phone,
                        user_type: userData.user_type,
                    },
                    emailRedirectTo: `${window.location.origin}/auth?verified=true`
                }
            })

            if (authError) throw authError

            return { data: authData, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    const signInWithGoogle = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/me`,
                },
            })

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error } 
        }
    }

    const signInWithApple = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: `${window.location.origin}/me`,
                },
            })

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            profileFor.current = null
            setUser(null)
            setUserProfile(null)
            setBusiness(null)
            setProfileStatus('idle')
            return { error: null }
        } catch (error) {
            return { error }
        }
    }

    const resetPassword = async (email) => {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    const setMode = useCallback((next) => {
        setModeState(next)
        try { localStorage.setItem(MODE_KEY, next) } catch { /* noop */ }
    }, [])

    const currentMode = mode ?? (userProfile?.user_type === 'business' ? 'business' : 'client')
    const homePath = currentMode === 'business' ? '/portal' : '/client'

    const value = {
        user,
        userProfile,
        business,
        hasBusiness: Boolean(business),
        mode: currentMode,
        setMode,
        homePath,
        profileStatus,
        refreshProfile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signOut,
        resetPassword,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}