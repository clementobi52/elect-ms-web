'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, AlertCircle, Upload, BarChart3, CheckCircle2 } from 'lucide-react';

export default function Page() {
  const features = [
    {
      icon: MapPin,
      title: 'Real-time Location Tracking',
      description: 'GPS-based geolocation validation ensures agents are at the correct polling units.',
    },
    {
      icon: Upload,
      title: 'Secure File Uploads',
      description: 'Upload election results in PDF or image format with automatic sync capabilities.',
    },
    {
      icon: AlertCircle,
      title: 'Incident Reporting',
      description: 'Report incidents and fraud alerts with location data and multimedia attachments.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Live monitoring dashboards for admins and situation room operators.',
    },
    {
      icon: CheckCircle2,
      title: 'Offline Support',
      description: 'Complete offline functionality with automatic sync when network is restored.',
    },
    {
      icon: AlertCircle,
      title: 'Role-based Access',
      description: 'Granular permission system for agents, ward admins, zone admins, and system admins.',
    },
  ];

  const stats = [
    { label: 'Real-time Monitoring', value: '24/7' },
    { label: 'Polling Units', value: '∞' },
    { label: 'Data Accuracy', value: '99.9%' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                E
              </div>
              <span className="text-xl font-bold text-gray-900">ElectionMonitor</span>
            </div>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Transparent Election Monitoring
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Secure, real-time election monitoring system with geolocation validation, offline support, and comprehensive reporting for election integrity.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/login"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  Access Dashboard <ArrowRight size={20} />
                </Link>
                <button className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-medium">
                  Learn More
                </button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative h-96 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <MapPin size={64} className="mx-auto mb-4 opacity-80" />
                    <p className="text-lg font-semibold">Live Election Monitoring</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need for transparent election monitoring</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="p-8 border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Monitor Elections?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join election observers and administrators in ensuring transparent and fair elections.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            Sign In Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center">© 2025 ElectionMonitor. Ensuring electoral transparency and integrity.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
