import { Building2, CheckCircle, Clock, ExternalLink, FileText, Loader2, Shield, User, Wallet, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getKYBApplications, getUserKYCApplications, supabase, updateKYBApplicationStatus, updateUserKYCStatus } from '../../utils/supabase';

const KYBReviewDesk = ({ onUpdate, wallet }) => {
    const [applications, setApplications] = useState([]);
    const [kycApplications, setKycApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

    useEffect(() => {
        loadApplications();
    }, [filter]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const [kybApps, kycApps] = await Promise.all([
                getKYBApplications(),
                getUserKYCApplications()
            ]);

            const applyFilter = (list) => filter === 'all' ? list : list.filter(app => app.status === filter);

            setApplications(applyFilter(kybApps));
            setKycApplications(applyFilter(kycApps));
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (application) => {
        if (!wallet) {
            alert('Please connect your Provider Wallet to authorize this action.');
            return;
        }
        if (!confirm(`APPROVE ${application.legal_entity_name}?\n\nWARNING: this will issue a credential and PERMANENTLY PURGE sensitive business data from the database.`)) {
            return;
        }

        setProcessing(application.id);
        try {
            // Call backend Edge Function to Issue Credential & Purge Data
            const { data, error } = await supabase.functions.invoke('admin-action', {
                body: {
                    action: 'approve_kyb',
                    applicationId: application.id,
                    entityId: application.entity_id,
                    issuerAddress: wallet.address
                }
            });

            if (error) throw new Error(error.message);
            if (data.error) throw new Error(data.error);

            await loadApplications();
            if (onUpdate) onUpdate();

            alert(`✅ ${application.legal_entity_name} Approved.\nCredential Issued & Data Purged.`);
        } catch (error) {
            console.error('Approval failed:', error);
            alert(`Failed to approve: ${error.message}`);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (application) => {
        if (!wallet) {
            alert('Please connect your Provider Wallet to authorize this action.');
            return;
        }
        const reason = prompt('Reason for rejection:');
        if (!reason) return;

        setProcessing(application.id);
        try {
            await updateKYBApplicationStatus(application.id, 'rejected', {
                rejected_at: new Date().toISOString(),
                rejection_reason: reason
            });

            await loadApplications();
            if (onUpdate) onUpdate();

            alert(`❌ ${application.legal_entity_name} rejected.`);
        } catch (error) {
            console.error('Rejection failed:', error);
            alert(`Failed to reject: ${error.message}`);
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Clock, label: 'Pending Review' },
            approved: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle, label: 'Approved' },
            rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle, label: 'Rejected' },
            verified: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: CheckCircle, label: 'Verified' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                <Icon className="w-4 h-4" />
                {badge.label}
            </span>
        );
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">KYB / KYC Review Desk</h2>
                    <p className="text-slate-400 mt-1">Review and approve business and individual verification applications</p>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${filter === f
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Business KYB Applications */}
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">Corporate</p>
                        <h3 className="text-xl font-bold text-white">Business KYB Applications</h3>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
                        <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">No applications found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map(app => (
                            <div key={app.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-purple-500/50 transition-all">
                                <div className="flex items-start justify-between">
                                    {/* Company Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                                                <Building2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-white mb-1">{app.legal_entity_name || 'Company Name'}</h3>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(app.status)}
                                                    <span className="text-xs text-slate-500">
                                                        Applied: {new Date(app.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Business Reg #</p>
                                                <p className="font-mono text-sm text-slate-300">{app.business_reg_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Business Type</p>
                                                <p className="text-sm text-slate-300">{app.business_type || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Incorporation Date</p>
                                                <p className="text-sm text-slate-300">
                                                    {app.incorporation_date ? new Date(app.incorporation_date).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Director Wallet */}
                                        <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg mb-4">
                                            <Wallet className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <p className="text-xs text-slate-500">Director's Wallet</p>
                                                <p className="font-mono text-sm text-purple-300">{app.director_wallet_address}</p>
                                            </div>
                                            <a
                                                href={`https://testnet.xrpl.org/accounts/${app.director_wallet_address}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto text-blue-400 hover:text-blue-300"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>

                                        {/* Registered Address */}
                                        {app.registered_address && (
                                            <div className="mb-4">
                                                <p className="text-xs text-slate-500 mb-1">Registered Address</p>
                                                <p className="text-sm text-slate-300">{app.registered_address}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {app.status === 'pending' && (
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                onClick={() => handleApprove(app)}
                                                disabled={processing === app.id || !wallet}
                                                title={!wallet ? "Connect Provider Wallet to Approve" : ""}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {processing === app.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                Approve & Issue
                                            </button>
                                            <button
                                                onClick={() => handleReject(app)}
                                                disabled={processing === app.id || !wallet}
                                                title={!wallet ? "Connect Provider Wallet to Reject" : ""}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                            {!wallet && (
                                                <p className="text-[10px] text-red-400 text-center mt-1">
                                                    Wallet Required
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* User KYC Applications */}
            <section className="space-y-4 mt-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">Individual</p>
                        <h3 className="text-xl font-bold text-white">User KYC Applications</h3>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                ) : kycApplications.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
                        <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">No user KYC submissions found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {kycApplications.map(app => (
                            <div key={app.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500/50 transition-all">
                                <div className="flex items-start justify-between">
                                    {/* Applicant Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-white mb-1">{app.full_name || 'Applicant'}</h3>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(app.status)}
                                                    <span className="text-xs text-slate-500">
                                                        Submitted: {new Date(app.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Country</p>
                                                <p className="text-sm text-slate-300">{app.country || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">ID Type</p>
                                                <p className="text-sm text-slate-300">{app.id_type || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">ID Number</p>
                                                <p className="text-sm text-slate-300">{app.id_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Date of Birth</p>
                                                <p className="text-sm text-slate-300">{app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Wallet</p>
                                                <p className="font-mono text-sm text-purple-300 break-all">{app.wallet_address || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Document URL</p>
                                                <a
                                                    href={app.document_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-sm ${app.document_url ? 'text-blue-400 hover:text-blue-300' : 'text-slate-500 pointer-events-none'}`}
                                                >
                                                    {app.document_url || 'Not provided'}
                                                </a>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Selfie URL</p>
                                                <a
                                                    href={app.selfie_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-sm ${app.selfie_url ? 'text-blue-400 hover:text-blue-300' : 'text-slate-500 pointer-events-none'}`}
                                                >
                                                    {app.selfie_url || 'Not provided'}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions placeholder */}
                                    {app.status === 'pending' && (
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                onClick={async () => {
                                                    if (!wallet) {
                                                        alert('Connect Provider Wallet to review KYC.');
                                                        return;
                                                    }
                                                    setProcessing(app.id);
                                                    try {
                                                        await updateUserKYCStatus(app.id, 'approved');
                                                        await loadApplications();
                                                        if (onUpdate) onUpdate();
                                                    } catch (error) {
                                                        console.error('KYC approval failed:', error);
                                                        alert(`Failed to approve KYC: ${error.message}`);
                                                    } finally {
                                                        setProcessing(null);
                                                    }
                                                }}
                                                disabled={processing === app.id || !wallet}
                                                title={!wallet ? 'Connect Provider Wallet to Approve' : ''}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {processing === app.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const reason = prompt('Reason for rejection:');
                                                    if (!reason) return;
                                                    setProcessing(app.id);
                                                    try {
                                                        await updateUserKYCStatus(app.id, 'rejected', {
                                                            rejection_reason: reason,
                                                            rejected_at: new Date().toISOString()
                                                        });
                                                        await loadApplications();
                                                        if (onUpdate) onUpdate();
                                                    } catch (error) {
                                                        console.error('KYC rejection failed:', error);
                                                        alert(`Failed to reject KYC: ${error.message}`);
                                                    } finally {
                                                        setProcessing(null);
                                                    }
                                                }}
                                                disabled={processing === app.id || !wallet}
                                                title={!wallet ? 'Connect Provider Wallet to Reject' : ''}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                            {!wallet && (
                                                <p className="text-[10px] text-red-400 text-center mt-1">
                                                    Wallet Required
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default KYBReviewDesk;
