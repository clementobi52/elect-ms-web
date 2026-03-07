'use client';

import React from 'react';
import Image from 'next/image';

export default function Page() {
  const screens = [
    {
      title: 'Login Screen',
      description: 'Agent authentication with email and password',
      image: '/screens/login-screen.jpg',
    },
    {
      title: 'Dashboard Screen',
      description: 'Main dashboard with polling unit info and location tracking',
      image: '/screens/dashboard-screen.jpg',
    },
    {
      title: 'Results Upload Screen',
      description: 'Upload election results with sync status tracking',
      image: '/screens/results-upload-screen.jpg',
    },
    {
      title: 'Incident Reports Screen',
      description: 'List of incident reports categorized by type',
      image: '/screens/incident-reports-screen.jpg',
    },
    {
      title: 'Fraud Alerts Screen',
      description: 'Fraud and suspicious activity alerts',
      image: '/screens/fraud-alerts-screen.jpg',
    },
    {
      title: 'Reports Navigation Screen',
      description: 'Tab-based navigation between reports and alerts',
      image: '/screens/reports-screen.jpg',
    },
    {
      title: 'Bottom Tab Navigation',
      description: '5-tab navigation bar for main app sections',
      image: '/screens/bottom-tab-navigation.jpg',
    },
    {
      title: 'Polling Unit Card',
      description: 'Reusable card component for polling unit information',
      image: '/screens/polling-unit-card.jpg',
    },
    {
      title: 'Location Tracker Card',
      description: 'Real-time location tracking with distance metrics',
      image: '/screens/location-tracker-card.jpg',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '36px', fontWeight: 'bold' }}>
          Election Monitoring App
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '50px', color: '#666', fontSize: '16px' }}>
          Mobile App UI Screens & Components Gallery
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '30px',
          }}
        >
          {screens.map((screen, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: '#e0e0e0' }}>
                <Image
                  src={screen.image}
                  alt={screen.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority={index < 3}
                />
              </div>
              <div style={{ padding: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {screen.title}
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  {screen.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '60px', padding: '30px', backgroundColor: '#fff', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            Project Overview
          </h2>
          <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '15px' }}>
            This election monitoring app is designed to help polling agents track their location, upload election
            results, and report incidents in real-time. The mobile app uses Expo/React Native for cross-platform
            compatibility, while the web dashboard uses Next.js for admin and situation room monitoring.
          </p>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Key Features
          </h3>
          <ul style={{ color: '#555', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Real-time geolocation tracking with polling unit validation</li>
            <li>Offline data storage and sync capabilities</li>
            <li>Election results upload with image/PDF support</li>
            <li>Incident and fraud alert reporting</li>
            <li>Live location tracking with distance metrics</li>
            <li>Modern, user-friendly mobile interface</li>
            <li>Responsive bottom tab navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
