// ProfileLogic.js

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';

const useProfileLogic = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [isUploading, setIsUploading] = useState({});
  const [noLicense, setNoLicense] = useState(false);

  const debounceTimer = useRef({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`);
        setProfileData(response.data);
        setLoading(false);
        // Set noLicense to true for buyers, or if no license number for agents
        setNoLicense(response.data.role === 'buyer' || !response.data.agentLicenseNumber);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user._id]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setProfileData({ ...profileData, [id]: value });

    if (debounceTimer.current[id]) {
      clearTimeout(debounceTimer.current[id]);
    }

    debounceTimer.current[id] = setTimeout(async () => {
      setUpdating({ ...updating, [id]: true });
      try {
        await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, { [id]: value });
      } catch (error) {
        console.error('Error updating user data:', error);
      } finally {
        setUpdating({ ...updating, [id]: false });
      }
    }, 1000);
  };

  const handlePhotoUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading({ ...isUploading, [field]: true });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', field);

    try {
      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedUser = response.data;
      setProfileData(updatedUser);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsUploading({ ...isUploading, [field]: false });
    }
  };

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setNoLicense(isChecked);
    if (isChecked) {
      setProfileData({ ...profileData, agentLicenseNumber: '' });
      setUpdating({ ...updating, agentLicenseNumber: true });
      axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, { agentLicenseNumber: '' })
        .then(() => setUpdating({ ...updating, agentLicenseNumber: false }))
        .catch(error => {
          console.error('Error updating user data:', error);
          setUpdating({ ...updating, agentLicenseNumber: false });
        });
    }
  };

  return {
    profileData,
    loading,
    updating,
    isUploading,
    noLicense,
    handleInputChange,
    handlePhotoUpload,
    handleCheckboxChange,
  };
};

export default useProfileLogic;
