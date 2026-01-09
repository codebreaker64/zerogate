import { Loader2, Shield, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';
import { signInWithUserWallet } from '../utils/siwx';
import { supabase } from '../utils/supabase';
import { fundWallet } from '../utils/xrpl';

const UserLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    const handleConnect = async () => {
        setLoading(true);
        setError('');
        setStatus('Connecting wallet...');
        try {
            const result = await signInWithUserWallet();
            const user = result.user;

            // Check if user is already verified (status === 'active')
            if (user?.status === 'active') {
                setStatus('Login successful! Redirecting...');
                navigate('/user/dashboard');
            } else {
                setStatus('Redirecting to KYC...');
                navigate('/user/kyc');
            }
        } catch (e) {
            console.error('Wallet login error:', e);
            setError(e.message || 'Failed to connect wallet');
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    const handleTestnetDemo = async () => {
        setLoading(true);
        setError('');
        setStatus('Creating demo wallet...');

        try {
            const wallet = await fundWallet();
            const walletAddress = wallet.address;

            // Persist locally for session continuity
            localStorage.setItem('zerogate_wallet_address', walletAddress);

            setStatus('Provisioning user profile...');
            // Upsert consumer entity (keeping account_type='consumer' in DB for now as schema relies on it, 
            // but UI shows "User". Or should I change DB enum? Schema change is expensive. 
            // I'll keep DB internal value 'consumer' but refer to it as User in code/UI)
            // Check if entity exists first
            let { data: entity } = await supabase
                .from('entities')
                .select('*')
                .eq('wallet_address', walletAddress)
                .maybeSingle();

            // Only create if doesn't exist
            if (!entity) {
                const { data: newEntity } = await supabase
                    .from('entities')
                    .insert({
                        wallet_address: walletAddress,
                        account_type: 'consumer',
                        status: 'pending_onboarding'
                    })
                    .select()
                    .single();
                entity = newEntity;
            }

            // Redirect based on whether user has a credential (approved)
            if (entity?.credential_id) {
                setStatus('Welcome back! Redirecting to dashboard...');
                navigate('/user/dashboard');
                console.log('Entity:', entity);
            } else {
                setStatus('Redirecting to KYC...');
                navigate('/user/kyc');
            }
        } catch (err) {
            console.error('Testnet login error:', err);
            setError(err.message || 'Failed to create demo wallet');
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Three.js Animated Background */}
            <div className="absolute inset-0 opacity-50">
                <Suspense fallback={null}>
                    <ThreeBackground />
                </Suspense>
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/80 to-slate-900/90 z-0" />

            <div className="max-w-lg w-full bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative z-10 transition-all">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold">User Access</p>
                        <h1 className="text-2xl font-bold">Sign in to ZeroGate</h1>
                    </div>
                </div>

                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                    Connect your XRPL wallet to verify your identity and access exclusive tokenized assets. Your data stays private and secure.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-semibold transition-colors text-white shadow-lg shadow-blue-500/20"
                    >
                        {loading && !status.includes('demo') ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                        {loading && !status.includes('demo') ? status || 'Connecting...' : 'Connect wallet'}
                    </button>

                    <button
                        onClick={handleTestnetDemo}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-emerald-500/40 bg-slate-900/50 hover:border-emerald-400 disabled:opacity-60 font-semibold transition-colors text-emerald-300 hover:bg-emerald-500/10"
                    >
                        {loading && status.includes('demo') ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading && status.includes('demo') ? 'Creating...' : 'Get a testnet demo wallet'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserLogin;
