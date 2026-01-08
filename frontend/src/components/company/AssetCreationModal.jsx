import { AlertCircle, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { getAssetSchema, getRequiredDocuments, validateMetadata } from '../utils/metadataSchemas';
import { supabase } from '../utils/supabase';

const AssetCreationModal = ({ isOpen, onClose, onSuccess, entityId, issuerAddress }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [basicInfo, setBasicInfo] = useState({
        assetName: '',
        category: '',
        description: '',
        totalValue: '',
        currency: 'USD',
        minInvestment: '',
        imageUri: ''
    });

    const [assetMetadata, setAssetMetadata] = useState({});
    const [legalDocuments, setLegalDocuments] = useState([]);

    const assetCategories = [
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'fixed_income', label: 'Fixed Income (Bonds)' },
        { value: 'carbon_credits', label: 'Carbon Credits' },
        { value: 'commodities', label: 'Commodities' }
    ];

    const handleCategoryChange = (category) => {
        setBasicInfo({ ...basicInfo, category });

        // Initialize metadata template for selected category
        const schema = getAssetSchema(category);
        if (schema) {
            setAssetMetadata(schema.metadataTemplate);
        }
    };

    const handleMetadataChange = (field, value) => {
        setAssetMetadata({
            ...assetMetadata,
            [field]: value
        });
    };

    const handleAddDocument = () => {
        setLegalDocuments([
            ...legalDocuments,
            { name: '', uri: '', hash: '', type: '' }
        ]);
    };

    const handleDocumentChange = (index, field, value) => {
        const updated = [...legalDocuments];
        updated[index][field] = value;
        setLegalDocuments(updated);
    };

    const handleRemoveDocument = (index) => {
        setLegalDocuments(legalDocuments.filter((_, i) => i !== index));
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        setError('');

        try {
            const { data, error: saveError } = await supabase
                .from('assets')
                .insert({
                    entity_id: entityId,
                    issuer_address: issuerAddress,
                    asset_name: basicInfo.assetName,
                    asset_category: basicInfo.category,
                    description: basicInfo.description,
                    total_value: parseFloat(basicInfo.totalValue),
                    currency: basicInfo.currency,
                    min_investment: parseFloat(basicInfo.minInvestment),
                    image_uri: basicInfo.imageUri,
                    asset_metadata: assetMetadata,
                    legal_documents: legalDocuments,
                    status: 'draft'
                })
                .select()
                .single();

            if (saveError) throw saveError;

            onSuccess(data);
            onClose();
        } catch (err) {
            console.error('Error saving draft:', err);
            setError(err.message || 'Failed to save draft');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        setLoading(true);
        setError('');

        try {
            // Validate metadata
            const validation = validateMetadata(basicInfo.category, assetMetadata);
            if (!validation.valid) {
                setError('Missing required fields: ' + validation.errors.join(', '));
                setLoading(false);
                return;
            }

            // Save asset as draft first
            const { data: asset, error: saveError } = await supabase
                .from('assets')
                .insert({
                    entity_id: entityId,
                    issuer_address: issuerAddress,
                    asset_name: basicInfo.assetName,
                    asset_category: basicInfo.category,
                    description: basicInfo.description,
                    total_value: parseFloat(basicInfo.totalValue),
                    currency: basicInfo.currency,
                    min_investment: parseFloat(basicInfo.minInvestment),
                    image_uri: basicInfo.imageUri,
                    asset_metadata: assetMetadata,
                    legal_documents: legalDocuments,
                    status: 'draft'
                })
                .select()
                .single();

            if (saveError) throw saveError;

            // Submit for review
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${supabaseUrl}/functions/v1/asset-workflow`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'submit_for_review',
                        assetId: asset.id
                    })
                }
            );

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            onSuccess(result.asset);
            onClose();
        } catch (err) {
            console.error('Error submitting asset:', err);
            setError(err.message || 'Failed to submit asset');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const schema = getAssetSchema(basicInfo.category);
    const requiredDocuments = getRequiredDocuments(basicInfo.category);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Add New RWA Asset</h2>
                        <p className="text-sm text-slate-400 mt-1">Step {step} of 3</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mb-8">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {s}
                                </div>
                                {s < 3 && (
                                    <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-purple-600' : 'bg-slate-700'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Basic Information */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Asset Name *
                                </label>
                                <input
                                    type="text"
                                    value={basicInfo.assetName}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, assetName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Marina Bay Office Tower"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Asset Category *
                                </label>
                                <select
                                    value={basicInfo.category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">Select category...</option>
                                    {assetCategories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={basicInfo.description}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Describe the asset..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Total Value *
                                    </label>
                                    <input
                                        type="number"
                                        value={basicInfo.totalValue}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, totalValue: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                        placeholder="50000000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Minimum Investment
                                    </label>
                                    <input
                                        type="number"
                                        value={basicInfo.minInvestment}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, minInvestment: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                        placeholder="100000"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!basicInfo.assetName || !basicInfo.category || !basicInfo.totalValue}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue to Asset Details
                            </button>
                        </div>
                    )}

                    {/* Step 2: Asset-Specific Metadata */}
                    {step === 2 && schema && (
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                <p className="text-sm text-slate-300">
                                    <strong>Category:</strong> {basicInfo.category.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Please provide the following information specific to this asset type.
                                </p>
                            </div>

                            {schema.requiredFields.map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} *
                                    </label>
                                    <input
                                        type={field.includes('date') ? 'date' : field.includes('rate') || field.includes('value') || field.includes('area') ? 'number' : 'text'}
                                        value={assetMetadata[field] || ''}
                                        onChange={(e) => handleMetadataChange(field, e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            ))}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all"
                                >
                                    Continue to Documents
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Legal Documents */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <p className="text-sm text-blue-300 font-semibold">Required Documents</p>
                                <ul className="mt-2 space-y-1">
                                    {requiredDocuments.map((doc, i) => (
                                        <li key={i} className="text-xs text-blue-200 flex items-start gap-2">
                                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span><strong>{doc.name}:</strong> {doc.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {legalDocuments.map((doc, index) => (
                                <div key={index} className="border border-slate-700 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-white">Document {index + 1}</h4>
                                        <button
                                            onClick={() => handleRemoveDocument(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={doc.name}
                                        onChange={(e) => handleDocumentChange(index, 'name', e.target.value)}
                                        placeholder="Document Name"
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    />

                                    <input
                                        type="text"
                                        value={doc.uri}
                                        onChange={(e) => handleDocumentChange(index, 'uri', e.target.value)}
                                        placeholder="IPFS URI (e.g., ipfs://QmExample...)"
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    />

                                    <input
                                        type="text"
                                        value={doc.hash}
                                        onChange={(e) => handleDocumentChange(index, 'hash', e.target.value)}
                                        placeholder="Document Hash (SHA-256)"
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    />

                                    <select
                                        value={doc.type}
                                        onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Document Type...</option>
                                        {requiredDocuments.map(reqDoc => (
                                            <option key={reqDoc.type} value={reqDoc.type}>{reqDoc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            <button
                                onClick={handleAddDocument}
                                className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-lg text-slate-400 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload className="w-5 h-5" />
                                Add Document
                            </button>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold text-white transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save as Draft'}
                                </button>
                                <button
                                    onClick={handleSubmitForReview}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        'Submitting...'
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Submit for Review
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetCreationModal;
