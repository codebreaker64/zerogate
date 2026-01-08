import { Building2, Coins, Image as ImageIcon, LayoutDashboard, LayoutGrid, Loader2, LogOut, Plus, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWalletUser } from '../utils/siwx';
import { createAsset, getMyAssets } from '../utils/supabase';
import Marketplace from './Marketplace';

// --- Asset Manager Component ---
const AssetManager = ({ entityId, walletAddress }) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        asset_name: '',
        asset_category: 'real_estate',
        total_value: '',
        currency: 'USD',
        description: '',
        image_uri: '', // In a real app, this would be an file upload returning a URL
        min_investment: ''
    });

    useEffect(() => {
        if (entityId) {
            loadAssets();
        }
    }, [entityId]);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await getMyAssets(entityId);
            setAssets(data);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);

        try {
            const newAsset = {
                entity_id: entityId,
                issuer_address: walletAddress, // Using user's wallet as issuer for self-custody model
                ...formData,
                asset_metadata: {
                    // Start with basic metadata, extensible later
                    created_platform: 'ZeroGate',
                    version: '1.0'
                }
            };

            await createAsset(newAsset);

            // Reset and Reload
            setIsCreating(false);
            setFormData({
                asset_name: '',
                asset_category: 'real_estate',
                total_value: '',
                currency: 'USD',
                description: '',
                image_uri: '',
                min_investment: ''
            });
            loadAssets();
        } catch (error) {
            console.error('Failed to create asset:', error);
            alert('Failed to create asset: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading && !isCreating && assets.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    // --- Create Asset Form ---
    if (isCreating) {
        return (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-purple-400" />
                        Tokenize New Asset
                    </h3>
                    <button
                        onClick={() => setIsCreating(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Asset Name</label>
                            <input
                                type="text"
                                name="asset_name"
                                value={formData.asset_name}
                                onChange={handleInputChange}
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                placeholder="e.g. Marina Bay Sands Tower 3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                            <select
                                name="asset_category"
                                value={formData.asset_category}
                                onChange={handleInputChange}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="real_estate">Real Estate</option>
                                <option value="fixed_income">Fixed Income / Bonds</option>
                                <option value="carbon_credits">Carbon Credits</option>
                                <option value="commodities">Commodities</option>
                                <option value="art_collectibles">Art & Collectibles</option>
                                <option value="infrastructure">Infrastructure</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Total Valuation</label>
                            <input
                                type="number"
                                name="total_value"
                                value={formData.total_value}
                                onChange={handleInputChange}
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                placeholder="1000000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Min Investment</label>
                            <input
                                type="number"
                                name="min_investment"
                                value={formData.min_investment}
                                onChange={handleInputChange}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                placeholder="5000"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Image URL (Optional)</label>
                            <div className="relative">
                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="url"
                                    name="image_uri"
                                    value={formData.image_uri}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                placeholder="Describe the asset, location, and investment details..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-6 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Asset
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // --- Empty State ---
    if (assets.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                <Building2 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">My Assets</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    You haven't tokenized any Real World Assets yet.
                    Create an asset to start offering it on the marketplace.
                </p>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors inline-flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Tokenize New Asset
                </button>
            </div>
        );
    }

    // --- Assets Grid ---
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LayoutGrid className="w-6 h-6 text-purple-400" />
                    My Asset Portfolio
                </h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Asset
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                    <div key={asset.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-colors group">
                        <div className="h-48 bg-slate-900 relative">
                            {asset.image_uri ? (
                                <img src={asset.image_uri} alt={asset.asset_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                    <Building2 className="w-12 h-12 text-slate-700" />
                                </div>
                            )}
                            <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${asset.status === 'authorized' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                        asset.status === 'draft' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50' :
                                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                    }`}>
                                    {asset.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-white mb-1">{asset.asset_name}</h3>
                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{asset.description || 'No description provided.'}</p>

                            <div className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-xs">Valuation</span>
                                    <span className="font-mono text-white font-semibold flex items-center gap-1">
                                        <Coins className="w-3 h-3 text-blue-400" />
                                        {Number(asset.total_value).toLocaleString()} {asset.currency}
                                    </span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-slate-500 text-xs">Category</span>
                                    <span className="text-purple-300 capitalize">{asset.asset_category.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Wrapper ---
const BusinessDashboard = () => {
    const [activeTab, setActiveTab] = useState('marketplace');
    const [entityId, setEntityId] = useState(null);
    const navigate = useNavigate();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    useEffect(() => {
        if (!walletAddress) {
            navigate('/login');
        } else {
            // Fetch Entity ID
            getCurrentWalletUser().then(user => {
                if (user) setEntityId(user.id);
            });
        }
    }, [walletAddress, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('zerogate_wallet_address');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Top Navigation Bar */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg">Business Portal</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700">
                            <Wallet className="w-3 h-3" />
                            <span className="font-mono text-xs text-blue-300">
                                {walletAddress?.substring(0, 8)}...{walletAddress?.substring(walletAddress.length - 8)}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Disconnect Wallet"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('marketplace')}
                        className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${activeTab === 'marketplace'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <Coins className="w-4 h-4" />
                        Marketplace
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${activeTab === 'assets'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Asset Management
                    </button>
                </div>

                {/* Content Area */}
                <div className="animate-fade-in">
                    {activeTab === 'marketplace' && <Marketplace walletAddress={walletAddress} isEmbedded={true} />}
                    {activeTab === 'assets' && <AssetManager entityId={entityId} walletAddress={walletAddress} />}
                </div>
            </div>
        </div>
    );
};

export default BusinessDashboard;
