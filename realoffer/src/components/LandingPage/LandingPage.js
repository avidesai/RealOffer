import React from 'react';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      <Header />
      <main className="landing-main">
        <Hero />
        <section className='features'>
            <Features />
        </section>
        <section className="stats">
          {/* Stats content goes here */}
        </section>
        <section className="how-it-works">
          {/* 'How it works' content goes here */}
        </section>
        <section className="cta">
          {/* Call to action content goes here */}
        </section>
      </main>
      <footer className="landing-footer">
        {/* Footer content goes here */}
      </footer>
    </div>
  );
}

export default LandingPage;
