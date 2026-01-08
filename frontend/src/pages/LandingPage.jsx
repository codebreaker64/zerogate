import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Wallet, Building2, ArrowRight, Zap, Lock, Globe } from 'lucide-react';
import ThreeBackground from '../components/ThreeBackground';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
            {/* Three.js Animated Background */}
            <Suspense fallback={null}>
                <ThreeBackground />
            </Suspense>

            {/* Overlay gradient for depth */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900/60 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
                <div className="max-w-6xl w-full text-center space-y-16">
                    {/* Hero Section */}
                    <div className="space-y-6 animate-fade-in">
                        <div className="inline-block mb-4">
                            <div className="px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-sm">
                                <p className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Powered by XRPL & Native DIDs
                                </p>
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black tracking-tight">
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
                                ZeroGate
                            </span>
                        </h1>

                        <p className="text-2xl md:text-3xl font-light text-slate-300 max-w-3xl mx-auto leading-relaxed">
                            Compliant-But-Private
                            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300 font-semibold">
                                Real World Asset Minting
                            </span>
                        </p>

                        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Experience the future of tokenized assets with privacy-preserving credentials
                            and seamless compliance verification on XRPL.
                        </p>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-16">
                        {/* Investor Card */}
                        <button
                            onClick={() => navigate('/marketplace')}
                            className="group relative p-8 rounded-3xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 text-left hover:scale-[1.02] transform"
                        >
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />

                            {/* Glow effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-20 blur transition duration-500" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Wallet className="w-8 h-8 text-blue-400" />
                                </div>

                                <h2 className="text-3xl font-bold mb-3 group-hover:text-blue-300 transition-colors">
                                    I am an Investor
                                </h2>

                                <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                                    Connect your wallet, verify credentials, and gain access to exclusive
                                    tokenized real-world assets.
                                </p>

                                <div className="flex items-center gap-2 text-blue-400 font-semibold group-hover:gap-4 transition-all">
                                    <span>Access Marketplace</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>

                                {/* Features */}
                                <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Lock className="w-4 h-4 text-blue-400" />
                                        <span>Privacy-preserving verification</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                                        <span>Compliant credential system</span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Business Issuer Card */}
                        <button
                            onClick={() => navigate('/login')}
                            className="group relative p-8 rounded-3xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 text-left hover:scale-[1.02] transform"
                        >
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />

                            {/* Glow effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl opacity-0 group-hover:opacity-20 blur transition duration-500" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Building2 className="w-8 h-8 text-purple-400" />
                                </div>

                                <h2 className="text-3xl font-bold mb-3 group-hover:text-purple-300 transition-colors">
                                    Business Issuer
                                </h2>

                                <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                                    Tokenize assets, manage institutional onboarding, and route deals to compliant investors.
                                </p>

                                <div className="flex items-center gap-2 text-purple-400 font-semibold group-hover:gap-4 transition-all">
                                    <span>Institutional Portal</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>

                                {/* Features */}
                                <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Globe className="w-4 h-4 text-purple-400" />
                                        <span>On-chain asset minting</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                                        <span>Automated KYB compliance</span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Consumer / Buyer Card */}
                        <button
                            onClick={() => navigate('/investor/login')}
                            className="group relative p-8 rounded-3xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 text-left hover:scale-[1.02] transform"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur transition duration-500" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                </div>

                                <h2 className="text-3xl font-bold mb-3 group-hover:text-emerald-300 transition-colors">
                                    Verified Buyer
                                </h2>

                                <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                                    Complete KYC once, then purchase vetted RWAs with credential-backed access controls.
                                </p>

                                <div className="flex items-center gap-2 text-emerald-400 font-semibold group-hover:gap-4 transition-all">
                                    <span>Enter Investor Flow</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Lock className="w-4 h-4 text-emerald-400" />
                                        <span>Single KYC, multi-asset access</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        <span>Wallet-based verification</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Footer Badge */}
                    <div className="pt-8">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/40 backdrop-blur-xl border border-slate-700/50">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            <span className="text-slate-300 font-medium">Secured by XRPL Ledger Technology</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
