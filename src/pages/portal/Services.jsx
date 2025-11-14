import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Briefcase, Plus, Edit2, Trash2, DollarSign, Clock, Save, X } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'
import '../../styles/portal/services.css'

const PortalServices = () => {
    const { userProfile } = useAuth()
    const [services, setServices] = useState([])
    const [business, setBusiness] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingService, setEditingService] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    
    const [formData, setFormData] = useState({
        service_name: '',
        description: '',
        duration_minutes: '',
        price: '',
        is_active: true,
    })

    useEffect(() => {
        fetchBusinessAndServices()
    }, [])

    const fetchBusinessAndServices = async () => {
        try {
            // Get business
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', userProfile.id)
                .single()

            if (businessError) throw businessError
            setBusiness(businessData)

            // Get services
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', businessData.id)
                .order('created_at', { ascending: false })

            if (servicesError) throw servicesError
            setServices(servicesData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
            setError('Failed to load services')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
        setError('')
    }

    const resetForm = () => {
        setFormData({
            service_name: '',
            description: '',
            duration_minutes: '',
            price: '',
            is_active: true,
        })
        setEditingService(null)
        setShowForm(false)
        setError('')
        setSuccess('')
    }

    const handleEdit = (service) => {
        setFormData({
            service_name: service.service_name,
            description: service.description || '',
            duration_minutes: service.duration_minutes,
            price: service.price,
            is_active: service.is_active,
        })
        setEditingService(service)
        setShowForm(true)
        setError('')
        setSuccess('')
    }

    const handleDelete = async (serviceId) => {
        if (!confirm('Are you sure you want to delete this service?')) return

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', serviceId)

            if (error) throw error

            setServices(prev => prev.filter(s => s.id !== serviceId))
            setSuccess('Service deleted successfully')
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error deleting service:', error)
            setError('Failed to delete service')
        }
    }

    const handleToggleActive = async (service) => {
        try {
            const { error } = await supabase
                .from('services')
                .update({ is_active: !service.is_active })
                .eq('id', service.id)

            if (error) throw error

            setServices(prev => prev.map(s => 
                s.id === service.id ? { ...s, is_active: !s.is_active } : s
            ))
        } catch (error) {
            console.error('Error toggling service:', error)
            setError('Failed to update service status')
        }
    }

    const validateForm = () => {
        if (!formData.service_name.trim()) {
            setError('Service name is required')
            return false
        }
        if (!formData.duration_minutes || formData.duration_minutes <= 0) {
            setError('Duration must be greater than 0')
            return false
        }
        if (!formData.price || formData.price < 0) {
            setError('Price must be 0 or greater')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return

        try {
            const serviceData = {
                ...formData,
                business_id: business.id,
                duration_minutes: parseInt(formData.duration_minutes),
                price: parseFloat(formData.price),
            }

            if (editingService) {
                // Update
                const { error } = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', editingService.id)

                if (error) throw error

                setServices(prev => prev.map(s => 
                    s.id === editingService.id ? { ...s, ...serviceData } : s
                ))
                setSuccess('Service updated successfully')
            } else {
                // Create
                const { data, error } = await supabase
                    .from('services')
                    .insert([serviceData])
                    .select()
                    .single()

                if (error) throw error

                setServices(prev => [data, ...prev])
                setSuccess('Service created successfully')
            }

            resetForm()
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error saving service:', error)
            setError('Failed to save service')
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading services...</p>
            </div>
        )
    }

    if (!business) {
        return (
            <div className="empty-state">
                <Briefcase size={64} className="empty-state-icon" />
                <h2>Create Business Profile First</h2>
                <p>You need to set up your business profile before adding services.</p>
                <a href="/portal/profile" className="btn btn--primary">
                    Create Business Profile
                </a>
            </div>
        )
    }

    return (
        <div className="services-page">
            <div className="page-header">
                <div>
                    <h1>Services</h1>
                    <p className="page-subtitle">Manage your services and pricing</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn--primary"
                    >
                        <Plus size={16} />
                        Add Service
                    </button>
                )}
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

            {/* Service Form */}
            {showForm && (
                <div className="form-section">
                    <div className="section-title">
                        <Briefcase size={20} />
                        {editingService ? 'Edit Service' : 'Add New Service'}
                        <button
                            onClick={resetForm}
                            className="btn-icon"
                            style={{ marginLeft: 'auto' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="service-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="service_name">Service Name *</label>
                                <input
                                    type="text"
                                    id="service_name"
                                    name="service_name"
                                    value={formData.service_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Haircut, Massage, Consultation"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="duration_minutes">Duration (minutes) *</label>
                                <input
                                    type="number"
                                    id="duration_minutes"
                                    name="duration_minutes"
                                    value={formData.duration_minutes}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 30, 60, 90"
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="price">Price (€) *</label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 25.00"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe this service..."
                                rows="3"
                            />
                        </div>

                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="is_active"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="is_active">Service is active (visible to clients)</label>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn btn--outline"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn--primary">
                                <Save size={16} />
                                {editingService ? 'Update Service' : 'Create Service'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Services List */}
            {services.length === 0 ? (
                <div className="empty-state">
                    <Briefcase size={48} className="empty-state-icon" />
                    <h2>No Services Yet</h2>
                    <p>Add your first service to start accepting appointments.</p>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn btn--primary"
                        >
                            <Plus size={16} />
                            Add Your First Service
                        </button>
                    )}
                </div>
            ) : (
                <div className="services-grid">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            className={`service-card ${!service.is_active ? 'inactive' : ''}`}
                        >
                            <div className="service-header">
                                <h3>{service.service_name}</h3>
                                <div className="service-actions">
                                    <button
                                        onClick={() => handleToggleActive(service)}
                                        className={`btn-toggle ${service.is_active ? 'active' : ''}`}
                                        title={service.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {service.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="btn-icon"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="btn-icon btn-icon-danger"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {service.description && (
                                <p className="service-description">{service.description}</p>
                            )}

                            <div className="service-meta">
                                <div className="meta-item">
                                    <Clock size={16} />
                                    <span>{service.duration_minutes} min</span>
                                </div>
                                <div className="meta-item">
                                    <DollarSign size={16} />
                                    <span>€{parseFloat(service.price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PortalServices