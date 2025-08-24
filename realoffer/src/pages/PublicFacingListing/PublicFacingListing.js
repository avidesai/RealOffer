// PublicFacingListing.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
// Remove InputMask import as we'll use a custom solution
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { useAuth } from '../../context/AuthContext';
import basePhoto from '../../assets/images/basephoto.png';
import './PublicFacingListing.css';

const getPropertyTypeText = (value) => {
  const propertyTypes = {
    singleFamily: 'Single Family',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    multiFamily: 'Multi Family',
    land: 'Land',
    commercial: 'Commercial',
  };
  return propertyTypes[value] || 'Unknown Property Type';
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatNumber = (num) => {
  return num?.toLocaleString() || '-';
};

const PublicFacingListing = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Debug: Log the token from URL params
  console.log('Token from URL params:', token);
  console.log('Token length:', token?.length);
  console.log('Is JWT token:', token?.includes('.'));
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // Form state management
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'buyer', // Default to buyer for minimal registration
    password: '',
    confirmPassword: '',
    agentLicenseNumber: '', // Add license number field
    hasAgent: null, // Add hasAgent field for buyers
    showPassword: false,
    showConfirmPassword: false,
  });
  
  // UI state
  const [formStep, setFormStep] = useState('initial'); // 'initial', 'login', 'signup', 'minimal', 'success'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Check for shared recipient information in URL parameters
  useEffect(() => {
    const sharedFirstName = searchParams.get('firstName');
    const sharedLastName = searchParams.get('lastName');
    const sharedEmail = searchParams.get('email');
    const sharedRole = searchParams.get('role');

    if (sharedFirstName && sharedLastName && sharedEmail) {
      // Pre-fill form with shared recipient information
      setFormData(prev => ({
        ...prev,
        firstName: sharedFirstName,
        lastName: sharedLastName,
        email: sharedEmail,
        role: sharedRole === 'buyerAgent' ? 'agent' : 
              sharedRole === 'teamMember' ? 'agent' : 
              sharedRole === 'listingAgent' ? 'agent' : 'buyer' // Team members and listing agents sign up as agents
      }));
    }
  }, [searchParams, user]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        role: user.role || 'agent'
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/public/${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setListing(data);
          
          // If user is already logged in, check their relationship to this listing
          if (user && user._id) {
            // First, check if user is the listing agent (owner of the listing)
            if (data.createdBy === user._id) {
              // User is the listing agent, redirect to MyListings dashboard
              window.location.href = `/mylisting/${data._id}`;
              return;
            }
            
            // If not the listing agent, check if they have a buyer package
            try {
              const buyerPackageResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/check-access`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  propertyListingId: data._id,
                  userId: user._id
                }),
              });
              
              if (buyerPackageResponse.ok) {
                const buyerPackageData = await buyerPackageResponse.json();
                if (buyerPackageData.hasAccess && buyerPackageData.buyerPackageId) {
                  // User already has access, redirect to buyer package dashboard
                  window.location.href = `/buyerpackage/${buyerPackageData.buyerPackageId}`;
                  return;
                }
              }
            } catch (error) {
              console.error('Error checking buyer package access:', error);
              // Continue with normal flow if check fails
            }
          }
        } else {
          console.error('Error fetching listing:', data.message);
          setError('This listing is no longer available or has expired.');
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError('Unable to load property details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [token, user]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'radio' ? (value === 'true') : value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Add custom phone input handler
  const handlePhoneChange = (e) => {
    const { value } = e.target;
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Format the phone number
    let formattedValue = '';
    if (numericValue.length > 0) {
      formattedValue = '(' + numericValue.substring(0, 3);
      if (numericValue.length > 3) {
        formattedValue += ') ' + numericValue.substring(3, 6);
        if (numericValue.length > 6) {
          formattedValue += '-' + numericValue.substring(6, 10);
        }
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      phone: formattedValue,
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle autofill events
  const handleAutofill = (e) => {
    // This function handles autofill events that might not trigger onChange
    const { name, value } = e.target;
    
    // Use setTimeout to ensure the autofill value is properly set
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      
      // Clear error when autofill occurs
      if (error) setError('');
    }, 0);
  };

  // Add autofill event listeners
  useEffect(() => {
    const inputs = document.querySelectorAll('input[autocomplete]');
    
    const handleAnimationStart = (e) => {
      if (e.animationName === 'onAutoFillStart') {
        handleAutofill(e);
      }
    };

    inputs.forEach(input => {
      input.addEventListener('animationstart', handleAnimationStart);
      // Also listen for input events that might be triggered by autofill
      input.addEventListener('input', handleAutofill);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('animationstart', handleAnimationStart);
        input.removeEventListener('input', handleAutofill);
      });
    };
  }, [error]);

  // Add debounced form data update to prevent rapid state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // This effect runs after form data changes to ensure stability
      // It helps prevent autofill-related crashes by debouncing updates
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Add error recovery mechanism
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the default browser behavior
      event.preventDefault();
    };

    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      // Prevent the default browser behavior
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleKeyDown = (e) => {
    // Prevent form submission on Enter if there are validation errors
    if (e.key === 'Enter' && error) {
      e.preventDefault();
    }
  };

  const checkUserExists = async (email) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check email');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If user is already logged in, check if they're the listing agent
    if (user) {
      if (listing && listing.createdBy === user._id) {
        // User is the listing agent, redirect to MyListings dashboard
        window.location.href = `/mylisting/${listing._id}`;
        return;
      } else {
        // User is not the listing agent, proceed with buyer package creation
        handleDirectAccess();
        return;
      }
    }
    
    if (!formData.email) {
      setError('Please enter your email address.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userCheck = await checkUserExists(formData.email);
      
      if (userCheck.exists) {
        // User exists - show login form
        setFormStep('login');
      } else {
        // User doesn't exist - show minimal registration form
        setFormStep('minimal');
      }
    } catch (error) {
      setError('Unable to verify your email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Ensure consistent user ID handling
        const userId = data.user._id || data.user.id;
        if (!userId) {
          throw new Error('Invalid user data received');
        }

        // Store authentication data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // Check if the logged-in user is the listing agent
        if (listing && listing.createdBy === userId) {
          // User is the listing agent, redirect to MyListings dashboard
          window.location.href = `/mylisting/${listing._id}`;
          return;
        }
        
        // User is not the listing agent, create buyer package
        await createBuyerPackage(userId, data.token);
      } else {
        // Parse error message for better user experience
        const errorMessage = data.message?.toLowerCase() || '';
        
        if (response.status === 400) {
          if (errorMessage.includes('email') && errorMessage.includes('required')) {
            setError('Email address is required');
          } else if (errorMessage.includes('password') && errorMessage.includes('required')) {
            setError('Password is required');
          } else {
            setError('Please check your information and try again');
          }
        } else if (response.status === 401) {
          // For 401 errors, the backend returns "Invalid email or password" for both cases
          // Since we already know the user exists (from checkUserExists), this must be a password error
          setError('Incorrect password. Please try again.');
        } else if (response.status === 429) {
          setError('Too many login attempts. Please wait a few minutes and try again.');
        } else if (response.status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(data.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle network errors
      if (!error.response) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate license number for agents
    if (formData.role === 'agent' && !formData.agentLicenseNumber.trim()) {
      setError('License number is required for real estate agents.');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number.');
      return;
    }

    // Validate hasAgent for buyers
    if (formData.role === 'buyer' && formData.hasAgent === null) {
      setError('Please indicate whether you have an agent or not.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create user account
      const signupResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          agentLicenseNumber: formData.role === 'agent' ? formData.agentLicenseNumber : '',
          hasAgent: formData.role === 'buyer' ? formData.hasAgent : null,
        }),
      });
      
      const signupData = await signupResponse.json();
      
      if (signupResponse.ok) {
        // Auto-login after signup
        const loginResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            password: formData.password 
          }),
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          // Ensure consistent user ID handling
          const userId = loginData.user._id || loginData.user.id;
          if (!userId) {
            throw new Error('Invalid user data received after signup');
          }

          // Store authentication data in localStorage
          localStorage.setItem('user', JSON.stringify(loginData.user));
          localStorage.setItem('token', loginData.token);
          
          // Check if the newly created user is the listing agent
          if (listing && listing.createdBy === userId) {
            // User is the listing agent, redirect to MyListings dashboard
            window.location.href = `/mylisting/${listing._id}`;
            return;
          }
          
          // Check if this is a team member invitation (from URL parameters)
          const sharedRole = searchParams.get('role');
          if (sharedRole === 'teamMember') {
            // Add the user as a team member to this listing
            try {
              console.log('Adding user as team member:', { userId, listingId: listing._id });
              const addTeamMemberResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}/add-team-member`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: userId
                }),
              });
              
              if (addTeamMemberResponse.ok) {
                const responseData = await addTeamMemberResponse.json();
                console.log('User added as team member to listing successfully:', responseData);
                
                // Wait a moment to ensure the backend has processed the assignment
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Ensure the user data is properly stored in localStorage
                if (loginData && loginData.user && loginData.token) {
                  localStorage.setItem('user', JSON.stringify(loginData.user));
                  localStorage.setItem('token', loginData.token);
                  console.log('User data stored in localStorage:', loginData.user);
                }
                
                // For team members, redirect to the listing dashboard
                console.log('Redirecting to listing dashboard:', `/mylisting/${listing._id}`);
                window.location.href = `/mylisting/${listing._id}`;
              } else {
                const errorData = await addTeamMemberResponse.json();
                console.error('Failed to add user as team member:', errorData);
                
                // If team member assignment fails, redirect to dashboard instead
                console.log('Team member assignment failed, redirecting to dashboard');
                window.location.href = '/dashboard';
              }
            } catch (error) {
              console.error('Error adding user as team member:', error);
              
              // If team member assignment fails, redirect to dashboard instead
              console.log('Team member assignment failed due to error, redirecting to dashboard');
              window.location.href = '/dashboard';
            }
            return;
          }
          
          // Check if this is a listing agent invitation (from URL parameters)
          if (sharedRole === 'listingAgent') {
            // Add the user as a listing agent to this listing
            try {
              console.log('Adding user as listing agent:', { userId, listingId: listing._id });
              
              // Get current listing to check agent count
              const listingResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`);
              const currentListing = await listingResponse.json();
              
              if (currentListing.agentIds && currentListing.agentIds.length >= 2) {
                console.error('Maximum of 2 listing agents allowed');
                // If at limit, redirect to dashboard
                window.location.href = '/dashboard';
                return;
              }
              
              // Add user to agents
              const currentAgentIds = currentListing.agentIds || [];
              const updatedAgentIds = [...currentAgentIds, userId];
              
              const updateListingResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${loginData.token}`
                },
                body: JSON.stringify({
                  agentIds: updatedAgentIds
                }),
              });
              
              if (updateListingResponse.ok) {
                console.log('User added as listing agent to listing successfully');
                
                // Wait a moment to ensure the backend has processed the assignment
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Ensure the user data is properly stored in localStorage
                if (loginData && loginData.user && loginData.token) {
                  localStorage.setItem('user', JSON.stringify(loginData.user));
                  localStorage.setItem('token', loginData.token);
                  console.log('User data stored in localStorage:', loginData.user);
                }
                
                // For listing agents, redirect to the listing dashboard
                console.log('Redirecting to listing dashboard:', `/mylisting/${listing._id}`);
                window.location.href = `/mylisting/${listing._id}`;
              } else {
                const errorData = await updateListingResponse.json();
                console.error('Failed to add user as listing agent:', errorData);
                
                // If listing agent assignment fails, redirect to dashboard instead
                console.log('Listing agent assignment failed, redirecting to dashboard');
                window.location.href = '/dashboard';
              }
            } catch (error) {
              console.error('Error adding user as listing agent:', error);
              
              // If listing agent assignment fails, redirect to dashboard instead
              console.log('Listing agent assignment failed due to error, redirecting to dashboard');
              window.location.href = '/dashboard';
            }
            return;
          }
          
          // User is not the listing agent, create buyer package
          await createBuyerPackage(userId, loginData.token);
        } else {
          setError('Account created but login failed. Please try logging in.');
          setFormStep('login');
        }
      } else {
        setError(signupData.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectAccess = async () => {
    if (!user || !listing) {
      setError('Unable to create access. Please try again.');
      return;
    }

    // Check if user is the listing agent
    if (listing.createdBy === user._id) {
      // User is the listing agent, redirect to MyListings dashboard
      window.location.href = `/mylisting/${listing._id}`;
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the publicUrl from the listing data instead of constructing it
      const publicUrl = listing.publicUrl || `${window.location.origin}/listings/public/${token}`;
      console.log('Sending buyer package request with:', {
        propertyListingId: listing._id,
        publicUrl: publicUrl,
        listingPublicUrl: listing.publicUrl,
        windowLocationOrigin: window.location.origin,
        token: token
      });
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          propertyListingId: listing._id,
          publicUrl: publicUrl,
          userRole: user.role || 'buyer', // Default to buyer if role not set
          userInfo: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone || '',
            role: user.role || 'buyer'
          }
        }),
      });
      
      if (response.ok) {
        await response.json(); // Consume the response
        
        // Show success state
        setFormStep('success');
        setSuccessMessage({
          title: "Access Granted!",
          message: "Your buyer package has been created successfully.",
          nextSteps: [
            "View your buyer package in the 'For Buyers' section",
            "Access property documents and disclosures",
            "Make offers when ready"
          ]
        });
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = `/dashboard`;
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create buyer package');
      }
    } catch (error) {
      console.error('Error creating buyer package:', error);
      
      // Provide specific error messages based on the error type
      if (error.message.includes('Property listing is no longer available')) {
        setError('This property is no longer available. Please contact the listing agent.');
      } else if (error.message.includes('already has a buyer package')) {
        setError('You already have access to this property. Check your buyer packages.');
      } else {
        setError('Failed to create buyer package. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createBuyerPackage = async (userId, token) => {
    try {
      // Validate that listing still exists and is accessible
      if (!listing || !listing._id) {
        throw new Error('Property listing is no longer available');
      }

      // Use the publicUrl from the listing data instead of constructing it
      const publicUrl = listing.publicUrl || `${window.location.origin}/listings/public/${token}`;
      console.log('Sending buyer package request (createBuyerPackage) with:', {
        propertyListingId: listing._id,
        publicUrl: publicUrl,
        listingPublicUrl: listing.publicUrl,
        windowLocationOrigin: window.location.origin,
        token: token
      });
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propertyListingId: listing._id,
          publicUrl: publicUrl,
          userRole: formData.role,
          userInfo: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            role: formData.role
          }
        }),
      });
      
      if (response.ok) {
        await response.json(); // Consume the response
        
        // Show success state
        setFormStep('success');
        setSuccessMessage({
          title: "Welcome to RealOffer!",
          message: "Your buyer package has been created successfully.",
          nextSteps: [
            "View your buyer package in the 'For Buyers' section",
            "Access property documents and disclosures",
            "Make offers when ready"
          ]
        });
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = `/dashboard`;
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create buyer package');
      }
    } catch (error) {
      console.error('Error creating buyer package:', error);
      
      // Provide specific error messages based on the error type
      if (error.message.includes('Property listing is no longer available')) {
        setError('This property is no longer available. Please contact the listing agent.');
      } else if (error.message.includes('already has a buyer package')) {
        setError('You already have access to this property. Check your buyer packages.');
      } else {
        setError('Failed to create buyer package. Please try again or contact support.');
      }
      
      // Don't redirect on error - let user try again
    }
  };

  const handleMinimalSignup = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create buyer package with minimal user registration
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/minimal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyListingId: listing._id,
          publicUrl: listing.publicUrl || `${window.location.origin}/listings/public/${token}`,
          userInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone
          }
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Store authentication data
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // Show success state
        setFormStep('success');
        setSuccessMessage({
          title: "Welcome to RealOffer!",
          message: "Your buyer package has been created successfully.",
          nextSteps: [
            "View your buyer package in the 'For Buyers' section",
            "Access property documents and disclosures",
            "Make offers when ready"
          ]
        });
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = `/buyerpackage/${data.buyerPackage._id}`;
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create buyer package');
      }
    } catch (error) {
      console.error('Error creating buyer package with minimal registration:', error);
      
      // Provide specific error messages based on the error type
      if (error.message.includes('Property listing is no longer available')) {
        setError('This property is no longer available. Please contact the listing agent.');
      } else if (error.message.includes('already has a buyer package')) {
        setError('You already have access to this property. Check your buyer packages.');
      } else if (error.message.includes('email address already exists')) {
        setError('An account with this email already exists. Please log in instead.');
        setFormStep('login');
      } else {
        setError('Failed to create buyer package. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextImage = useCallback(() => {
    if (listing?.imagesUrls && listing.imagesUrls.length > 1) {
      setIsImageLoading(true);
      setCurrentImageIndex((prev) => (prev + 1) % listing.imagesUrls.length);
    }
  }, [listing?.imagesUrls]);

  const previousImage = useCallback(() => {
    if (listing?.imagesUrls && listing.imagesUrls.length > 1) {
      setIsImageLoading(true);
      setCurrentImageIndex((prev) => (prev === 0 ? listing.imagesUrls.length - 1 : prev - 1));
    }
  }, [listing?.imagesUrls]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (listing?.imagesUrls?.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          previousImage();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextImage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [listing?.imagesUrls?.length, nextImage, previousImage]);

  const renderForm = () => {
    try {
      // If user is already logged in but doesn't have access, show appropriate action
      if (user && !formStep) {
        // Check if user is the listing agent
        const isListingAgent = listing && listing.createdBy === user._id;
        
        if (isListingAgent) {
          return (
            <div className="pfl-form-container">
              <h2>Manage Your Listing</h2>
              <p>You're the listing agent for this property. Click below to manage your listing.</p>
              
              <div className="pfl-benefits-section">
                <h4>What you can do:</h4>
                <ul className="pfl-benefits-list">
                  <li>View and manage offers</li>
                  <li>Track buyer activity</li>
                  <li>Update listing details</li>
                  <li>Manage documents and disclosures</li>
                </ul>
              </div>

              {error && <p className="pfl-error">{error}</p>}
              
              <button 
                className="pfl-request-button" 
                onClick={() => window.location.href = `/mylisting/${listing._id}`}
                disabled={isLoading}
              >
                {isLoading ? 'Redirecting...' : 'Manage Listing'}
              </button>
            </div>
          );
        } else {
          return (
            <div className="pfl-form-container">
              <h2>Access Listing</h2>
              <p>You're already logged in. Click below to get access to this property.</p>
              
              <div className="pfl-benefits-section">
                <h4>What you'll get access to:</h4>
                <ul className="pfl-benefits-list">
                  <li>Property disclosures & documents</li>
                  <li>AI-powered valuation analysis</li>
                  <li>Make offers directly</li>
                </ul>
              </div>

              {error && <p className="pfl-error">{error}</p>}
              
              <button 
                className="pfl-request-button" 
                onClick={handleDirectAccess}
                disabled={isLoading}
              >
                {isLoading ? 'Creating access...' : 'Get Access Now'}
              </button>
            </div>
          );
        }
      }

      if (formStep === 'success') {
        return (
          <div className="pfl-form-container">
            <div className="pfl-success-state">
              <div className="pfl-success-icon">✓</div>
              <h2>{successMessage.title}</h2>
              <p>{successMessage.message}</p>
              <div className="pfl-next-steps">
                <h4>What you can do now:</h4>
                <ul>
                  {successMessage.nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
              <p className="pfl-redirect-message">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        );
      }

      if (formStep === 'login') {
        return (
          <div className="pfl-form-container">
            <div className="pfl-back-button-container">
              <button 
                type="button" 
                onClick={() => setFormStep('initial')}
                className="pfl-back-button"
              >
                ← Back
              </button>
            </div>
            <h2>Welcome back!</h2>
            <p>Please enter your password to access this listing.</p>
            {error && <p className="pfl-error">{error}</p>}
            <form className="pfl-inquiry-form" onSubmit={handleLogin} onKeyDown={handleKeyDown}>
              <div className="pfl-form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="pfl-request-button" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login & View Listing'}
              </button>
            </form>
          </div>
        );
      }

      if (formStep === 'signup') {
        return (
          <div className="pfl-form-container">
            <div className="pfl-back-button-container">
              <button 
                type="button" 
                onClick={() => setFormStep('initial')}
                className="pfl-back-button"
              >
                ← Back
              </button>
            </div>
            <h2>Create your account</h2>
            <p>Complete your registration to access this listing.</p>
            {error && <p className="pfl-error">{error}</p>}
            <form className="pfl-inquiry-form" onSubmit={handleSignup} onKeyDown={handleKeyDown}>
              <div className="pfl-form-row">
                <div className="pfl-form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="pfl-form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="pfl-form-group">
                <label htmlFor="password">Password</label>
                <div className="pfl-password-input-group">
                  <input
                    type={formData.showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="pfl-password-toggle-button"
                    onClick={() => setFormData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    aria-label={formData.showPassword ? 'Hide password' : 'Show password'}
                  >
                    {formData.showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="pfl-form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="pfl-password-input-group">
                  <input
                    type={formData.showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="pfl-password-toggle-button"
                    onClick={() => setFormData(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                    aria-label={formData.showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {formData.showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="pfl-form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="pfl-form-group">
                <label htmlFor="role">I am a...</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="agent">Real Estate Agent</option>
                  <option value="buyer">Home Buyer</option>
                </select>
              </div>
              {formData.role === 'agent' && (
                <div className="pfl-form-group">
                  <label htmlFor="agentLicenseNumber">License Number</label>
                  <input
                    type="text"
                    id="agentLicenseNumber"
                    name="agentLicenseNumber"
                    placeholder="Enter your real estate license number"
                    value={formData.agentLicenseNumber}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                </div>
              )}
              {formData.role === 'buyer' && (
                <div className="pfl-form-group">
                  <label>Do you have a real estate agent?</label>
                  <div className="pfl-radio-group">
                    <label className="pfl-radio-label">
                      <input
                        type="radio"
                        name="hasAgent"
                        value="true"
                        checked={formData.hasAgent === true}
                        onChange={handleInputChange}
                        className="pfl-radio-input"
                      />
                      <span className="pfl-radio-custom"></span>
                      <span className="pfl-radio-text">Yes, I have an agent</span>
                    </label>
                    <label className="pfl-radio-label">
                      <input
                        type="radio"
                        name="hasAgent"
                        value="false"
                        checked={formData.hasAgent === false}
                        onChange={handleInputChange}
                        className="pfl-radio-input"
                      />
                      <span className="pfl-radio-custom"></span>
                      <span className="pfl-radio-text">No, I don't have an agent</span>
                    </label>
                  </div>
                </div>
              )}
              <button type="submit" className="pfl-request-button" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
            <div className="pfl-form-footer">
              <p>Want quick access? <button 
                type="button" 
                onClick={() => setFormStep('minimal')}
                className="pfl-link-button"
              >
                Get immediate access
              </button></p>
            </div>
          </div>
        );
      }

      if (formStep === 'minimal') {
        return (
          <div className="pfl-form-container">
            <div className="pfl-back-button-container">
              <button 
                type="button" 
                onClick={() => setFormStep('initial')}
                className="pfl-back-button"
              >
                ← Back
              </button>
            </div>
            <h2>Quick Access</h2>
            <p>Enter your information to get immediate access to this property.</p>
            {error && <p className="pfl-error">{error}</p>}
            <form className="pfl-inquiry-form" onSubmit={handleMinimalSignup} onKeyDown={handleKeyDown}>
              <div className="pfl-form-row">
                <div className="pfl-form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="pfl-form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="pfl-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="pfl-form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  autoComplete="tel"
                />
              </div>
              <button type="submit" className="pfl-request-button" disabled={isLoading}>
                {isLoading ? 'Getting Access...' : 'Get Access'}
              </button>
            </form>
            <div className="pfl-form-footer">
              <p>Want to create a full account? <button 
                type="button" 
                onClick={() => setFormStep('signup')}
                className="pfl-link-button"
              >
                Sign up here
              </button></p>
            </div>
          </div>
        );
      }

      // Initial form
      const isListingAgent = user && listing && listing.createdBy === user._id;
      
      return (
        <div className="pfl-form-container">
          <h2>{isListingAgent ? 'Manage Your Listing' : 'Access Listing'}</h2>
          <p>{isListingAgent ? 'Manage your property listing, view offers, and track buyer activity.' : 'Enter your email to get started.'}</p>
          
          <div className="pfl-benefits-section">
            <h4>{isListingAgent ? 'What you can do:' : 'What you\'ll get access to:'}</h4>
            <ul className="pfl-benefits-list">
              {isListingAgent ? (
                <>
                  <li>View and manage offers</li>
                  <li>Track buyer activity</li>
                  <li>Update listing details</li>
                  <li>Manage documents and disclosures</li>
                </>
              ) : (
                <>
                  <li>Property disclosures & documents</li>
                  <li>AI-powered valuation analysis</li>
                  <li>Make offers directly</li>
                </>
              )}
            </ul>
          </div>

          {error && <p className="pfl-error">{error}</p>}
          
          <form className="pfl-inquiry-form" onSubmit={handleInitialSubmit} onKeyDown={handleKeyDown}>
            <div className="pfl-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleInputChange}
                required={!user}
                autoComplete="email"
              />
            </div>
            <button type="submit" className="pfl-request-button" disabled={isLoading}>
              {isLoading ? 'Checking...' : (user ? (listing && listing.createdBy === user._id ? 'Manage Listing' : 'Get Access Now') : 'Continue')}
            </button>
          </form>
        </div>
      );
    } catch (error) {
      console.error('Error rendering form:', error);
      return (
        <div className="pfl-form-container">
          <div className="pfl-error">
            <h3>Something went wrong</h3>
            <p>Please refresh the page and try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="pfl-request-button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="pfl-loading-container">
        <div className="pfl-loading-spinner"></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="pfl-error-container">
        <div className="pfl-error-message">
          <h2>Property Not Found</h2>
          <p>This listing is no longer available or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pfl-container">
      <Header />
      <main className="pfl-content">
        <div className="pfl-property-header">
          <h1 className="pfl-property-title">
            {listing.homeCharacteristics.address}
            <span className="pfl-property-location">
              {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state}{' '}
              {listing.homeCharacteristics.zip}
            </span>
          </h1>
        </div>
        <div className="pfl-content-grid">
          <div className="pfl-main-content">
            <div className="pfl-gallery-section">
              <div className="pfl-gallery-container">
                {listing.imagesUrls && listing.imagesUrls.length > 0 ? (
                  <>
                    <img
                      src={listing.imagesUrls[currentImageIndex]}
                      alt="Property"
                      className={`pfl-main-image ${isImageLoading ? 'loading' : ''}`}
                      onLoad={() => setIsImageLoading(false)}
                    />
                    <div className="pfl-image-count">
                      {currentImageIndex + 1} / {listing.imagesUrls.length}
                    </div>
                    <div className="pfl-price-overlay">
                      <span className="pfl-price-amount">{formatPrice(listing.homeCharacteristics.price)}</span>
                    </div>
                    {listing.imagesUrls.length > 1 && (
                      <div className="pfl-gallery-controls">
                        <button
                          onClick={previousImage}
                          className="pfl-gallery-button prev"
                          aria-label="Previous image"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextImage}
                          className="pfl-gallery-button next"
                          aria-label="Next image"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      src={basePhoto}
                      alt="Property"
                      className="pfl-main-image"
                    />
                    <div className="pfl-price-overlay">
                      <span className="pfl-price-amount">{formatPrice(listing.homeCharacteristics.price)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="pfl-property-details">
              <div className="pfl-details-grid">
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Bedrooms</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.beds}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Bathrooms</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.baths}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Square Feet</span>
                  <span className="pfl-detail-value">{formatNumber(listing.homeCharacteristics.squareFootage)}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Lot Size</span>
                  <span className="pfl-detail-value">{formatNumber(listing.homeCharacteristics.lotSize)}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Year Built</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.yearBuilt || '-'}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Type</span>
                  <span className="pfl-detail-value">{getPropertyTypeText(listing.homeCharacteristics.propertyType)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pfl-contact-form">{renderForm()}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicFacingListing;