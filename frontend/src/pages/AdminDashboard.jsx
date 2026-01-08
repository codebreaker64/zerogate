import React, { useState, useEffect, useRef } from 'react';
import { fundWallet, issueCredential } from '../utils/xrpl';
import { connectCrossmark, isCrossmarkInstalled } from '../utils/crossmark';
import { getKYBApplications, updateKYBApplication } from '../utils/kybStorage';
import { Shield, CheckCircle, AlertCircle, Loader2, Wallet, Lock, ExternalLink } from 'lucide-react';

const AdminDashboard = () => {
    const [wallet, setWallet] = useState(null);
    const [walletType, setWalletType] = useState(null); // 'crossmark' or 'testnet'
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showWalletOptions, setShowWalletOptions] = useState(false);
    const walletDropdownRef = useRef(null);
    const [pendingApplications, setPendingApplications] = useState(getKYBApplications());
    const [issuedHashes, setIssuedHashes] = useState([]);

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

    // Listen for new KYB applications from Marketplace
    useEffect(() => {
        const handleApplicationUpdate = () => {
            console.log('KYB Application updated, refreshing...');
            setPendingApplications(getKYBApplications());
        };

        window.addEventListener('kybApplicationSubmitted', handleApplicationUpdate);
        window.addEventListener('kybApplicationUpdated', handleApplicationUpdate);

        return () => {
            window.removeEventListener('kybApplicationSubmitted', handleApplicationUpdate);
            window.removeEventListener('kybApplicationUpdated', handleApplicationUpdate);
        };
    }, []);

    const connectWithCrossmark = async () => {
        setLoading(true);
        setStatus('Connecting to Crossmark...');
        try {
            const walletInfo = await connectCrossmark();
            setWallet(walletInfo);
            setWalletType('crossmark');
            setShowWalletOptions(false);
            setStatus('Crossmark wallet connected!');
        } catch (e) {
            console.error(e);
            alert(e.message);
            setStatus('Failed to connect to Crossmark.');
        } finally {
            setLoading(false);
        }
    };

    const connectTestnetWallet = async () => {
        setLoading(true);
        setStatus('Connecting to Testnet and funding wallet...');
        try {
            const w = await fundWallet();
            setWallet(w);
            setWalletType('testnet');
            setShowWalletOptions(false);
            setStatus('Testnet wallet connected!');
        } catch (e) {
            console.error(e);
            setStatus('Failed to connect wallet.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (application) => {
        if (!wallet) return;
        setLoading(true);
        setStatus(`Issuing corporate credential to ${application.legalEntityName}...`);
        try {
            const hash = await issueCredential(wallet, application.directorWalletAddress);

            // Update application in shared storage
            updateKYBApplication(application.id, 'Approved', {
                credentialHash: hash,
                approvedAt: new Date().toISOString(),
                approvedBy: wallet.address
            });

            setIssuedHashes(prev => [...prev, {
                entity: application.legalEntityName,
                address: application.directorWalletAddress,
                hash
            }]);

            // Refresh applications from storage
            setPendingApplications(getKYBApplications());

            setStatus(`✅ Corporate credential issued to ${application.legalEntityName}! Hash: ${hash}`);
        } catch (e) {
            console.error('Credential issuance error:', e);

            // Check if credential already exists (redundant transaction)
            if (e.message.includes('temREDUNDANT') || e.message.includes('redundant')) {
                // Credential already exists - treat as success
                updateKYBApplication(application.id, 'Approved', {
                    credentialHash: 'Already exists',
                    approvedAt: new Date().toISOString(),
                    approvedBy: wallet.address,
                    note: 'Credential already issued previously'
                });

                setPendingApplications(getKYBApplications());
                setStatus(`✅ ${application.legalEntityName} already has a valid credential. Marked as approved.`);
            } else {
                setStatus(`❌ Failed to issue credential: ${e.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Shield className="text-purple-500" />
                            Service Provider Dashboard
                        </h1>
                        <p className="text-slate-400 mt-2">Compliance-as-a-Service Portal</p>
                    </div>

                    {!wallet ? (
                        <div className="relative" ref={walletDropdownRef}>
                            <button
                                onClick={() => setShowWalletOptions(!showWalletOptions)}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Wallet />}
                                Connect Provider Wallet
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
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-800 px-4 py-2 rounded-lg border border-purple-500/30">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs text-slate-400">Provider Wallet</p>
                                    {walletType === 'crossmark' && (
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Crossmark</span>
                                    )}
                                    {walletType === 'testnet' && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Testnet</span>
                                    )}
                                </div>
                                <p className="font-mono text-sm text-purple-300">{wallet.address}</p>
                            </div>
                        </div>
                    )}
                </header>

                {status && (
                    <div className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-3">
                        <AlertCircle className="text-blue-400 w-5 h-5" />
                        <p className="text-slate-300">{status}</p>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content: Credential Management */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                            <h2 className="text-xl font-bold mb-6">Pending KYB Applications</h2>

                            <div className="space-y-4">
                                {pendingApplications.map((app) => (
                                    <div key={app.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg text-white mb-1">{app.legalEntityName}</h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-slate-500 text-xs">Business Reg #</p>
                                                        <p className="text-slate-300 font-mono">{app.businessRegNumber}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 text-xs">Business Type</p>
                                                        <p className="text-slate-300">{app.businessType}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-slate-500 text-xs">Director's Wallet</p>
                                                    <p className="font-mono text-xs text-slate-300">{app.directorWalletAddress}</p>
                                                </div>
                                            </div>

                                            {app.status === 'Approved' ? (
                                                <span className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-sm font-medium">
                                                    <CheckCircle className="w-4 h-4" /> Approved
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleVerify(app)}
                                                    disabled={!wallet || loading}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                                >
                                                    Approve & Issue Credential
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Ledger Status */}
                    <div className="space-y-6">
                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                            <h2 className="text-xl font-bold mb-6">Ledger Status</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-900/50 rounded-lg">
                                    <p className="text-sm text-slate-400 mb-1">Network</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="font-medium">XRPL Testnet</span>
                                    </div>
                                </div>

                                {issuedHashes.length > 0 && (
                                    <div>
                                        <p className="text-sm text-slate-400 mb-3">Recent Issuances</p>
                                        <div className="space-y-2">
                                            {issuedHashes.map((item, i) => (
                                                <div key={i} className="text-xs p-3 bg-slate-900/50 rounded border border-slate-700/50 break-all">
                                                    <p className="text-slate-500 mb-1">Entity: {item.entity || 'N/A'}</p>
                                                    <p className="text-slate-500 mb-1">Tx Hash:</p>
                                                    <p className="font-mono text-blue-400 hover:underline cursor-pointer" title={item.hash}>
                                                        {item.hash.substring(0, 20)}...
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminDashboard;
