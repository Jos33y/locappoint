import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Building2, MapPin, Phone, Mail, Globe, MessageCircle, Save, ArrowLeft } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'

const PortalProfile = () => {
    const { userProfile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    
    const [formData, setFormData] = useState({
        business_name: '',
        slug: '',
        description: '',
        category: '',
        location: '',
        city: '',
        address: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
    })

    useEffect(() => {
        fetchBusinessProfile()
    }, [])

    const fetchBusinessProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('user_id', userProfile.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            
            if (data) {
                setFormData(data)
                setIsEditing(true)
            }
        } catch (error) {
            console.error('Error fetching business:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => {
            const updated = { ...prev, [name]: value }
            
            // Auto-generate slug from business name
            if (name === 'business_name') {
                updated.slug = generateSlug(value)
            }
            
            return updated
        })
        setError('')
        setSuccess('')
    }

    const validateForm = () => {
        if (!formData.business_name.trim()) {
            setError('Business name is required')
            return false
        }
        if (!formData.slug.trim()) {
            setError('Business slug is required')
            return false
        }
        if (!formData.category.trim()) {
            setError('Category is required')
            return false
        }
        if (!formData.city.trim()) {
            setError('City is required')
            return false
        }
        if (!formData.phone.trim()) {
            setError('Phone number is required')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return
        
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const businessData = {
                ...formData,
                user_id: userProfile.id,
                is_active: true,
            }

            if (isEditing) {
                // Update existing business
                const { error } = await supabase
                    .from('businesses')
                    .update(businessData)
                    .eq('user_id', userProfile.id)

                if (error) throw error
                setSuccess('Business profile updated successfully!')
            } else {
                // Create new business
                const { error } = await supabase
                    .from('businesses')
                    .insert([businessData])

                if (error) throw error
                setSuccess('Business profile created successfully!')
                setIsEditing(true)
                
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    navigate('/portal')
                }, 2000)
            }
        } catch (error) {
            console.error('Error saving business:', error)
            if (error.code === '23505') {
                setError('This business slug is already taken. Please choose another.')
            } else {
                setError(error.message || 'Failed to save business profile')
            }
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading profile...</p>
            </div>
        )
    }

    return (
        <div className="profile-page">
            <div className="profile-header">
                <button onClick={() => navigate('/portal')} className="btn btn--outline btn--small">
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
                <div>
                    <h1>{isEditing ? 'Edit Business Profile' : 'Create Business Profile'}</h1>
                    <p className="profile-subtitle">
                        {isEditing ? 'Update your business information' : 'Set up your business to start accepting appointments'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="profile-form">
                {/* Basic Information */}
                <div className="form-section">
                    <h2 className="section-title">
                        <Building2 size={20} />
                        Basic Information
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="business_name">Business Name *</label>
                            <input
                                type="text"
                                id="business_name"
                                name="business_name"
                                value={formData.business_name}
                                onChange={handleInputChange}
                                placeholder="e.g., Femtos Hair Salon"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="slug">Business URL *</label>
                            <div className="input-with-prefix">
                                <span className="input-prefix">locappoint.com/</span>
                                <input
                                    type="text"
                                    id="slug"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    placeholder="femtos-hair"
                                    pattern="[a-z0-9-]+"
                                    required
                                />
                            </div>
                            <small className="form-hint">Only lowercase letters, numbers, and hyphens</small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Tell clients about your business..."
                            rows="4"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="category">Category *</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select a category</option>
                            <option value="Salon">Salon</option>
                            <option value="Barbershop">Barbershop</option>
                            <option value="Spa">Spa</option>
                            <option value="Clinic">Clinic</option>
                            <option value="Dental">Dental</option>
                            <option value="Fitness">Fitness</option>
                            <option value="Beauty">Beauty</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Cafe">Cafe</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                {/* Location */}
                <div className="form-section">
                    <h2 className="section-title">
                        <MapPin size={20} />
                        Location
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="city">City *</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                placeholder="e.g., Lisbon"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Area/Neighborhood</label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="e.g., Baixa"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="address">Full Address</label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="e.g., Rua Augusta 123, 1100-048 Lisboa"
                        />
                    </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                    <h2 className="section-title">
                        <Phone size={20} />
                        Contact Information
                    </h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number *</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+351 912 345 678"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="whatsapp">WhatsApp Number</label>
                            <input
                                type="tel"
                                id="whatsapp"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleInputChange}
                                placeholder="+351 912 345 678"
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="email">Business Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="contact@business.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="website">Website</label>
                            <input
                                type="url"
                                id="website"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                placeholder="https://yourbusiness.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={saving}>
                        {saving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save size={16} />
                                {isEditing ? 'Update Profile' : 'Create Profile'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default PortalProfile