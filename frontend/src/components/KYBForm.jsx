import React, { useState } from 'react';
import { Building2, FileText, User, Wallet, CheckCircle, AlertCircle } from 'lucide-react';

const KYBForm = ({ walletAddress, onSubmit }) => {
    const [formData, setFormData] = useState({
        legalEntityName: '',
        businessRegNumber: '',
        directorWalletAddress: walletAddress || '',
        incorporationDate: '',
        businessType: '',
        registeredAddress: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Simulate submission
        setTimeout(() => {
            setSubmitted(true);
            setSubmitting(false);
            if (onSubmit) {
                onSubmit(formData);
            }
        }, 1500);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl">
                <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Application Submitted!</h3>
                    <p className="text-slate-300 mb-6">
                        Your KYB application has been submitted for review. Our compliance team will verify your corporate credentials.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-left">
                        <p className="text-sm text-slate-400">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                            <li>Compliance review (typically 24-48 hours)</li>
                            <li>Corporate credential issuance on-chain</li>
                            <li>You'll be notified to claim your credential badge</li>
                            <li>Once claimed, you can mint RWA tokens</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <Building2 className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Corporate KYB Application</h2>
                <p className="text-slate-400">
                    Complete your Know Your Business verification to access institutional-grade RWA tokens
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
                {/* Legal Entity Name */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        Legal Entity Name *
                    </label>
                    <input
                        type="text"
                        name="legalEntityName"
                        value={formData.legalEntityName}
                        onChange={handleChange}
                        required
                        placeholder="e.g., Acme Real Estate Pte Ltd"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>

                {/* Business Registration Number */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        <FileText className="w-4 h-4 inline mr-2" />
                        UEN / Business Registration Number *
                    </label>
                    <input
                        type="text"
                        name="businessRegNumber"
                        value={formData.businessRegNumber}
                        onChange={handleChange}
                        required
                        placeholder="e.g., 202012345A"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>

                {/* Director's Wallet Address */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        <Wallet className="w-4 h-4 inline mr-2" />
                        Authorized Director's Wallet Address *
                    </label>
                    <input
                        type="text"
                        name="directorWalletAddress"
                        value={formData.directorWalletAddress}
                        onChange={handleChange}
                        required
                        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        This wallet will receive the corporate credential and authorization to mint RWA tokens
                    </p>
                </div>

                {/* Business Type */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Business Type *
                    </label>
                    <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                        <option value="">Select business type</option>
                        <option value="real-estate">Real Estate Investment</option>
                        <option value="private-equity">Private Equity Fund</option>
                        <option value="venture-capital">Venture Capital</option>
                        <option value="asset-management">Asset Management</option>
                        <option value="family-office">Family Office</option>
                        <option value="other">Other Financial Institution</option>
                    </select>
                </div>

                {/* Incorporation Date */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Date of Incorporation *
                    </label>
                    <input
                        type="date"
                        name="incorporationDate"
                        value={formData.incorporationDate}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>

                {/* Registered Address */}
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Registered Business Address *
                    </label>
                    <textarea
                        name="registeredAddress"
                        value={formData.registeredAddress}
                        onChange={handleChange}
                        required
                        rows="3"
                        placeholder="Enter complete registered address"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-300 mb-1">B2B Credential Issuance</p>
                            <p className="text-xs text-slate-300">
                                Upon approval, a corporate credential will be issued on-chain using XLS-70d standard.
                                You'll need to accept this credential in your wallet to complete the DID handshake.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting Application...
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            Submit KYB Application
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default KYBForm;
