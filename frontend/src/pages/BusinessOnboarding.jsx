import { AlertCircle, Building2, CheckCircle2, FileText, Loader2, Mail, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';
import { completeBusinessOnboarding, getCurrentWalletUser } from '../utils/siwx';

const BusinessOnboarding = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        company_uen: '',
        corporate_email: '',
        industry: '',
        country: 'Singapore'
    });
    const navigate = useNavigate();

    useEffect(() => {
        // Get wallet address from localStorage
        const address = localStorage.getItem('zerogate_wallet_address');
        if (!address) {
            navigate('/login');
            return;
        }
        setWalletAddress(address);

        // Check if user already completed onboarding
        getCurrentWalletUser().then(user => {
            if (user && user.status === 'active') {
                navigate('/marketplace');
            }
        });
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await completeBusinessOnboarding(formData);

            // Success - redirect to protected marketplace (shows status)
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Three.js Animated Background */}
            <ThreeBackground />

            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/50 to-slate-900/50 z-10"></div>

            <div className="relative w-full max-w-2xl z-20">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-xl">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Business Profile Setup</h1>
                    <p className="text-slate-300">Complete your institutional profile to access the platform</p>

                    {/* Wallet Info */}
                    {walletAddress && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg">
                            <Wallet className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-slate-300 font-mono">
                                {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </div>
                    )}
                </div>

                {/* Onboarding Form */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Company Name *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Acme Capital Pte Ltd"
                                />
                            </div>
                        </div>

                        {/* UEN */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Unique Entity Number (UEN) *
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="company_uen"
                                    value={formData.company_uen}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="202012345A"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                Singapore business registration number
                            </p>
                        </div>

                        {/* Corporate Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Corporate Email *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    name="corporate_email"
                                    value={formData.corporate_email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="director@acmecapital.com"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                Used for compliance notifications and reports
                            </p>
                        </div>

                        {/* Industry */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Industry *
                            </label>
                            <select
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                            >
                                <option value="">Select industry...</option>
                                <option value="venture_capital">Venture Capital</option>
                                <option value="private_equity">Private Equity</option>
                                <option value="family_office">Family Office</option>
                                <option value="hedge_fund">Hedge Fund</option>
                                <option value="asset_management">Asset Management</option>
                                <option value="real_estate">Real Estate Investment</option>
                                <option value="other">Other Financial Services</option>
                            </select>
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Country of Incorporation *
                            </label>
                            <select
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                            >
                                <option value="Singapore">Singapore</option>
                                <option value="Hong Kong">Hong Kong</option>
                                <option value="United States">United States</option>
                                <option value="United Kingdom">United Kingdom</option>
                                <option value="Cayman Islands">Cayman Islands</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Completing Setup...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Complete Onboarding
                                </>
                            )}
                        </button>
                    </form>

                    {/* Info */}
                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <p className="text-xs text-slate-400 text-center">
                            Your information will be used for KYB verification and compliance purposes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessOnboarding;
