import { CheckCircle, Image, LogOut, Shield, ShieldAlert, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWalletUser, signOutWallet } from '../utils/siwx';
import { getMyKYCApplication, supabase } from '../utils/supabase';
import Marketplace from './Marketplace';

const UserDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nfts, setNfts] = useState([]);
    const [loadingNfts, setLoadingNfts] = useState(true);
    const navigate = useNavigate();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    useEffect(() => {
        const load = async () => {
            if (!walletAddress) {
                navigate('/user/login');
                return;
            }
            const profile = await getCurrentWalletUser();

            // Derive KYC Status
            let status = 'not_started';
            if (profile?.status === 'active') { // Verified
                status = 'approved';
            } else {
                // Check if application exists (pending/rejected)
                const app = await getMyKYCApplication();
                if (app) status = app.status;
            }

            // Augment profile for UI
            if (profile) profile.kyc_status = status;

            setUser(profile);
            setLoading(false);

            // Fetch NFTs for this entity
            if (profile?.id) {
                const { data: nftData } = await supabase
                    .from('nfts')
                    .select('*')
                    .eq('entity_id', profile.id)
                    .order('created_at', { ascending: false });

                let nftList = nftData || [];

                // Add temp NFT from localStorage if exists (pure frontend)
                const tempNFT = localStorage.getItem('zerogate_temp_nft');
                if (tempNFT) {
                    try {
                        const parsed = JSON.parse(tempNFT);
                        nftList = [parsed, ...nftList];
                    } catch (e) {
                        console.error('Failed to parse temp NFT:', e);
                    }
                }

                setNfts(nftList);
                setLoadingNfts(false);
            }
        };
        load();
    }, [navigate, walletAddress]);

    const kycStatus = user?.kyc_status || 'not_started';
    const readableStatus = kycStatus.replace(/_/g, ' ');
    const isApproved = kycStatus === 'approved';

    const handleSignOut = async () => {
        await signOutWallet();
        navigate('/user/login');
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
                        <span className="font-bold text-lg">User Portal</span>
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
                                onClick={() => navigate('/user/kyc')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white"
                            >
                                Update KYC
                            </button>
                        )}
                    </div>
                </div>

                <Marketplace walletAddress={walletAddress} isEmbedded={true} mode="user" profile={user} />

                {/* Available NFTs */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Image className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold">Your NFTs</h3>
                        <span className="ml-auto text-sm text-slate-400">{nfts.length} total</span>
                    </div>

                    {loadingNfts ? (
                        <div className="text-center py-8 text-slate-400">Loading NFTs...</div>
                    ) : nfts.length === 0 ? (
                        <div className="text-center py-8">
                            <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No NFTs yet</p>
                            <p className="text-xs text-slate-500 mt-1">NFTs will appear here when minted</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {nfts.map((nft) => (
                                <div key={nft.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-all group flex flex-col h-full">
                                    <div className="h-40 bg-slate-900 relative overflow-hidden">
                                        {nft.image_uris && nft.image_uris.length > 0 ? (
                                            <img
                                                src={nft.image_uris[0]}
                                                alt={nft.token_name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                <Image className="w-16 h-16 text-slate-600" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-bold border border-white/10">
                                            {nft.ticker_symbol || 'NFT'}
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <h4 className="font-semibold text-white">{nft.token_name}</h4>
                                        <p className="text-xs text-slate-400">Token ID: {nft.token_id}</p>
                                        {nft.ipfs_hash && (
                                            <p className="text-xs text-slate-500 font-mono truncate">
                                                IPFS: {nft.ipfs_hash}
                                            </p>
                                        )}
                                        <span className={`px-2 py-1 rounded text-xs font-semibold self-start ${nft.status === 'minted'
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                            {nft.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
