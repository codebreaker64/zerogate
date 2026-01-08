import { CheckCircle, Coins, ExternalLink, Image, Loader2, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { connectCrossmark, isCrossmarkInstalled } from '../utils/crossmark';
import { getNFTs, mintRWANFT } from '../utils/nft';
import { getCurrentWalletUser } from '../utils/siwx';
import { supabase } from '../utils/supabase';
import { checkCredential, fundWallet } from '../utils/xrpl';

const Marketplace = ({ walletAddress: initialAddress, isEmbedded = false }) => {
    const [wallet, setWallet] = useState(initialAddress ? { address: initialAddress } : null);
    const [walletType, setWalletType] = useState(initialAddress ? 'crossmark' : null); // Default to crossmark if passed
    const [loading, setLoading] = useState(false);


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
    const [issuerAddress, setIssuerAddress] = useState('rw1F8SXiFWJ4U9ybPjQLqEjyq6KaCZMv76');

    useEffect(() => {
        if (initialAddress) {
            setWallet({ address: initialAddress });
            setWalletType('crossmark');
            setIsVerified(false); // Reset verification state on wallet change
            // Trigger checks
            checkVerification(initialAddress, issuerAddress);
            checkKYBStatus(initialAddress);
            fetchUserNFTs(initialAddress);
        }
    }, [initialAddress, issuerAddress]);

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
            await checkKYBStatus(walletInfo.address);
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
            // Auto-check credential and KYB status
            await checkVerification(w.address, issuerAddress);
            await checkKYBStatus(w.address);
            await fetchUserNFTs(w.address);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const checkVerification = async (address, issuer) => {
        setVerifying(true);
        try {
            const hasCred = await checkCredential(address, issuer);
            if (hasCred) setIsVerified(true);
        } catch (e) {
            console.error(e);
        } finally {
            setVerifying(false);
        }
    };

    const fetchUserNFTs = async (address) => {
        setLoadingNFTs(true);
        try {
            const nfts = await getNFTs(address);
            setUserNFTs(nfts);
            console.log('User NFTs:', nfts);
        } catch (e) {
            console.error('Error fetching NFTs:', e);
        } finally {
            setLoadingNFTs(false);
        }
    };

    const checkKYBStatus = async (address) => {
        try {
            // Check real status from Supabase
            const user = await getCurrentWalletUser();
            if (user) {
                // If credential_id exists, they are verified
                if (user.credential_id) {
                    setIsVerified(true);

                    // Fetch the linked credential to get the correct Issuer
                    const { data: cred } = await supabase
                        .from('credentials')
                        .select('issuer_did')
                        .eq('id', user.credential_id)
                        .single();

                    if (cred && cred.issuer_did) {
                        console.log('Linked Issuer Found:', cred.issuer_did);
                        setIssuerAddress(cred.issuer_did);
                    }
                }
            }
        } catch (e) {
            console.error('Error checking KYB status:', e);
        }
    };






    const checkUserTrustline = async (address) => {
        if (!issuerAddress) return;
        setCheckingTrustline(true);
        try {
            // NFTs don't need trustlines
            const trustlineExists = false;
            setHasTrustline(trustlineExists);
        } catch (e) {
            console.error('Error checking trustline:', e);
        } finally {
            setCheckingTrustline(false);
        }
    };

    const handleMint = async () => {
        if (!isVerified || !wallet) return;

        setMinting(true);
        setMintStatus('');

        try {
            // For demo: Create issuer wallet first so we can use it for trustline
            setMintStatus('Creating issuer wallet...');
            const { fundWallet } = await import('../utils/xrpl');
            const tempIssuer = await fundWallet();
            console.log('Issuer wallet created:', tempIssuer.address);

            // Mint unique RWA NFT
            setMintingStep('minting');
            setMintStatus('Minting unique RWA NFT to your wallet...');

            console.log('Attempting to mint NFT:', {
                issuer: tempIssuer.address,
                user: wallet.address
            });

            const nftResult = await mintRWANFT(
                tempIssuer,
                wallet.address,
                {
                    name: `Luxury Apartment Share #${Date.now()}`,
                    description: 'Tokenized share of premium residential property',
                    assetType: 'Real Estate',
                    shares: 1
                },
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

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Coins className="text-blue-500" />
                            Institutional RWA Marketplace
                        </h1>
                        <p className="text-slate-400 mt-2">Verified Corporate Entities Only</p>
                    </div>

                    {!wallet ? (
                        <div className="relative" ref={walletDropdownRef}>
                            <button
                                onClick={() => setShowWalletOptions(!showWalletOptions)}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Wallet />}
                                Connect Corporate Wallet
                            </button>

                            {/* Wallet Options Dropdown */}
                            {showWalletOptions && (
                                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 z-50">
                                    <p className="text-sm font-semibold text-slate-300 mb-3">Choose Wallet</p>

                                    {/* Crossmark Option */}
                                    <button
                                        onClick={connectWithCrossmark}
                                        disabled={!isCrossmarkInstalled()}
                                        className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold">Crossmark Wallet</span>
                                            <div className="flex items-center gap-1 text-xs text-green-400">
                                                {isCrossmarkInstalled() ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>Detected</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="w-3 h-3 text-red-400" />
                                                        <span className="text-red-400">Not Installed</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Connect using Crossmark browser extension
                                        </p>
                                        {!isCrossmarkInstalled() && (
                                            <a
                                                href="https://crossmark.io"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Install Crossmark <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </button>

                                    {/* Testnet Faucet Option */}
                                    <button
                                        onClick={connectTestnetWallet}
                                        className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-left group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold">Testnet Wallet</span>
                                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Demo</span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Create a new testnet wallet with faucet funds
                                        </p>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                    <p className="text-xs text-slate-400">Connected Wallet</p>
                                    {walletType === 'crossmark' && (
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Crossmark</span>
                                    )}
                                    {walletType === 'testnet' && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Testnet</span>
                                    )}
                                </div>
                                <p className="font-mono text-sm text-blue-300">{wallet.address}</p>
                            </div>


                            {/* NFT Display */}
                            {userNFTs.length > 0 && (
                                <div className="flex flex-col items-end gap-1 mr-4">
                                    <label className="text-[10px] text-slate-500">Your RWA NFTs</label>
                                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-lg">
                                        <Image className="w-4 h-4 text-purple-400" />
                                        <span className="font-bold text-purple-400">{userNFTs.length} NFT{userNFTs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            )}
                            {loadingNFTs && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 mr-4">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading NFTs...
                                </div>
                            )}



                            {verifying ? (
                                <div className="px-3 py-1 bg-slate-800 rounded-full text-xs flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                                </div>
                            ) : isVerified ? (
                                <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-2 font-bold border border-green-500/50">
                                    <ShieldCheck className="w-3 h-3" /> Verified Investor
                                </div>
                            ) : (
                                <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-2 font-bold border border-red-500/50">
                                    <Lock className="w-3 h-3" /> Not Verified
                                </div>
                            )}
                        </div>
                    )}
                </header>



                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Asset Card */}
                    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all group">
                        <div className="h-48 bg-slate-700 relative">
                            <img
                                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                alt="Real Estate"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono">
                                NFT ID: #8821
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-2">Luxury Apartment Complex</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Unique NFT representing ownership share of premium residential property in Downtown.
                            </p>

                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-xs text-slate-500">Price per Share</p>
                                    <p className="text-lg font-bold">5,000 RLUSD</p>
                                    <p className="text-xs text-slate-500 mt-1">Receive: 1 Unique NFT</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">APY</p>
                                    <p className="text-lg font-bold text-green-400">8.5%</p>
                                </div>
                            </div>

                            {mintStatus ? (
                                <div className={`p-3 border rounded-lg text-center text-sm font-medium ${mintingStep === 'complete'
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    }`}>
                                    {mintStatus}
                                </div>
                            ) : (
                                <>
                                    {/* Trustline Status */}
                                    {wallet && isVerified && (
                                        <div className="mb-3 p-2 bg-slate-700/30 rounded-lg text-xs flex items-center justify-between">
                                            <span className="text-slate-400">NFT Ready:</span>
                                            {checkingTrustline ? (
                                                <span className="flex items-center gap-1 text-slate-300">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Checking...
                                                </span>
                                            ) : hasTrustline ? (
                                                <span className="flex items-center gap-1 text-green-400">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Ready
                                                </span>
                                            ) : (
                                                <span className="text-yellow-400">Will be created</span>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleMint}
                                        disabled={!isVerified || !wallet || minting}
                                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isVerified && !minting
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {minting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {mintingStep === 'trustline' ? 'Setting up Trustline...' : 'Minting Token...'}
                                            </>
                                        ) : isVerified ? (
                                            <>Mint NFT <Image className="w-4 h-4" /></>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" /> Verification Required
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {!isVerified && wallet && (
                                <p className="text-xs text-center mt-3 text-red-400">
                                    Requires credential from Service Provider
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;
