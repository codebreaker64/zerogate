import { Loader2, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithConsumerWallet } from '../utils/siwx';

const ConsumerLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleConnect = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithConsumerWallet();
            const user = result.user;

            if (user?.kyc_status === 'approved') {
                navigate('/investor/dashboard');
            } else {
                navigate('/investor/kyc');
            }
        } catch (e) {
            setError(e.message || 'Failed to connect wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
            <div className="max-w-lg w-full bg-slate-800/70 border border-slate-700 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">Investor Access</p>
                        <h1 className="text-2xl font-bold">Sign in to purchase RWAs</h1>
                    </div>
                </div>

                <p className="text-slate-400 text-sm mb-8">
                    Connect your XRPL wallet to start the KYC process and unlock token purchases. Your data stays on Supabase and is never shared without consent.
                </p>

                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-semibold transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Connect wallet
                </button>

                <button
                    onClick={() => navigate('/user/register')}
                    disabled={loading}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-emerald-500/40 bg-slate-900 hover:border-emerald-400 disabled:opacity-60 font-semibold transition-colors text-emerald-300"
                >
                    <Sparkles className="w-4 h-4" />
                    Get a testnet demo wallet
                </button>
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
            </div>
        </div>
    );
};

export default ConsumerLogin;
