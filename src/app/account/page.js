'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import {
  CameraIcon,
  LockIcon,
  AccountIcon,
  EnvelopeIcon,
  TicketIcon,
} from '@/lib/icons'; // Added TicketIcon if needed by BillingCard, or remove if BillingCard handles its own icon
import BillingCard from './components/BillingCard'; // Import the new component
import './page.css'; // Import the new CSS file

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });
  const [emailData, setEmailData] = useState({
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({
    type: '',
    text: '',
  });
  const [projectCredits, setProjectCredits] = useState(null); // State for project credits

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        setUser(user);

        // Get user profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, credits') // Select the credits column
          .eq('id', user.id)
          .single();

        if (profile) {
          setFormData({
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
          });
          setEmailData({
            email: user.email || '',
          });
          setProjectCredits(profile.credits ?? 0); // Set credits state
        } else {
          setFormData({
            firstName: '',
            lastName: '',
          });
          setEmailData({
            email: user.email || '',
          });
          // If profile doesn't exist yet, assume 0 credits initially
          setProjectCredits(0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData({
      ...emailData,
      [name]: value,
    });
  };

  const handleNameBlur = async (e) => {
    const { name, value } = e.target;
    if (formData[name] !== value) return; // No change

    setUpdating(true);
    try {
      // Update profile in the database
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        [name === 'firstName' ? 'first_name' : 'last_name']: value.trim(),
        updated_at: new Date(),
      });

      if (error) throw error;

      // Show a brief success message
      setMessage({
        type: 'success',
        text: `${name === 'firstName' ? 'First name' : 'Last name'} updated successfully!`,
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error(`Error updating ${name}:`, error);
      setMessage({
        type: 'error',
        text: `Error updating ${name === 'firstName' ? 'first name' : 'last name'}. Please try again.`,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: '', text: '' });

    try {
      // Update profile in the database
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        updated_at: new Date(),
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: 'Error updating profile. Please try again.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateEmail = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setEmailMessage({ type: '', text: '' });

    try {
      // Update email if changed
      if (emailData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: emailData.email,
        });
        if (emailError) throw emailError;

        setEmailMessage({
          type: 'success',
          text: 'Please check your new email inbox for a confirmation link. Your email will not be updated until you click the confirmation link.',
        });
      } else {
        setEmailMessage({
          type: 'info',
          text: 'No changes to email detected.',
        });
      }
    } catch (error) {
      console.error('Error updating email:', error);
      setEmailMessage({
        type: 'error',
        text: 'Error updating email. Please try again.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setPasswordMessage({ type: '', text: '' });

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New passwords do not match.',
      });
      setUpdating(false);
      return;
    }

    try {
      // First verify the current password
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordMessage({
          type: 'error',
          text: 'Current password is incorrect.',
        });
        setUpdating(false);
        return;
      }

      // If current password is correct, proceed with password update
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setPasswordMessage({
        type: 'success',
        text: 'Password updated successfully!',
      });
    } catch (error) {
      console.error('Error updating password:', error);

      // Extract specific error message if available
      let errorMessage = 'Error updating password. Please try again.';

      if (error.message) {
        // Check for specific error messages and provide user-friendly responses
        if (error.message.includes('different from the old password')) {
          errorMessage =
            'New password must be different from your current password.';
        } else if (error.message.includes('Password should be')) {
          // Password strength requirements
          errorMessage = error.message;
        } else {
          // Use the API error message if available
          errorMessage = error.message;
        }
      }

      setPasswordMessage({ type: 'error', text: errorMessage });
    } finally {
      setUpdating(false);
    }
  };

  // Handler to update credits state when BillingCard reports success
  const handleCreditsUpdate = (newCredits) => {
    setProjectCredits(newCredits);
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Account">
        <div className="loading">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Account">
      <div className="account-container">
        <div className="account-section">
          <h2 className="section-title">Profile Information</h2>

          <div className="user-name-display">
            <h2 className="user-full-name">
              {formData.firstName} {formData.lastName}
            </h2>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

          <form className="account-form">
            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="firstName">
                  <AccountIcon className="form-icon" />
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleNameBlur}
                  className="account-input"
                  placeholder="Your first name"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="lastName">
                  <AccountIcon className="form-icon" />
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleNameBlur}
                  className="account-input"
                  placeholder="Your last name"
                />
              </div>
            </div>
          </form>
        </div>

        {/* --- Billing Section --- */}
        <BillingCard
          projectCredits={projectCredits}
          onCreditsUpdate={handleCreditsUpdate}
        />
        {/* --- End Billing Section --- */}

        <div className="account-section">
          <h2 className="section-title">Email Address</h2>
          {emailMessage.text && (
            <div className={`message ${emailMessage.type}`}>
              {emailMessage.text}
            </div>
          )}
          <form onSubmit={updateEmail} className="account-form">
            <div className="form-group">
              <label htmlFor="email">
                <EnvelopeIcon className="form-icon" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={emailData.email}
                onChange={handleEmailChange}
                className="account-input"
                placeholder="Your email address"
              />
            </div>

            <button type="submit" className="account-btn" disabled={updating}>
              {updating ? 'Updating...' : 'Update Email'}
            </button>
            <p className="input-help">
              A confirmation link will be sent to verify your new email
            </p>
          </form>
        </div>

        <div className="account-section">
          <h2 className="section-title">Change Password</h2>
          {passwordMessage.text && (
            <div className={`message ${passwordMessage.type}`}>
              {passwordMessage.text}
            </div>
          )}
          <form onSubmit={updatePassword} className="account-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                <LockIcon className="form-icon" />
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="account-input"
                placeholder="Your current password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                <LockIcon className="form-icon" />
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="account-input"
                placeholder="Your new password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <LockIcon className="form-icon" />
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="account-input"
                placeholder="Confirm your new password"
                required
              />
            </div>

            <button type="submit" className="account-btn" disabled={updating}>
              {updating ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
