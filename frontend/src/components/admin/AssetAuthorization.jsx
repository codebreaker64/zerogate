import { Building, CheckCircle, ExternalLink, FileText, Loader2, Shield, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

const AssetAuthorization = ({ onUpdate, wallet }) => {
    const [assets, setAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPendingAssets();
    }, []);

    const fetchPendingAssets = async () => {
        try {
            const { data, error } = await supabase
                .from('assets')
                .select(`*`)
                .eq('status', 'draft') // Focus on Drafts submitted by Business
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data || []);
            // Select first if available
            if (data && data.length > 0 && !selectedAsset) {
                setSelectedAsset(data[0]);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedAsset) return;
        if (!confirm(`Authorize minting for ${selectedAsset.asset_name}?`)) return;

        setProcessing(true);
        try {
            const { error } = await supabase.functions.invoke('admin-action', {
                body: {
                    action: 'approve_asset',
                    assetId: selectedAsset.id
                }
            });

            if (error) throw error;

            alert('Asset Authorized Successfully');
            fetchPendingAssets();
            setSelectedAsset(null);
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error('Approval failed:', error);
            alert('Approval failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedAsset) return;
        const reason = prompt('Enter rejection reason for the business:');
        if (!reason) return;

        setProcessing(true);
        try {
            const { error } = await supabase.functions.invoke('admin-action', {
                body: {
                    action: 'reject_asset',
                    assetId: selectedAsset.id,
                    reason: reason
                }
            });

            if (error) throw error;

            alert('Asset Rejected');
            fetchPendingAssets();
            setSelectedAsset(null);
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error('Rejection failed:', error);
            alert('Rejection failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Asset Authorization Desk</h2>
                <p className="text-slate-400">Review and authorize RWA assets for tokenization</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Column */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Pending Review ({assets.length})</h3>

                    {assets.length === 0 ? (
                        <div className="bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-slate-400">All caught up!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assets.map(asset => (
                                <button
                                    key={asset.id}
                                    onClick={() => setSelectedAsset(asset)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedAsset?.id === asset.id
                                        ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${asset.asset_category === 'real_estate' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {asset.asset_category?.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(asset.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-white truncate">{asset.asset_name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{asset.entities?.company_name}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Column */}
                <div className="lg:col-span-2">
                    {selectedAsset ? (
                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedAsset.asset_name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Building className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-300">{selectedAsset.entities?.company_name}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-sm text-slate-400">SPV: {selectedAsset.issuing_spv || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-slate-900 px-4 py-2 rounded border border-slate-700">
                                        <span className="text-xs text-slate-400 block mb-1">Valuation</span>
                                        <span className="text-xl font-bold text-white">{Number(selectedAsset.total_value).toLocaleString()} <span className="text-purple-400">RLUSD</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Legal & Audit */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> Legal & Audit
                                        </h3>
                                        <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg h-full">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Jurisdiction</span>
                                                <span className="text-sm text-white">{selectedAsset.asset_jurisdiction}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Appraiser</span>
                                                <span className="text-sm text-white">{selectedAsset.appraiser_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Valuation Date</span>
                                                <span className="text-sm text-white">{selectedAsset.valuation_date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Asset Specifics
                                        </h3>
                                        <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg h-full">
                                            {selectedAsset.asset_metadata && Object.entries(selectedAsset.asset_metadata).map(([key, value]) => (
                                                <div key={key} className="flex justify-between">
                                                    <span className="text-sm text-slate-400 capitalize">{key.replace('_', ' ')}</span>
                                                    <span className="text-sm text-white font-mono">{value}</span>
                                                </div>
                                            ))}
                                            {(!selectedAsset.asset_metadata || Object.keys(selectedAsset.asset_metadata).length === 0) && (
                                                <p className="text-xs text-slate-500 italic">No specific metadata provided.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Documentation
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedAsset.legal_documents && Array.isArray(selectedAsset.legal_documents) && selectedAsset.legal_documents.map((doc, i) => (
                                            <a
                                                key={i}
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                                                    <ExternalLink className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                                                    <p className="text-xs text-slate-400">View Document</p>
                                                </div>
                                            </a>
                                        ))}
                                        {(!selectedAsset.legal_documents || selectedAsset.legal_documents.length === 0) && (
                                            <p className="text-sm text-slate-500 italic col-span-2 text-center py-4 bg-slate-900/30 rounded border border-dashed border-slate-700">No documents uploaded</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-900 rounded-lg">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed">{selectedAsset.description}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={processing || !wallet}
                                    title={!wallet ? "Connect Provider Wallet to Reject" : ""}
                                    className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject Asset
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={processing || !wallet}
                                    title={!wallet ? "Connect Provider Wallet to Authorize & Mint" : ""}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Authorize & Mint
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 rounded-xl border border-dashed border-slate-700 p-12 text-center h-full flex flex-col items-center justify-center">
                            <Building className="w-16 h-16 text-slate-700 mb-4" />
                            <p className="text-slate-500 text-lg">Select an asset from the list to review details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetAuthorization;
