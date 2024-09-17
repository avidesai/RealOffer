// Signup.js

import React from 'react';
import Header from '../../components/Header/Header';
import SignupForm from './SignupForm';
import Footer from '../../components/Footer/Footer';
import './Signup.css';

function Signup() {
  return (
    <div className="signup-page-container">
      <Header />
      <main className="signup-content-wrapper">
        <SignupForm />
      </main>
      <Footer />
    </div>
  );
}

export default Signup;
