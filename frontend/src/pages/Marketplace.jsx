import { Coins, Loader2, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { connectCrossmark } from '../utils/crossmark';
import { getNFTs, mintRWANFT } from '../utils/nft';
import { getCurrentWalletUser } from '../utils/siwx';
import { supabase } from '../utils/supabase';
import { fundWallet } from '../utils/xrpl';

const Marketplace = ({ walletAddress: initialAddress, isEmbedded = false, mode = 'business', profile }) => {
    const [wallet, setWallet] = useState(initialAddress ? { address: initialAddress } : null);
    const [walletType, setWalletType] = useState(initialAddress ? 'crossmark' : null); // Default to crossmark if passed
    const [loading, setLoading] = useState(false);

    const [accountType, setAccountType] = useState(initialAddress ? 'business' : null);
    const [kycStatus, setKycStatus] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [mintStatus, setMintStatus] = useState('');
    const [showWalletOptions, setShowWalletOptions] = useState(false);
    const walletDropdownRef = useRef(null);

    // NFT minting states
    const [minting, setMinting] = useState(false);
    const [hasTrustline, setHasTrustline] = useState(false);
    const [checkingTrustline, setCheckingTrustline] = useState(false);
    const [mintingStep, setMintingStep] = useState(''); // 'minting', 'complete'
    const [nftIssuer, setNftIssuer] = useState(null); // Will be the service provider's wallet
    const [userNFTs, setUserNFTs] = useState([]);
    const [loadingNFTs, setLoadingNFTs] = useState(false);

    // Issuer Address State (Editable for testing since Admin wallet changes)
    const [issuerAddress, setIssuerAddress] = useState(null);

    // Marketplace Assets
    const [marketAssets, setMarketAssets] = useState([]);

    useEffect(() => {
        if (profile) {
            setAccountType(profile.account_type || 'business');
            setKycStatus(profile.kyc_status || null);
            setIsVerified(profile.account_type === 'consumer'
                ? profile.kyc_status === 'approved'
                : !!profile.credential_id);
        }
    }, [profile]);

    useEffect(() => {
        if (initialAddress) {
            setWallet({ address: initialAddress });
            setWalletType('crossmark');
            setIsVerified(false); // Reset verification state on wallet change
            // Trigger checks
            checkVerification(initialAddress, issuerAddress);
            checkKYBStatus();
            fetchUserNFTs(initialAddress);
        }
    }, [initialAddress, issuerAddress]);

    // Fetch Marketplace Assets (Authorized Only)
    useEffect(() => {
        const fetchMarketAssets = async () => {
            const { data } = await supabase
                .from('assets')
                .select('*, entities(company_name)')
                .eq('status', 'authorized') // Only show Authorized assets
                .order('created_at', { ascending: false });
            setMarketAssets(data || []);
        };
        fetchMarketAssets();
    }, []);

    // Close wallet options when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target)) {
                setShowWalletOptions(false);
            }
        };

        if (showWalletOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showWalletOptions]);

    const connectWithCrossmark = async () => {
        setLoading(true);
        try {
            const walletInfo = await connectCrossmark();
            setWallet(walletInfo);
            setWalletType('crossmark');
            setShowWalletOptions(false);
            // Auto-check credential and KYB status
            await checkVerification(walletInfo.address, issuerAddress);
            await checkKYBStatus();
            await fetchUserNFTs(walletInfo.address);
        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const connectTestnetWallet = async () => {
        setLoading(true);
        try {
            const w = await fundWallet();
            setWallet(w);
            setWalletType('testnet');
            setShowWalletOptions(false);
            // For testnet wallet, no credentials exist initially
            setIsVerified(false);
            await fetchUserNFTs(w.address);
        } catch (e) {
            console.error(e);
            alert('Failed to generate test wallet');
        } finally {
            setLoading(false);
        }
    };

    const checkKYBStatus = async () => {
        try {
            // Logic to check KYB status if needed
            // Refactored to rely on 'checkVerification' mostly
            const user = await getCurrentWalletUser();
            if (user && user.credential_id) {
                setIsVerified(true);
            }
        } catch (error) {
            console.log("KYB Check skipped or failed");
        }
    };

    const checkVerification = async (address, trustedIssuer) => {
        setVerifying(true);
        try {
            // Check Database for Credential
            const { data: user } = await supabase
                .from('users')
                .select('*, kyc_status, credential_id')
                .eq('wallet_address', address)
                .maybeSingle();

            if (!user) {
                setIsVerified(false);
                return;
            }

            if (user.role === 'consumer' && user.kyc_status === 'approved') {
                setIsVerified(true);
                setAccountType('consumer');
                return;
            }

            if (user.credential_id) {
                setIsVerified(true);
                // Fetch linked issuer
                const { data: cred } = await supabase
                    .from('credentials')
                    .select('issuer_did')
                    .eq('id', user.credential_id)
                    .single();
                if (cred) setIssuerAddress(cred.issuer_did);
            }

        } catch (e) {
            console.error('Error checking verification:', e);
            setIsVerified(false);
        } finally {
            setVerifying(false);
        }
    };

    const fetchUserNFTs = async (address) => {
        if (!address) return;
        setLoadingNFTs(true);
        try {
            const nfts = await getNFTs(address);
            setUserNFTs(nfts);
        } catch (error) {
            console.error('Error fetching NFTs:', error);
            setUserNFTs([]);
        } finally {
            setLoadingNFTs(false);
        }
    };



    const handleMint = async (asset = null) => {
        if (!isVerified || !wallet) return;

        setMinting(true);
        setMintStatus('');
        setMintingStep('minting');

        try {
            // For demo: Create issuer wallet first so we can use it for trustline
            setMintStatus('Preparing issuance...');
            const { fundWallet } = await import('../utils/xrpl');
            const tempIssuer = await fundWallet(); // In prod, this is the Issuer's Wallet
            console.log('Issuer wallet used:', tempIssuer.address);

            setMintStatus('Minting RWA NFT...');

            const assetData = asset ? {
                name: asset.asset_name,
                description: asset.description,
                assetType: asset.asset_category,
                shares: 1,
                // Add more metadata to NFT
            } : {
                name: `Luxury Apartment Share #${Date.now()}`,
                description: 'Tokenized share of premium residential property',
                assetType: 'Real Estate',
                shares: 1
            };

            const nftResult = await mintRWANFT(
                tempIssuer,
                wallet.address,
                assetData,
                walletType === 'crossmark'
            );

            setMintingStep('complete');
            setMintStatus(`Success! NFT minted to your wallet.`);
            console.log('Minting successful:', nftResult);

            // Refresh NFTs
            await fetchUserNFTs(wallet.address);

        } catch (e) {
            console.error('Minting error:', e);
            setMintStatus(`Error: ${e.message}`);
            setMintingStep('');
        } finally {
            setMinting(false);
        }
    };

    const readableKYCStatus = (kycStatus || 'not_started').replace(/_/g, ' ');
    const verifiedLabel = accountType === 'consumer' ? 'KYC Approved' : 'Verified Investor';
    const unverifiedLabel = accountType === 'consumer' ? `KYC: ${readableKYCStatus}` : 'Not Verified';

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Account Balance</h3>
                            <Wallet className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-white">10,000,000</span>
                            <span className="text-purple-400 text-sm mb-1 font-semibold">RLUSD</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-xs text-slate-500">Available for investment</p>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Available Assets</h3>
                            <Coins className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-white">{marketAssets.length}</span>
                            <span className="text-green-400 text-xs mb-1">Live</span>
                        </div>
                    </div>
                </div>

                {/* --- LIVE ASSETS SECTION --- */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-xl font-bold text-white">Live Opportunities</h2>
                        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full border border-green-500/20 animate-pulse">Live</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {marketAssets.length > 0 ? (
                            marketAssets.map(asset => (
                                <div key={asset.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500/50 transition-all group flex flex-col h-full">
                                    <div className="h-40 bg-slate-700/50 flex items-center justify-center relative">
                                        {/* Fallback Image */}
                                        <Coins className="w-16 h-16 text-slate-600 group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-bold border border-white/10">
                                            {asset.ticker_symbol || 'RWA'}
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{asset.asset_category?.replace('_', ' ')}</span>
                                                <h3 className="font-bold text-lg mt-1 line-clamp-1">{asset.asset_name}</h3>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">{asset.description}</p>

                                        <div className="grid grid-cols-2 gap-4 mb-4 mt-auto">
                                            <div>
                                                <span className="text-xs text-slate-500 block">Valuation</span>
                                                <span className="font-mono text-white">${Number(asset.total_value).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block">Min Invest</span>
                                                <span className="font-mono text-white">${Number(asset.min_investment || 0).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleMint(asset)}
                                            disabled={!isVerified || minting}
                                            className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isVerified
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                            {isVerified ? 'Invest Now' : 'Verify to Invest'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 py-12 text-center bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                                <p className="text-slate-500">No authorized assets listing at the moment.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;
