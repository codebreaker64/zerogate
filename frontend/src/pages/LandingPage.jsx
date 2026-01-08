import { ArrowRight, Building2, ShieldCheck, Wallet } from 'lucide-react';
import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
            {/* Three.js Animated Background - Keeping it subtle if needed, or removing if pure black is desired. 
                User asked for "background to be black color". I'll keep the 3D background but make it blend better with black. */}
            <div className="opacity-50">
                <Suspense fallback={null}>
                    <ThreeBackground />
                </Suspense>
            </div>

            {/* Overlay to ensure black theme dominance */}
            <div className="fixed inset-0 bg-black/40 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
                <div className="max-w-6xl w-full text-center space-y-12">

                    {/* Hero Title */}
                    <div className="space-y-4 animate-fade-in-down">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white">
                            ZeroGate
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 font-light tracking-wide">
                            The Bridge to Real World Assets
                        </p>
                    </div>

                    {/* Feature Cards Grid (2 Columns) */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12 px-4">

                        {/* BUSINESS CARD */}
                        <button
                            onClick={() => navigate('/login')} // /login routes to WalletLogin aka Institutional/Business
                            className="group relative p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:border-zinc-600 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 text-left hover:-translate-y-1"
                        >
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Building2 className="w-7 h-7 text-white" />
                                </div>

                                <h2 className="text-3xl font-bold mb-3 text-white">
                                    Business
                                </h2>

                                <p className="text-zinc-400 text-lg mb-8 leading-relaxed flex-grow">
                                    Issue tokenized assets, manage compliance, and onboard institutions.
                                </p>

                                <div className="flex items-center gap-2 text-white font-medium group-hover:gap-4 transition-all mt-auto">
                                    <span>Business Portal</span>
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                        </button>

                        {/* USER CARD */}
                        <button
                            onClick={() => navigate('/user/login')} // /user/login routes to UserLogin
                            className="group relative p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:border-zinc-600 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 text-left hover:-translate-y-1"
                        >
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Wallet className="w-7 h-7 text-white" />
                                </div>

                                <h2 className="text-3xl font-bold mb-3 text-white">
                                    User
                                </h2>

                                <p className="text-zinc-400 text-lg mb-8 leading-relaxed flex-grow">
                                    Verify your identity, connect wallet, and access exclusive real-world assets.
                                </p>

                                <div className="flex items-center gap-2 text-white font-medium group-hover:gap-4 transition-all mt-auto">
                                    <span>User Portal</span>
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                        </button>

                    </div>

                    {/* Footer & Admin Link */}
                    <div className="pt-12 flex flex-col items-center gap-6">
                        <div className="inline-flex items-center gap-2 text-zinc-500 text-sm">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Secured by XRPL & Self-Sovereign Identity</span>
                        </div>

                        <button
                            onClick={() => navigate('/admin/login')}
                            className="text-zinc-800 hover:text-zinc-600 text-xs font-medium transition-colors"
                        >
                            Admin Access
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LandingPage;
