import { Building2, Coins, Flame, Image as ImageIcon, LayoutDashboard, LayoutGrid, Loader2, LogOut, Plus, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWalletUser } from '../utils/siwx';
import { supabase } from '../utils/supabase';
import Marketplace from './Marketplace';

// --- Asset Manager Component ---
const AssetManager = ({ entityId, walletAddress }) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State (Institutional Grade)
    const [formData, setFormData] = useState({
        asset_name: '',
        asset_category: 'real_estate',
        description: '',

        // Institutional Defaults
        issuing_spv: '',
        asset_jurisdiction: 'Singapore',

        // Valuation (RLUSD)
        total_value: '',

        // Audit
        valuation_date: '',
        appraiser_name: '',

        // Type Specific
        gla: '',
        annual_yield: '',
        maturity_date: '',
        coupon_rate: '',
        payment_frequency: 'Quarterly',
        serial_number: '', // For commodities/luxury
        contract_details: '' // For intangibles/trade finance
    });

    const [legalDocs, setLegalDocs] = useState([]);
    const [assetImages, setAssetImages] = useState([]);

    useEffect(() => {
        if (entityId) {
            loadAssets();
        }
    }, [entityId]);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data || []);
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

    const handleFileChange = (e) => {
        if (e.target.files) {
            setLegalDocs(Array.from(e.target.files));
        }
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            setAssetImages(Array.from(e.target.files));
        }
    };

    const handleBurnAsset = async (assetId, assetName) => {
        if (!confirm(`⚠️ Are you sure you want to BURN "${assetName}"?\n\nThis action is PERMANENT and will delete all asset data, images, and documents from the system.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', assetId);

            if (error) throw error;

            alert('🔥 Asset burned successfully');
            loadAssets();
        } catch (error) {
            console.error('Failed to burn asset:', error);
            alert('Failed to burn asset: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: Asset Images Required
        if (assetImages.length === 0) {
            alert('Please upload at least one asset image.');
            return;
        }

        // Validation: Legal Documents Required
        if (legalDocs.length === 0) {
            alert('Please upload at least one legal document (Title Deeds, Opinions, etc.).');
            return;
        }

        // Validation: SPV Name Required
        if (!formData.issuing_spv || formData.issuing_spv.trim() === '') {
            alert('Please enter the Issuing SPV Name.');
            return;
        }

        // Validation: Asset-Specific Details Required
        if (formData.asset_category === 'real_estate') {
            if (!formData.gla || !formData.annual_yield || !formData.appraiser_name || !formData.valuation_date) {
                alert('Please complete all Real Estate specific details (GLA, Yield, Appraiser, Valuation Date).');
                return;
            }
        } else if (formData.asset_category === 'fixed_income') {
            if (!formData.maturity_date || !formData.coupon_rate || !formData.payment_frequency) {
                alert('Please complete all Fixed Income specific details (Maturity Date, Coupon Rate, Payment Frequency).');
                return;
            }
        } else if (formData.asset_category === 'commodities' || formData.asset_category === 'luxury_assets') {
            if (!formData.serial_number || !formData.appraiser_name || !formData.valuation_date) {
                alert('Please complete all specific details (Serial Number, Appraiser/Certifier, Valuation Date).');
                return;
            }
        } else if (formData.asset_category === 'trade_finance' || formData.asset_category === 'intangibles') {
            if (!formData.contract_details || !formData.maturity_date) {
                alert('Please complete all specific details (Contract Details, Maturity/Expiry Date).');
                return;
            }
        }

        setCreating(true);

        try {
            // 1. Upload Asset Images
            const uploadedImages = [];
            if (assetImages.length > 0) {
                setUploading(true);
                for (const file of assetImages) {
                    const fileName = `images/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                    const { data, error } = await supabase.storage
                        .from('asset-docs')
                        .upload(fileName, file);

                    if (error) throw error;

                    const { data: { publicUrl } } = supabase.storage
                        .from('asset-docs')
                        .getPublicUrl(fileName);

                    uploadedImages.push(publicUrl);
                }
            }

            // 2. Upload Legal Documents
            const uploadedDocs = [];
            if (legalDocs.length > 0) {
                setUploading(true);
                for (const file of legalDocs) {
                    const fileName = `docs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                    const { data, error } = await supabase.storage
                        .from('asset-docs')
                        .upload(fileName, file);

                    if (error) throw error;

                    const { data: { publicUrl } } = supabase.storage
                        .from('asset-docs')
                        .getPublicUrl(fileName);

                    uploadedDocs.push({
                        title: file.name,
                        path: data.path,
                        url: publicUrl,
                        type: 'legal_document'
                    });
                }
                setUploading(false);
            }

            // 3. Prepare Metadata
            const typeSpecificData = {};
            if (formData.asset_category === 'real_estate') {
                if (formData.gla) typeSpecificData.gla = formData.gla;
                if (formData.annual_yield) typeSpecificData.annual_yield = formData.annual_yield;
            } else if (formData.asset_category === 'fixed_income') {
                if (formData.maturity_date) typeSpecificData.maturity_date = formData.maturity_date;
                if (formData.coupon_rate) typeSpecificData.coupon_rate = formData.coupon_rate;
                if (formData.payment_frequency) typeSpecificData.payment_frequency = formData.payment_frequency;
            } else if (formData.asset_category === 'commodities' || formData.asset_category === 'luxury_assets') {
                if (formData.serial_number) typeSpecificData.serial_number = formData.serial_number;
            } else if (formData.asset_category === 'trade_finance' || formData.asset_category === 'intangibles') {
                if (formData.contract_details) typeSpecificData.contract_details = formData.contract_details;
            }

            // 4. Insert Asset
            const { error: insertError } = await supabase
                .from('assets')
                .insert([{
                    entity_id: entityId,
                    issuer_address: walletAddress,
                    asset_name: formData.asset_name,
                    asset_category: formData.asset_category,
                    description: formData.description,

                    issuing_spv: formData.issuing_spv,
                    asset_jurisdiction: formData.asset_jurisdiction,

                    total_value: formData.total_value || null,
                    currency: 'RLUSD',

                    valuation_date: formData.valuation_date || null,
                    appraiser_name: formData.appraiser_name,

                    asset_metadata: typeSpecificData,
                    legal_documents: uploadedDocs,
                    image_uris: uploadedImages,

                    status: 'draft'
                }]);

            if (insertError) throw insertError;

            // Reset
            setIsCreating(false);
            setLegalDocs([]);
            setAssetImages([]);
            setFormData({
                asset_name: '', asset_category: 'real_estate', description: '',
                issuing_spv: '', asset_jurisdiction: 'Singapore',
                total_value: '',
                valuation_date: '', appraiser_name: '',
                gla: '', annual_yield: '', maturity_date: '', coupon_rate: '', payment_frequency: 'Quarterly',
                serial_number: '', contract_details: ''
            });
            loadAssets();
            alert('Asset Submitted for Authorization');

        } catch (error) {
            console.error('Failed to create asset:', error);
            alert('Failed to create asset: ' + error.message);
        } finally {
            setCreating(false);
            setUploading(false);
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
                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Section 1: Core Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Asset Name</label>
                            <input type="text" name="asset_name" value={formData.asset_name} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white" placeholder="e.g. Marina Bay Sands Tower 3" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                            <select name="asset_category" value={formData.asset_category} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white">
                                <option value="real_estate">Real Estate - Land title, house, or commercial unit</option>
                                <option value="fixed_income">Fixed Income - Corporate bond or private loan</option>
                                <option value="commodities">Commodities - Gold bar or carbon credits</option>
                                <option value="luxury_assets">Luxury Assets - Watch, art, or rare vehicle</option>
                                <option value="trade_finance">Trade Finance - Invoice or bill of lading</option>
                                <option value="intangibles">Intangibles - Patent, royalty, or software license</option>
                            </select>
                        </div>
                    </div>

                    {/* Section 2: Asset Images & Legal Documents */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="text-sm font-bold text-blue-300 mb-4 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Asset Images & Legal Documents
                            <span className="text-red-400 text-xs">*Required</span>
                        </h4>

                        {/* Asset Images */}
                        <div className="mb-4">
                            <label className="block text-xs text-slate-400 mb-2">
                                Asset Images (Photos of the asset) <span className="text-red-400">*</span>
                            </label>
                            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:bg-slate-900/80 transition-colors">
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" id="biz-asset-images" />
                                <label htmlFor="biz-asset-images" className="cursor-pointer">
                                    <ImageIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                    <p className="text-sm text-slate-300">{assetImages.length > 0 ? `${assetImages.length} image(s) selected` : "Upload photos of the asset"}</p>
                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG, or WebP accepted</p>
                                </label>
                            </div>
                        </div>

                        {/* Legal Documents */}
                        <div className="grid md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                    Issuing SPV Name <span className="text-red-400">*</span>
                                </label>
                                <input type="text" name="issuing_spv" value={formData.issuing_spv} onChange={handleInputChange} placeholder="e.g. ZeroGate RE Fund I Pte Ltd" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" required />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Jurisdiction</label>
                                <input type="text" name="asset_jurisdiction" value={formData.asset_jurisdiction} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                            </div>
                        </div>
                        <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:bg-slate-900/80 transition-colors">
                            <input type="file" multiple onChange={handleFileChange} className="hidden" id="biz-legal-docs" accept=".pdf,.doc,.docx" />
                            <label htmlFor="biz-legal-docs" className="cursor-pointer">
                                <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                                <p className="text-sm text-slate-300">
                                    {legalDocs.length > 0 ? `${legalDocs.length} document(s) selected` : "Upload Title Deeds, Legal Opinions, Contracts, etc."}
                                    <span className="text-red-400 ml-1">*Required</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX accepted</p>
                            </label>
                        </div>
                    </div>

                    {/* Section 3: Valuation & Audit */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <h4 className="text-sm font-bold text-green-300 mb-4 flex items-center gap-2"><Coins className="w-4 h-4" /> Asset Valuation (RLUSD)</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Total Asset Value</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            name="total_value"
                                            value={formData.total_value}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white pr-16"
                                            placeholder="5000000"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-500">RLUSD</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <h4 className="text-sm font-bold text-yellow-300 mb-4 flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" /> Asset-Specific Details
                                <span className="text-red-400 text-xs">*Required</span>
                            </h4>
                            {formData.asset_category === 'real_estate' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">GLA (Sq Ft)</label>
                                        <input type="number" name="gla" value={formData.gla} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="5000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Est. Annual Yield (%)</label>
                                        <input type="number" step="0.01" name="annual_yield" value={formData.annual_yield} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="4.5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Appraiser Name</label>
                                        <input type="text" name="appraiser_name" value={formData.appraiser_name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="e.g. Cushman & Wakefield" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Valuation Date</label>
                                        <input type="date" name="valuation_date" value={formData.valuation_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                                    </div>
                                </div>
                            )}
                            {formData.asset_category === 'fixed_income' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Maturity Date</label>
                                        <input type="date" name="maturity_date" value={formData.maturity_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Coupon Rate (%)</label>
                                        <input type="number" step="0.01" name="coupon_rate" value={formData.coupon_rate} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="5.5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Payment Frequency</label>
                                        <select name="payment_frequency" value={formData.payment_frequency} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white">
                                            <option value="Monthly">Monthly</option>
                                            <option value="Quarterly">Quarterly</option>
                                            <option value="Semi-Annual">Semi-Annual</option>
                                            <option value="Annual">Annual</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            {(formData.asset_category === 'commodities' || formData.asset_category === 'luxury_assets') && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Serial Number / Identifier</label>
                                        <input type="text" name="serial_number" value={formData.serial_number} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="e.g. SN-123456 or VIN-ABC789" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Appraiser / Certifier</label>
                                        <input type="text" name="appraiser_name" value={formData.appraiser_name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="e.g. Christie's or SGS" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Valuation Date</label>
                                        <input type="date" name="valuation_date" value={formData.valuation_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                                    </div>
                                </div>
                            )}
                            {(formData.asset_category === 'trade_finance' || formData.asset_category === 'intangibles') && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Contract / Agreement Details</label>
                                        <textarea name="contract_details" value={formData.contract_details} onChange={handleInputChange} rows="3" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="Brief description of the contract, invoice, patent, or license agreement"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Maturity / Expiry Date</label>
                                        <input type="date" name="maturity_date" value={formData.maturity_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white" placeholder="Describe the asset..." />
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
                        <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2 text-slate-300 hover:text-white font-medium transition-colors">Cancel</button>
                        <button type="submit" disabled={creating} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {uploading ? 'Uploading Docs...' : 'Submit Asset'}
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
                <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Asset
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                    <div key={asset.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-colors group">
                        <div className="h-48 bg-slate-900 relative overflow-hidden">
                            {asset.image_uris && asset.image_uris.length > 0 ? (
                                <img
                                    src={asset.image_uris[0]}
                                    alt={asset.asset_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col justify-center items-center">
                                    <Building2 className="w-12 h-12 text-slate-700 mb-2" />
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">{asset.issuing_spv || 'No SPV'}</span>
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

                            <div className="flex justify-between items-center text-sm mb-4">
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

                            {/* Burn Button */}
                            <button
                                onClick={() => handleBurnAsset(asset.id, asset.asset_name)}
                                className="w-full mt-2 px-4 py-2 bg-red-600/10 hover:bg-red-600 border border-red-600 text-red-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm group"
                            >
                                <Flame className="w-4 h-4 group-hover:animate-pulse" />
                                Burn Asset
                            </button>
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
