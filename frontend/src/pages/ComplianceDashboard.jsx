import { Activity, AlertTriangle, CheckCircle, Clock, DollarSign, ExternalLink, FileText, Loader2, Lock, LogOut, Shield, Users, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectCrossmark, isCrossmarkInstalled } from '../utils/crossmark';
import { getCurrentAdmin, getKYBApplications, signOutAdmin, subscribeToKYBApplications, subscribeToPayments } from '../utils/supabase';
import { fundWallet } from '../utils/xrpl';

// Import sub-components
import AssetAuthorization from '../components/admin/AssetAuthorization';
import CredentialManager from '../components/admin/CredentialManager';
import KYBReviewDesk from '../components/admin/KYBReviewDesk';
import PaymentMonitor from '../components/admin/PaymentMonitor';
import RevocationTool from '../components/admin/RevocationTool';

const ComplianceDashboard = () => {
    const [admin, setAdmin] = useState(null);
    const [activeTab, setActiveTab] = useState('kyb');
    const [stats, setStats] = useState({
        pendingKYB: 0,
        verifiedCompanies: 0,
        activeCredentials: 0,
        totalPayments: 0
    });
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    // Wallet State
    const [wallet, setWallet] = useState(null);
    const [walletType, setWalletType] = useState(null); // 'crossmark' or 'testnet'
    const [loading, setLoading] = useState(false);
    const [showWalletOptions, setShowWalletOptions] = useState(false);
    const walletDropdownRef = useRef(null);

    useEffect(() => {
        checkAdminAuth();
        loadStats();
        setupRealtime();
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

    const checkAdminAuth = async () => {
        try {
            const user = await getCurrentAdmin();
            if (!user || user.user_metadata?.role !== 'admin') {
                navigate('/admin/login');
                return;
            }
            setAdmin(user);
        } catch (error) {
            console.error('Auth check failed:', error);
            navigate('/admin/login');
        }
    };

    const loadStats = async () => {
        try {
            const applications = await getKYBApplications();
            setStats({
                pendingKYB: applications.filter(app => app.status === 'pending').length,
                verifiedCompanies: applications.filter(app => app.status === 'verified').length,
                activeCredentials: applications.filter(app => app.credential_status === 'active').length,
                totalPayments: 0 // Will be loaded from payments table
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const setupRealtime = () => {
        // Subscribe to KYB applications
        const kybChannel = subscribeToKYBApplications((payload) => {
            console.log('KYB update:', payload);
            addNotification(`New KYB ${payload.eventType}: ${payload.new?.legal_entity_name || 'Company'}`);
            loadStats();
        });

        // Subscribe to payments
        const paymentChannel = subscribeToPayments((payload) => {
            console.log('Payment received:', payload);
            addNotification(`Payment received: ${payload.new?.amount} RLUSD`);
            loadStats();
        });

        return () => {
            kybChannel.unsubscribe();
            paymentChannel.unsubscribe();
        };
    };

    const addNotification = (message) => {
        const notification = {
            id: Date.now(),
            message,
            timestamp: new Date().toISOString()
        };
        setNotifications(prev => [notification, ...prev].slice(0, 10));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    const handleLogout = async () => {
        try {
            await signOutAdmin();
            navigate('/admin/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const connectWithCrossmark = async () => {
        setLoading(true);
        try {
            const walletInfo = await connectCrossmark();
            setWallet(walletInfo);
            setWalletType('crossmark');
            setShowWalletOptions(false);
            addNotification('Crossmark wallet connected successfully');
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
            // fundWallet retrieves persisted wallet from localStorage if available
            // satisfying "demo testnet wallet is always the same"
            const w = await fundWallet();
            setWallet(w);
            setWalletType('testnet');
            setShowWalletOptions(false);
            addNotification('Testnet wallet connected (Demo Mode)');
        } catch (e) {
            console.error(e);
            alert('Failed to connect testnet wallet');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'kyb', label: 'KYB Review Desk', icon: Users, badge: stats.pendingKYB },
        { id: 'credentials', label: 'Credential Manager', icon: Shield, badge: stats.activeCredentials },
        { id: 'assets', label: 'Asset Authorization', icon: FileText },
        { id: 'payments', label: 'Payment Monitor', icon: DollarSign },
        { id: 'revocation', label: 'Revocation Tool', icon: AlertTriangle }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Top Bar */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Compliance & Governance Dashboard</h1>
                                <p className="text-xs text-slate-400">ZeroGate Admin Portal</p>
                            </div>
                        </div>

                        {/* Wallet & Admin Info */}
                        <div className="flex items-center gap-6">

                            {/* Wallet Connection */}
                            {!wallet ? (
                                <div className="relative" ref={walletDropdownRef}>
                                    <button
                                        onClick={() => setShowWalletOptions(!showWalletOptions)}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm border border-slate-600"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                        Connect Provider Wallet
                                    </button>

                                    {/* Wallet Options Dropdown */}
                                    {showWalletOptions && (
                                        <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 z-50 animate-fade-in">
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
                                                    Use the persistent demo wallet
                                                </p>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-slate-400">Connected</p>
                                            {walletType === 'crossmark' && (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Crossmark</span>
                                            )}
                                            {walletType === 'testnet' && (
                                                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Testnet</span>
                                            )}
                                        </div>
                                        <p className="font-mono text-xs text-purple-300">{wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}</p>
                                    </div>
                                    <button
                                        onClick={() => setWallet(null)}
                                        className="text-slate-400 hover:text-red-400 transition-colors"
                                        title="Disconnect Wallet"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="h-8 w-px bg-slate-700 mx-2"></div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-semibold">{admin?.email}</p>
                                    <p className="text-xs text-slate-400">Administrator</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="bg-slate-800/50 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="grid grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.pendingKYB}</p>
                                <p className="text-xs text-slate-400">Pending KYB</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.verifiedCompanies}</p>
                                <p className="text-xs text-slate-400">Verified Companies</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.activeCredentials}</p>
                                <p className="text-xs text-slate-400">Active Credentials</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <Activity className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.totalPayments}</p>
                                <p className="text-xs text-slate-400">Total Payments</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications Toast */}
            <div className="fixed top-20 right-6 z-50 space-y-2">
                {notifications.map(notif => (
                    <div key={notif.id} className="bg-blue-600 border border-blue-500 rounded-lg p-4 shadow-xl max-w-sm animate-slide-in">
                        <div className="flex items-start gap-3">
                            <Activity className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-white">{notif.message}</p>
                                <p className="text-xs text-blue-200 mt-1">
                                    {new Date(notif.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors relative ${activeTab === tab.id
                                        ? 'border-purple-500 text-white bg-slate-700/50'
                                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/30'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-semibold">{tab.label}</span>
                                    {tab.badge > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'kyb' && <KYBReviewDesk onUpdate={loadStats} wallet={wallet} />}
                {activeTab === 'credentials' && <CredentialManager onUpdate={loadStats} wallet={wallet} />}
                {activeTab === 'assets' && <AssetAuthorization onUpdate={loadStats} wallet={wallet} />}
                {activeTab === 'payments' && <PaymentMonitor wallet={wallet} />}
                {activeTab === 'revocation' && <RevocationTool onUpdate={loadStats} wallet={wallet} />}
            </div>
        </div>
    );
};

export default ComplianceDashboard;
