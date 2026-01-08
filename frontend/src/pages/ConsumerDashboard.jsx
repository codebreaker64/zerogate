import { CheckCircle, LogOut, Shield, ShieldAlert, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Marketplace from './Marketplace';
import { getCurrentWalletUser, signOutWallet } from '../utils/siwx';

const ConsumerDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    useEffect(() => {
        const load = async () => {
            if (!walletAddress) {
                navigate('/investor/login');
                return;
            }
            const profile = await getCurrentWalletUser();
            setUser(profile);
            setLoading(false);
        };
        load();
    }, [navigate, walletAddress]);

    const kycStatus = user?.kyc_status || 'not_started';
    const readableStatus = kycStatus.replace(/_/g, ' ');
    const isApproved = kycStatus === 'approved';

    const handleSignOut = async () => {
        await signOutWallet();
        navigate('/investor/login');
    };

    if (loading) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg">Investor Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700">
                            <Wallet className="w-3 h-3" />
                            <span className="font-mono text-xs text-blue-300">
                                {walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress.length - 6)}
                            </span>
                        </div>
                        <button onClick={handleSignOut} className="text-slate-400 hover:text-white transition-colors" title="Disconnect Wallet">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">KYC Status</p>
                        <h2 className="text-xl font-bold">{readableStatus}</h2>
                        {!isApproved && (
                            <p className="text-slate-400 text-sm mt-1">Complete KYC to unlock purchases.</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {isApproved ? (
                            <div className="px-3 py-2 rounded-full bg-green-500/10 text-green-300 border border-green-500/40 text-sm font-semibold flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Approved
                            </div>
                        ) : (
                            <div className="px-3 py-2 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/40 text-sm font-semibold flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                {readableStatus}
                            </div>
                        )}
                        {!isApproved && (
                            <button
                                onClick={() => navigate('/investor/kyc')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white"
                            >
                                Update KYC
                            </button>
                        )}
                    </div>
                </div>

                <Marketplace walletAddress={walletAddress} isEmbedded={true} mode="consumer" profile={user} />
            </main>
        </div>
    );
};

export default ConsumerDashboard;
