import { Loader2, Shield, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fundWallet } from '../utils/xrpl';
import { upsertConsumerProfile } from '../utils/supabase';

const UserRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleDemo = async () => {
        setLoading(true);
        setError('');
        setStatus('Creating funded testnet wallet...');

        try {
            const wallet = await fundWallet();
            const walletAddress = wallet.address;
            localStorage.setItem('zerogate_wallet_address', walletAddress);

            setStatus('Setting up your demo profile...');
            await upsertConsumerProfile(walletAddress);

            setStatus('Redirecting to KYC...');
            navigate('/investor/kyc');
        } catch (err) {
            console.error('Demo user creation failed:', err);
            setError(err.message || 'Failed to create demo user');
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg bg-slate-800/70 border border-slate-700 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">Testnet Demo</p>
                        <h1 className="text-2xl font-bold">Create a demo user</h1>
                    </div>
                </div>

                <p className="text-slate-400 text-sm mb-6">
                    We will fund a testnet wallet, create a demo user profile, and send you to the investor KYC flow. No email required.
                </p>

                <button
                    onClick={handleDemo}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 font-semibold transition-colors"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                    {loading ? status || 'Working...' : 'Create demo wallet & continue'}
                </button>

                {status && !loading && (
                    <div className="mt-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>{status}</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserRegistration;
