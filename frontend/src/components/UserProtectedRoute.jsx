import { Loader2, ShieldAlert } from 'lucide-react';
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

    // Require KYC submission
    if (!user.kyc_status || user.kyc_status === 'not_started') {
        return <Navigate to="/user/kyc" replace />;
    }

    if (user.kyc_status === 'pending' || user.kyc_status === 'under_review') {
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

    if (user.kyc_status === 'rejected') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">KYC Rejected</h1>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                    Your KYC was rejected. Please review your information and resubmit.
                </p>
                <button
                    onClick={() => navigate('/user/kyc')}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
                >
                    Resubmit KYC
                </button>
            </div>
        );
    }

    return children;
};

export default UserProtectedRoute;
