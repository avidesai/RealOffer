import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
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
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setErrors({
            ...errors,
            [e.target.name]: ''
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Form validation
        const newErrors = {};
        if (!formData.firstName) newErrors.firstName = 'First Name is required';
        if (!formData.lastName) newErrors.lastName = 'Last Name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.role) newErrors.role = 'Role is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const { confirmPassword, ...userData } = formData;

        try {
            const response = await axios.post('http://localhost:8000/api/users', userData);
            console.log('User created:', response.data);
            navigate('/login');
        } catch (error) {
            console.error('Error creating user:', error.response?.data || 'Server error');
        }
    };

    return (
        <div className="signup-form">
            <h1 className="signup-title">Create Account</h1>
            <form onSubmit={handleSubmit}>
                <div className="name-group">
                    <div className="input-group">
                        <label htmlFor="firstName">First Name</label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                        {errors.firstName && <div className="error">{errors.firstName}</div>}
                    </div>
                    <div className="input-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                        {errors.lastName && <div className="error">{errors.lastName}</div>}
                    </div>
                </div>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                    {errors.email && <div className="error">{errors.email}</div>}
                </div>
                <div className="input-group password-group">
                    <div className="password-label-group">
                        <label htmlFor="password">Password</label>
                        <button type="button" onClick={togglePasswordVisibility} className="toggle-password">
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} required />
                    {errors.password && <div className="error">{errors.password}</div>}
                </div>
                <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                    {errors.confirmPassword && <div className="error">{errors.confirmPassword}</div>}
                </div>
                <div className="input-group">
                    <label htmlFor="role">Role</label>
                    <select name="role" id="role" value={formData.role} onChange={handleChange} required className="select-input">
                        <option value="" disabled>Select a role</option>
                        <option value="agent">Agent</option>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                    </select>
                    {errors.role && <div className="error">{errors.role}</div>}
                </div>
                <button type="submit" className="signup-button">Sign Up</button>
            </form>
        </div>
    );
}

export default SignupForm;
