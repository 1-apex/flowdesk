"use client";
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

const NavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const toggleUserMenu = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <h1 className="text-xl font-light tracking-wide text-gray-300 cursor-pointer">
                            flowdesk
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-8">
                            <a 
                                href="#community" 
                                className="text-gray-400 hover:text-gray-200 px-3 py-2 text-sm font-medium relative group transition-colors duration-200"
                            >
                                Community
                                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            </a>
                        </div>
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-gray-200 px-4 py-2 text-sm font-medium transition-colors duration-200">
                            Login
                        </button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium transition-colors duration-200">
                            Sign Up
                        </button>
                        
                        {/* User Menu (when logged in) */}
                        <div className="relative">
                            <button 
                                onClick={toggleUserMenu}
                                className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors duration-200"
                            >
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">U</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg border border-gray-600 py-1">
                                    <a href="#profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
                                        Profile
                                    </a>
                                    <a href="#settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
                                        Settings
                                    </a>
                                    <hr className="border-gray-600 my-1" />
                                    <button className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-200">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={toggleMenu}
                            className="text-gray-400 hover:text-gray-200 inline-flex items-center justify-center p-2 transition-colors duration-200"
                        >
                            {isOpen ? (
                                <X className="block h-6 w-6" />
                            ) : (
                                <Menu className="block h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <div className={`md:hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 border-t border-gray-700">
                    <a
                        href="#community"
                        className="text-gray-400 hover:text-gray-200 block px-3 py-2 text-base font-medium transition-colors duration-200"
                    >
                        Community
                    </a>
                    
                    <div className="pt-4 pb-3 border-t border-gray-700">
                        <div className="flex items-center px-3 mb-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">U</span>
                            </div>
                            <div className="ml-3">
                                <div className="text-base font-medium text-white">User Name</div>
                                <div className="text-sm font-medium text-gray-400">user@example.com</div>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <button className="text-gray-400 hover:text-gray-200 block w-full text-left px-3 py-2 text-base font-medium transition-colors duration-200">
                                Login
                            </button>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white block w-full text-left px-3 py-2 rounded text-base font-medium transition-colors duration-200">
                                Sign Up
                            </button>
                            <button className="text-red-400 hover:text-red-300 block w-full text-left px-3 py-2 text-base font-medium transition-colors duration-200">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;