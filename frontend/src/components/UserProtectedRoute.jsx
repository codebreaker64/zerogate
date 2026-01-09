import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getCurrentWalletUser } from '../utils/siwx';

const UserProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                const profile = await getCurrentWalletUser();
                setUser(profile);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    const walletAddress = localStorage.getItem('zerogate_wallet_address');
    if (!walletAddress) {
        return <Navigate to="/user/login" replace />;
    }

    if (!user || user.account_type !== 'consumer') {
        return <Navigate to="/user/login" replace />;
    }

    // Show pending screen if KYC is submitted but not approved
    if (user.status === 'pending_kyc') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">KYC Under Review</h1>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                    Your KYC submission has been received. You will be notified once it is approved.
                </p>
                <button
                    onClick={() => navigate('/user/kyc')}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
                >
                    View submission
                </button>
            </div>
        );
    }

    // Check if user has been verified (has credential or active status)
    const isVerified = user.credential_id || user.status === 'active';

    if (!isVerified) {
        // Not verified yet - redirect to KYC
        return <Navigate to="/user/kyc" replace />;
    }

    return children;
};

export default UserProtectedRoute;
