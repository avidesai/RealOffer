import React from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';
import Stats from './components/Stats/Stats';
import HowItWorks from './components/How-It-Works/HowItWorks';
import CallToAction from './components/CTA/CTA'
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
          <Stats />
        </section>
        <section className="how-it-works">
          <HowItWorks />
        </section>
        <section className="cta">
          <CallToAction />
        </section>
      </main>
      <footer className="landing-footer">
        <Footer />
      </footer>
    </div>
  );
}

export default LandingPage;
