// Login.js

import React from 'react';
import Header from '../../components/Header/Header';
import LoginForm from './LoginForm';
import Footer from '../../components/Footer/Footer';
import './Login.css';

function Login() {
  return (
    <div className="login-page-container">
      <Header />
      <div className="login-content-wrapper">
        <LoginForm />
      </div>
      <Footer />
    </div>
  );
}

export default Login;
