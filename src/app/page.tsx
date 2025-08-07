"use client";

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth'; // Firebase Auth imports
import { app } from '@/lib/firebase'; // Import the initialized Firebase app

// SplitText Component (unchanged)
interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  from?: { opacity?: number; y?: number; scale?: number };
  to?: { opacity?: number; y?: number; scale?: number };
}

const SplitText = ({ 
  text = '', 
  className = "", 
  delay = 0, 
  duration = 0.8, 
  ease = "power3.out",
  from = { opacity: 0, y: 50 },
  to = { opacity: 1, y: 0 }
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
        }
      },
      { threshold: 0.1, rootMargin: '-100px' }
    );

    if (textRef.current) {
      observer.observe(textRef.current);
    }

    return () => observer.disconnect();
  }, [isInView]);

  useEffect(() => {
    if (isInView && textRef.current) {
      const chars = textRef.current.querySelectorAll('.split-char');
      
      gsap.set(chars, from);
      
      gsap.to(chars, {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        delay: 0.2
      });
    }
  }, [isInView, delay, duration, ease, from, to]);

  const renderChars = () => {
    return text.split('').map((char: string, index: number) => (
      <span
        key={index}
        className="split-char inline-block"
        style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div ref={textRef} className={className}>
      {renderChars()}
    </div>
  );
};

// Google Icon Component (unchanged)
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Main Landing Page Component
export default function SeraLandingPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter(); // Initialize Next.js router
  const auth = getAuth(app); // Initialize Firebase Auth
  const provider = new GoogleAuthProvider(); // Google Auth Provider

  useEffect(() => {
    setMounted(true);

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to /chat
        router.push('/chat');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth, router]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
      // No need to redirect here; onAuthStateChanged will handle it
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6">
        
        {/* Main heading */}
        <SplitText
          text="Hey Sera"
          className="text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tight"
          delay={50}
          duration={1.2}
          ease="power4.out"
          from={{ opacity: 0, y: 100 }}
          to={{ opacity: 1, y: 0 }}
        />

        {/* Subtitle */}
        <SplitText
          text="Your AI assistant that reads policy documents and answers your questions with precision"
          className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl leading-relaxed font-light"
          delay={30}
          duration={0.8}
          ease="power3.out"
          from={{ opacity: 0, y: 30 }}
          to={{ opacity: 1, y: 0 }}
        />

        {/* CTA Button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '1.5s', animationFillMode: 'both' }}>
          <button
            onClick={handleGoogleSignIn} // Add click handler for Google Sign-In
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold text-lg rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
          </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="text-center opacity-80">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Policy Analysis</h3>
            <p className="text-gray-400 text-sm">Instant understanding of complex policy documents</p>
          </div>
          
          <div className="text-center opacity-80">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Q&A</h3>
            <p className="text-gray-400 text-sm">Get precise answers to your policy questions</p>
          </div>
          
          <div className="text-center opacity-80">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400 text-sm">Instant responses powered by advanced AI</p>
          </div>
        </div>

        {/* Footer text */}
        <div className="mt-16 text-gray-600 text-sm">
          <p>Streamline your policy research with AI-powered insights</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}