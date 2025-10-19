import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">SureStock</span>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6">
            <Link
              to="/about"
              className="text-gray-600 hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              to="/admin/alerts"
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Admin Alerts
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-primary transition-colors flex items-center space-x-1"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} SureStock. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
