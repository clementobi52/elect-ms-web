'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  MapPin, 
  AlertCircle, 
  Upload, 
  BarChart3, 
  CheckCircle2,
  Shield,
  Users,
  Clock,
  Award,
  ChevronRight,
  Star,
  ShieldCheck,
  Phone,
  Mail,
  Map,
  Eye,
  FileCheck,
  Zap,
  Globe,
  Lock,
  Database,
  Server,
  Cloud
} from 'lucide-react';

export default function Page() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: MapPin,
      title: 'Real-time Location Tracking',
      description: 'GPS-based geolocation validation ensures agents are at the correct polling units.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Upload,
      title: 'Secure File Uploads',
      description: 'Upload election results in PDF or image format with automatic sync capabilities.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: AlertCircle,
      title: 'Incident Reporting',
      description: 'Report incidents and fraud alerts with location data and multimedia attachments.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Live monitoring dashboards for admins and situation room operators.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: CheckCircle2,
      title: 'Offline Support',
      description: 'Complete offline functionality with automatic sync when network is restored.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: Shield,
      title: 'Role-based Access',
      description: 'Granular permission system for agents, ward admins, zone admins, and system admins.',
      color: 'from-red-500 to-red-600',
    },
  ];

  const stats = [
    { label: 'Real-time Monitoring', value: '24/7', icon: Clock },
    { label: 'Polling Units', value: '119,302', icon: Map },
    { label: 'Data Accuracy', value: '99.9%', icon: ShieldCheck },
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Adebayo',
      role: 'National Election Commissioner',
      quote: 'This system has revolutionized how we monitor elections. The real-time data and geolocation features are game-changing.',
      avatar: 'SA',
    },
    {
      name: 'Chief Emeka Okafor',
      role: 'Zone Admin, Lagos',
      quote: 'The offline capability is incredible. Our agents can work in remote areas without internet and sync when they get back online.',
      avatar: 'EO',
    },
    {
      name: 'Ms. Chioma Nwachukwu',
      role: 'Ward Admin, Abuja',
      quote: 'The incident reporting feature has helped us respond to issues in real-time. Election integrity has improved significantly.',
      avatar: 'CN',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* ✅ YOUR LOGO HERE */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="ElectionMonitor Logo"
                  width={48}
                  height={48}
                  className="object-contain rounded-lg"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900 tracking-tight">Elect Ms</span>
                <span className="text-[10px] text-gray-500 tracking-wider uppercase">Election Integrity Platform</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Enhanced */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6 border border-blue-100">
                <Zap size={16} className="text-blue-500" />
                <span>Next Generation Election Monitoring</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                Transparent{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Election
                </span>{' '}
                Monitoring
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-lg">
                Secure, real-time election monitoring system with geolocation validation, 
                offline support, and comprehensive reporting for election integrity.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-xl shadow-blue-600/30 flex items-center gap-2 group"
                >
                  Access Dashboard
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold flex items-center gap-2">
                  <Play size={20} />
                  Watch Demo
                </button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex items-center gap-8 mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">ISO Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">10K+ Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">4.9/5 Rating</span>
                </div>
              </div>
            </div>
            
            {/* Hero Image/Graphic */}
            <div className="relative">
              <div className="relative h-[500px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-8 left-8 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live Monitoring</span>
                  </div>
                </div>
                
                <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium">1,247 Active Agents</span>
                  </div>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                    <MapPin size={40} className="text-white" />
                  </div>
                  <p className="text-xl font-semibold">Live Election Monitoring</p>
                  <p className="text-sm opacity-80">Real-time data across all polling units</p>
                </div>
                
                {/* Decorative Dots */}
                <div className="absolute top-1/4 right-8 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-1/4 left-8 w-2 h-2 bg-green-400 rounded-full animate-pulse delay-500"></div>
              </div>
              
              {/* Stats Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">99.9%</p>
                    <p className="text-xs text-gray-500">Uptime Guarantee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-all">
                  <div className="w-12 h-12 mx-auto mb-4 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4 border border-blue-100">
              <Star size={16} className="text-blue-500" />
              <span>Premium Features</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Election Integrity
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive features designed to ensure transparent and fair elections
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="group relative p-8 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}></div>
                  
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  
                  <div className="mt-4 flex items-center text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Learn more</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Trusted by election officials across the nation</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full filter blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* ✅ LOGO IN CTA SECTION */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <Image
                src="/images/logo.png"
                alt="ElectionMonitor Logo"
                width={64}
                height={64}
                className="object-contain rounded-xl bg-white/10 p-2"
              />
            </div>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Monitor Elections?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of election observers and administrators in ensuring transparent and fair elections.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all font-semibold shadow-2xl flex items-center gap-2 group"
            >
              <span>Get Started Now</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/30 flex items-center gap-2">
              <Phone size={20} />
              Contact Sales
            </button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm opacity-80">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              Free 14-day trial
            </span>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {/* ✅ LOGO IN FOOTER */}
                <div className="relative w-8 h-8">
                  <Image
                    src="/images/logo.png"
                    alt="ElectionMonitor Logo"
                    width={32}
                    height={32}
                    className="object-contain rounded"
                  />
                </div>
                <span className="text-white font-bold">ElectionMonitor</span>
              </div>
              <p className="text-sm">Ensuring electoral transparency and integrity across the nation.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition">API</Link></li>
                <li><Link href="#" className="hover:text-white transition">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2026 ElectionMonitor. All rights reserved.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link href="#" className="text-sm hover:text-white transition">Privacy Policy</Link>
              <Link href="#" className="text-sm hover:text-white transition">Terms of Service</Link>
              <Link href="#" className="text-sm hover:text-white transition">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Play icon component
const Play = ({ size = 20, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);