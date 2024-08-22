import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './SignupForm.css';

function SignupForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: ''
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters long';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.role) newErrors.role = 'Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { confirmPassword, ...userData } = formData;

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users`, userData);
      setSuccessMessage('Account created successfully! Redirecting to dashboard...');
      await login(formData.email, formData.password);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      setErrors({ form: error.response?.data?.message || 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sup-form">
      <h1 className="sup-title">Create Account</h1>
      {successMessage && (
        <div className="sup-alert sup-alert-success">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="sup-form-inner">
        <div className="sup-form-row">
          <div className="sup-form-group">
            <label htmlFor="firstName" className="sup-label">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`sup-input ${errors.firstName ? 'sup-input-invalid' : ''}`}
            />
            {errors.firstName && <div className="sup-error">{errors.firstName}</div>}
          </div>
          <div className="sup-form-group">
            <label htmlFor="lastName" className="sup-label">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`sup-input ${errors.lastName ? 'sup-input-invalid' : ''}`}
            />
            {errors.lastName && <div className="sup-error">{errors.lastName}</div>}
          </div>
        </div>
        <div className="sup-form-group">
          <label htmlFor="email" className="sup-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`sup-input ${errors.email ? 'sup-input-invalid' : ''}`}
          />
          {errors.email && <div className="sup-error">{errors.email}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="password" className="sup-label">Password</label>
          <div className="sup-password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`sup-input ${errors.password ? 'sup-input-invalid' : ''}`}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="sup-password-toggle"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <div className="sup-error">{errors.password}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="confirmPassword" className="sup-label">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`sup-input ${errors.confirmPassword ? 'sup-input-invalid' : ''}`}
          />
          {errors.confirmPassword && <div className="sup-error">{errors.confirmPassword}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="role" className="sup-label">Role</label>
          <select
            name="role"
            id="role"
            value={formData.role}
            onChange={handleChange}
            className={`sup-select ${errors.role ? 'sup-input-invalid' : ''}`}
          >
            <option value="">Select a role</option>
            <option value="agent">Agent</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
          {errors.role && <div className="sup-error">{errors.role}</div>}
        </div>
        <button type="submit" className="sup-button" disabled={isLoading}>
          {isLoading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {errors.form && (
        <div className="sup-alert sup-alert-danger">
          {errors.form}
        </div>
      )}
    </div>
  );
}

export default SignupForm;