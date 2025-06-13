// filepath: c:\Users\chinh\Desktop\turtlebot-frontend\src\components\TenantSelector.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './TenantSelector.css'

export default function TenantSelector({ onTenantSelected }) {
  const { userTenants, selectedTenant, selectTenant, createTenant } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    domain: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Auto-select if user has only one tenant
  useEffect(() => {
    if (userTenants.length === 1 && !selectedTenant) {
      handleSelectTenant(userTenants[0])
    }
  }, [userTenants, selectedTenant])

  const handleSelectTenant = async (tenant) => {
    try {
      await selectTenant(tenant)
      if (onTenantSelected) {
        onTenantSelected(tenant)
      }
    } catch (error) {
      setError('Failed to select tenant')
    }
  }

  const handleCreateTenant = async (e) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.domain.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const tenantId = await createTenant(createForm)
      setCreateForm({ name: '', domain: '' })
      setShowCreateForm(false)
      
      // Auto-select the newly created tenant
      const newTenant = { id: tenantId, ...createForm }
      handleSelectTenant(newTenant)
    } catch (error) {
      setError('Failed to create organization')
    } finally {
      setIsCreating(false)
    }
  }

  if (selectedTenant) {
    return (
      <div className="tenant-selected">
        <div className="tenant-info">
          <div className="tenant-icon">🏢</div>
          <div className="tenant-details">
            <h3>{selectedTenant.name}</h3>
            <p>{selectedTenant.domain}</p>
          </div>
        </div>
        <button 
          className="change-tenant-btn"
          onClick={() => selectTenant(null)}
        >
          Change Organization
        </button>
      </div>
    )
  }

  return (
    <div className="tenant-selector">
      <div className="tenant-header">
        <h2>Select Organization</h2>
        <p>Choose an organization to continue</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {userTenants.length > 0 && (
        <div className="tenant-list">
          {userTenants.map((tenant) => (
            <div 
              key={tenant.id}
              className="tenant-card"
              onClick={() => handleSelectTenant(tenant)}
            >
              <div className="tenant-icon">🏢</div>
              <div className="tenant-info">
                <h3>{tenant.name}</h3>
                <p>{tenant.domain}</p>
              </div>
              <div className="tenant-arrow">→</div>
            </div>
          ))}
        </div>
      )}

      <div className="tenant-actions">
        {!showCreateForm ? (
          <button 
            className="create-tenant-btn"
            onClick={() => setShowCreateForm(true)}
          >
            + Create New Organization
          </button>
        ) : (
          <form className="create-tenant-form" onSubmit={handleCreateTenant}>
            <h3>Create New Organization</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Organization Name"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Domain (e.g., company.com)"
                value={createForm.domain}
                onChange={(e) => setCreateForm({...createForm, domain: e.target.value})}
                required
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateForm({ name: '', domain: '' })
                  setError('')
                }}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}