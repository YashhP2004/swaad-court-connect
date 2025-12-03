import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-white/5 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-peach-500 to-transparent opacity-50" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-peach-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* About */}
          <div className="space-y-6">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              Swaad<span className="text-peach-500">Court</span>
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Your one-stop destination for delicious food from multiple restaurants.
              Order, eat, and enjoy the convenience of food court dining.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-peach-500 rounded-full"></span>
              Quick Links
            </h3>
            <ul className="space-y-4">
              <li>
                <Link to="/restaurants" className="text-gray-400 hover:text-peach-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-peach-500/50 rounded-full group-hover:bg-peach-500 transition-colors" />
                  All Restaurants
                </Link>
              </li>
              <li>
                <Link to="/trending" className="text-gray-400 hover:text-peach-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-peach-500/50 rounded-full group-hover:bg-peach-500 transition-colors" />
                  Trending Items
                </Link>
              </li>
              <li>
                <Link to="/offers" className="text-gray-400 hover:text-peach-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-peach-500/50 rounded-full group-hover:bg-peach-500 transition-colors" />
                  Special Offers
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-peach-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-peach-500/50 rounded-full group-hover:bg-peach-500 transition-colors" />
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-peach-500 rounded-full"></span>
              Contact Us
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 group">
                <div className="p-2 bg-navy-900 rounded-lg group-hover:bg-peach-500/10 transition-colors mt-1">
                  <Phone className="h-4 w-4 text-peach-500" />
                </div>
                <span className="group-hover:text-white transition-colors">+91 123 456 7890</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 group">
                <div className="p-2 bg-navy-900 rounded-lg group-hover:bg-peach-500/10 transition-colors mt-1">
                  <Mail className="h-4 w-4 text-peach-500" />
                </div>
                <span className="group-hover:text-white transition-colors">support@swaadcourt.com</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 group">
                <div className="p-2 bg-navy-900 rounded-lg group-hover:bg-peach-500/10 transition-colors mt-1">
                  <MapPin className="h-4 w-4 text-peach-500" />
                </div>
                <span className="group-hover:text-white transition-colors">Phoenix Mall, Level 2, Food Court</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-peach-500 rounded-full"></span>
              Follow Us
            </h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-3 bg-navy-900 rounded-lg text-gray-400 hover:bg-peach-500 hover:text-white transition-all hover:-translate-y-1 shadow-lg hover:shadow-peach-500/20"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="p-3 bg-navy-900 rounded-lg text-gray-400 hover:bg-peach-500 hover:text-white transition-all hover:-translate-y-1 shadow-lg hover:shadow-peach-500/20"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="p-3 bg-navy-900 rounded-lg text-gray-400 hover:bg-peach-500 hover:text-white transition-all hover:-translate-y-1 shadow-lg hover:shadow-peach-500/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} <span className="text-white font-bold">SwaadCourt</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}