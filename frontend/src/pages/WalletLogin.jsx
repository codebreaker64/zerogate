import { AlertCircle, Building2, CheckCircle2, Loader2, Shield, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';
import { signInWithWallet } from '../utils/siwx';

const WalletLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    const handleWalletLogin = async () => {
        setLoading(true);
        setError('');
        setStatus('Connecting to Crossmark...');

        try {
            setStatus('Requesting signature...');
            const result = await signInWithWallet();

            console.log('Login result:', result);

            if (result.success) {
                if (result.needsOnboarding) {
                    setStatus('Redirecting to business onboarding...');
                    // Redirect to onboarding page
                    setTimeout(() => {
                        navigate('/onboarding');
                    }, 1000);
                } else {
                    setStatus('Login successful! Redirecting...');
                    // Redirect to dashboard
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 1000);
                }
            }
        } catch (err) {
            console.error('Wallet login error:', err);
            setError(err.message || 'Failed to authenticate with wallet');
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Three.js Animated Background */}
            <ThreeBackground />

            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/50 to-slate-900/50 z-10"></div>

            <div className="relative w-full max-w-md z-20">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-xl">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Institutional Access</h1>
                    <p className="text-slate-300">Sign in with your corporate wallet</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    {/* Wallet Login Button */}
                    <button
                        onClick={handleWalletLogin}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                {status || 'Authenticating...'}
                            </>
                        ) : (
                            <>
                                <Wallet className="w-6 h-6" />
                                Sign In with Crossmark
                            </>
                        )}
                    </button>

                    {/* Status Message */}
                    {status && !loading && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <p className="text-sm text-green-300">{status}</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Info Section */}
                    <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                                    Secure Wallet Authentication
                                </h3>
                                <p className="text-xs text-slate-400">
                                    No passwords needed. Prove ownership of your corporate wallet with a cryptographic signature.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                                    Business Profile Linking
                                </h3>
                                <p className="text-xs text-slate-400">
                                    First-time users will be guided through business verification and profile setup.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                        <p className="text-xs font-semibold text-slate-300 mb-2">
                            Requirements:
                        </p>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Crossmark Wallet Browser Extension
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Active XRPL wallet address
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Institutional credentials (for onboarding)
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="text-center mt-6 space-y-2">
                    <div className="text-xs text-slate-500">
                        Having trouble? Make sure Crossmark is installed and unlocked
                    </div>
                </div>

                {/* Admin Portal Link (Legacy) */}
                <div className="text-center mt-4">
                    <button
                        onClick={() => navigate('/admin/login')}
                        className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                        Admin Portal (Legacy Email Login)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WalletLogin;
