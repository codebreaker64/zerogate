import { ChevronDown, ChevronUp, Copy, FileText, Loader2, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getIssuedCredentials, supabase } from '../../utils/supabase';

const CredentialManager = ({ onUpdate }) => {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const data = await getIssuedCredentials();
            setCredentials(data);
        } catch (error) {
            console.error('Failed to load credentials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (cred) => {
        if (!confirm(`Are you sure you want to REVOKE access for ${cred.entities?.company_name}? This will delete all entity data.`)) {
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('admin-action', {
                body: {
                    action: 'revoke_credential',
                    credentialId: cred.id,
                    entityId: cred.entity_id,
                    targetWalletAddress: cred.wallet_address
                }
            });

            if (error) throw error;

            alert('Credential Revoked successfully.');
            loadCredentials();
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error('Revoke failed:', error);
            alert('Revoke failed: ' + error.message);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Credential Manager</h2>
                    <p className="text-slate-400 mt-1">Registry of all issued XLS-70d credentials</p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-sm">Total Issued: </span>
                    <span className="text-white font-bold ml-2">{credentials.length}</span>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
            ) : credentials.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
                    <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No credentials issued yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {credentials.map(cred => (
                        <div key={cred.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden group hover:border-purple-500/50 transition-all">
                            <div className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-400">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white text-lg">
                                            {cred.entities?.company_name || 'Unknown Entity'}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cred.status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {cred.status?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {cred.credential_type}
                                        </span>
                                        <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded">
                                            {cred.wallet_address}
                                        </span>
                                        <span>
                                            Issued: {new Date(cred.issued_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleExpand(cred.id)}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    {expandedId === cred.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevoke(cred);
                                    }}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 ml-2"
                                    title="Revoke Credential"
                                >
                                    Revoke
                                </button>
                            </div>

                            {/* Expanded Metadata View */}
                            {expandedId === cred.id && (
                                <div className="bg-slate-900/50 p-6 border-t border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-slate-300">XLS-70d Credential Metadata</h4>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(cred.credential_metadata, null, 2))}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Copy className="w-3 h-3" /> Copy JSON
                                        </button>
                                    </div>
                                    <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs font-mono text-green-400">
                                        {JSON.stringify(cred.credential_metadata, null, 2) || '{}'}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    );
};

export default CredentialManager;
