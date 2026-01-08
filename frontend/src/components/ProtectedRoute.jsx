import { Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getCurrentWalletUser } from '../utils/siwx';

const ProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(null); // 'approved', 'pending', 'rejected', 'new'
    const navigate = useNavigate();

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const walletAddress = localStorage.getItem('zerogate_wallet_address');

            if (!walletAddress) {
                setLoading(false);
                return; // User will be redirected to login
            }

            // Get user status from backend
            const userData = await getCurrentWalletUser();

            if (!userData) {
                setStatus('new');
            } else {
                setUser(userData);

                if (userData.account_type === 'consumer') {
                    navigate('/investor/dashboard');
                    return;
                }

                // Determine access status
                // Status mapping:
                // 'pending_onboarding' -> Needs to complete form
                // 'active' -> Onboarding done, waiting for KYB approval
                // 'approved' -> KYB Approved + Credential Issued (We check if they have access)

                // For now, let's assume 'active' in entities table means they submitted the form
                // But we need to check KYB status strictly as requested

                // If the entity status is 'active', it means they finished onboarding.
                // But we need to enforce KYB approval. 
                // We'll assume for this implementation that 'active' + validation means access, 
                // OR we need to check a specific 'kyb_status' flag if it exists on the returned user object.
                // Based on previous code, entities just have 'status'. 

                if (userData.status === 'active') {
                    // Check if they are actually approved (Credential Issued)
                    // If your backend updates entity status to something else upon approval, use that.
                    // For now, I'll allow 'active' users BUT show a pending screen if not fully verified.
                    setStatus(userData.status);
                } else {
                    setStatus(userData.status || 'pending_onboarding');
                }
            }
        } catch (error) {
            console.error('Access check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    // 1. Not Logged In -> Redirect to Home/Login
    const walletAddress = localStorage.getItem('zerogate_wallet_address');
    if (!walletAddress) {
        return <Navigate to="/" replace />;
    }

    // 2. No Entity Record -> Redirect to Onboarding
    if (status === 'new' || status === 'pending_onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    // 3. Pending KYB Approval -> Show Pending Screen
    // If user is 'active' (submitted form) but not explicit 'approved' check
    // functionality requested: "access when kyb approved and given credential badge"
    if (status !== 'approved' && status !== 'active') { // Adjust 'active' logic if strictly needing 'approved' status
        // If you strictly use 'approved' status in DB, change this condition.
        // For now, blocking 'suspended' or 'rejected'
    }

    // Strict Check Implementation:
    // This blocks access unless specific conditions are met.
    // If you haven't implemented the 'approved' status update in backend yet, 
    // this might block everyone. verify with user flow.

    // Assuming 'active' is the status after simple onboarding.
    // If strict approval is needed:
    /*
    if (status === 'active') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Verification Pending</h1>
                <p className="text-slate-400 max-w-md">
                    Your business application is currently under review. 
                    You will receive an email once your KYB verification is complete and your 
                    Credential Badge has been issued.
                </p>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-8 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
                >
                    Back to Home
                </button>
            </div>
        );
    }
    */

    // For now, returning children to allow access if 'active' 
    // (Since we haven't built the admin approval flow yet, blocking everyone might be too aggressive 
    // unless that's exactly what you want).
    // Based on request: "user should be able to access when... approved"
    // blocking access for 'active' (just onboarded) users.

    // 3. Strict Credential Check
    // User requested: "check whether the company have credential instead" of just status.
    // If they have a credential_id, they are allowed.
    // Otherwise, they are restricted (Pending KYB).

    if (!user?.credential_id) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                    Your institutional access is pending approval.
                    The Marketplace is only available to entities with a verified KYB credential.
                </p>
                <div className="p-4 bg-slate-800/50 rounded-lg max-w-sm mx-auto border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-slate-300">Wallet Connected</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-slate-300">Profile Submitted</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                        <span className="text-sm text-yellow-500">KYB Verification Pending</span>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="mt-8 px-6 py-2 text-slate-400 hover:text-white transition"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
