// CreateListingPackageLogic.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../../context/api';
import CreateListingPackageForm from './CreateListingPackageForm';
import { useAuth } from '../../../../../context/AuthContext';
import PaywallOverlay from '../../../../../components/PaywallOverlay/PaywallOverlay';
import { Users, Plus, TrendingUp, Crown } from 'lucide-react';
import './CreateListingPackage.css';

const CreateListingPackageLogic = ({ onClose, addNewListing }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(2); // Start from step 2 (Address) instead of step 1 (Role)
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    apn: '',
    propertyType: '',
    askingPrice: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    sqFootage: '',
    lotSize: '',
    description: '',
    offerDueDate: '',
    agent1: user ? (user._id || user.id) : '',
    agentIds: [], // New field for multiple agents
    teamMemberIds: [], // New field for team members
    teamMembers: [], // New field for team member objects (including invites)
    companyName: '',
    officerName: '',
    officerPhone: '',
    officerEmail: '',
    officerNumber: '',
    scheduleShowingUrl: '',
    propertyImages: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showListingLimitPaywall, setShowListingLimitPaywall] = useState(false);

  const handleNextStep = () => {
    const newErrors = {};
    // Removed role validation since we removed the role step
    if (step === 2) { // Address step (previously step 2, now step 2)
      if (!formData.address) newErrors.address = 'Street Name and Number is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zip) newErrors.zip = 'Zip Code is required';
      if (!formData.county) newErrors.county = 'County is required';
    }
    if (step === 3) { // Property Features step (previously step 3, now step 3)
      if (!formData.propertyType) newErrors.propertyType = 'Property Type is required';
      if (!formData.askingPrice) newErrors.askingPrice = 'List Price is required';
      if (!formData.bedrooms) newErrors.bedrooms = 'Bedrooms is required';
      if (!formData.bathrooms) newErrors.bathrooms = 'Bathrooms is required';
      if (!formData.yearBuilt) newErrors.yearBuilt = 'Year Built is required';
      if (!formData.sqFootage) newErrors.sqFootage = 'Square Footage is required';
      if (!formData.lotSize) newErrors.lotSize = 'Lot Size is required';
    }
    if (step === 4) { // Listing Agents step
      if (!formData.agent1) newErrors.agent1 = 'At least one agent is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(step + 1);
  };

  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    console.log('CreateListingPackage: File upload triggered with files:', files);
    
    if (!files || files.length === 0) {
      console.log('CreateListingPackage: No files selected');
      return;
    }

    // Convert FileList to Array and validate files
    const newFiles = Array.from(files);
    console.log('CreateListingPackage: Processing files:', newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    // Check file count limit (100 photos max per upload)
    if (newFiles.length > 100) {
      console.error('CreateListingPackage: Too many files selected:', newFiles.length);
      setErrors({ photos: `You can only upload up to 100 photos at once. You selected ${newFiles.length} photos. Please select fewer photos and try again.` });
      return;
    }
    
    // Validate file types and sizes
    const validFiles = newFiles.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        console.error(`CreateListingPackage: Invalid file type: ${file.type}`);
        return false;
      }
      
      // Check file size (25MB limit to accommodate high-quality photos)
      if (file.size > 25 * 1024 * 1024) {
        console.error(`CreateListingPackage: File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      
      return true;
    });

    console.log('CreateListingPackage: Valid files:', validFiles.length);

    if (validFiles.length === 0) {
      setErrors({ photos: 'Please select valid image files (JPG, PNG) under 25MB each' });
      return;
    }

    if (validFiles.length !== newFiles.length) {
      setErrors({ photos: `Some files were invalid. ${validFiles.length} of ${newFiles.length} files will be uploaded.` });
    } else {
      // Clear any previous photo errors
      setErrors(prev => ({ ...prev, photos: '' }));
    }

    // Add files to the end of the existing array to preserve order
    setFormData((prevData) => {
      const updatedImages = [...(prevData.propertyImages || []), ...validFiles];
      console.log('CreateListingPackage: Updated propertyImages count:', updatedImages.length);
      return {
        ...prevData,
        propertyImages: updatedImages,
      };
    });

    // Clear the file input to allow selecting the same files again
    e.target.value = '';
  };

  const handleRemovePhoto = (indexToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      propertyImages: prevData.propertyImages.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleReorderPhotos = (reorderedFiles) => {
    setFormData((prevData) => ({
      ...prevData,
      propertyImages: reorderedFiles,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!token) {
      setErrors({ submit: 'You must be logged in to create a listing' });
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();

    // Append files in the order they appear in propertyImages
    formData.propertyImages.forEach((file, index) => {
      formDataToSend.append('propertyImages', file);
    });

    // Append other fields
    Object.keys(formData).forEach(key => {
      if (key !== 'propertyImages' && formData[key]) {
        formDataToSend.append(key, formData[key]);
      }
    });

    // Add timezone information for offer due date
    if (formData.offerDueDate) {
      formDataToSend.append('offerDueDateTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    }

    try {
      console.log('Creating listing with token:', token ? 'Present' : 'Missing');
      const response = await api.post('/api/propertyListings', formDataToSend);
      console.log('Listing created successfully:', response.data);
      
      // Send team member invitations if any
      if (formData.teamMembers && formData.teamMembers.length > 0) {
        const inviteTeamMembers = formData.teamMembers.filter(tm => tm.isInvite);
        if (inviteTeamMembers.length > 0) {
          console.log('Sending team member invitations...');
          for (const invite of inviteTeamMembers) {
            try {
              await api.post('/api/users/invite-team-member', {
                email: invite.inviteEmail,
                firstName: invite.firstName,
                lastName: invite.lastName,
                listingId: response.data._id,
                propertyAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
                inviterName: `${user.firstName} ${user.lastName}`
              }, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              console.log(`Invitation sent to ${invite.inviteEmail}`);
            } catch (inviteError) {
              console.error(`Failed to send invitation to ${invite.inviteEmail}:`, inviteError);
              // Don't fail the entire listing creation if invitation fails
            }
          }
        }
      }
      
      addNewListing(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating listing:', error);
      if (error.response?.status === 401) {
        setErrors({ submit: 'Your session has expired. Please log in again.' });
        navigate('/login');
      } else if (error.response?.status === 403 && error.response?.data?.code === 'LISTING_LIMIT_REACHED') {
        setShowListingLimitPaywall(true);
      } else {
        setErrors({
          submit: error.response?.data?.message || 'Failed to create listing. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show paywall modal when listing limit is reached
  if (showListingLimitPaywall) {
    const listingLimitBenefits = [
      { icon: <Users size={18} />, text: "Create unlimited active listings" },
      { icon: <Plus size={18} />, text: "No restrictions on property count" },
      { icon: <TrendingUp size={18} />, text: "Scale your business without limits" },
      { icon: <Crown size={18} />, text: "Premium features for professional agents" }
    ];

    return (
      <div className="clp-modal">
        <div className="clp-content">
          <button className="clp-close-button" onClick={onClose}></button>
          <PaywallOverlay
            featureTitle="Listing Limit Reached"
            featureDescription="You've reached the 5-listing limit for free accounts. Upgrade to Pro to create unlimited listings and access premium features."
            featureIcon={<Users size={48} />}
            benefits={listingLimitBenefits}
            ctaText="Upgrade to Pro"
            variant="inline"
          />
        </div>
      </div>
    );
  }

  return (
    <CreateListingPackageForm
      step={step}
      formData={formData}
      errors={errors}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      handleChange={handleChange}
      handleFileChange={handleFileChange}
      handleRemovePhoto={handleRemovePhoto}
      handleReorderPhotos={handleReorderPhotos}
      handleSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
    />
  );
};

export default CreateListingPackageLogic;
