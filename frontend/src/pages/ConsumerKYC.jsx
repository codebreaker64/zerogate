import { Loader2, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWalletUser } from '../utils/siwx';
import { submitConsumerKYC } from '../utils/supabase';

const ConsumerKYC = () => {
    const [form, setForm] = useState({
        full_name: '',
        date_of_birth: '',
        country: '',
        id_type: '',
        id_number: '',
        document_url: '',
        selfie_url: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('not_started');
    const navigate = useNavigate();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    useEffect(() => {
        if (!walletAddress) {
            navigate('/investor/login');
            return;
        }

        const load = async () => {
            const user = await getCurrentWalletUser();
            if (user?.kyc_status) {
                setStatus(user.kyc_status);
            }
        };

        load();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await submitConsumerKYC(form);
            setStatus('pending');
            navigate('/investor/dashboard');
        } catch (err) {
            alert(err.message || 'Failed to submit KYC');
        } finally {
            setSubmitting(false);
        }
    };

    const isLocked = status === 'pending' || status === 'under_review' || status === 'approved';
    const readableStatus = (status || 'not_started').replace(/_/g, ' ');

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-3xl bg-slate-800/70 border border-slate-700 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <ShieldQuestion className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-400">Step 1</p>
                            <h1 className="text-2xl font-bold">Complete your KYC</h1>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${isLocked ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-slate-700 text-slate-200 border-slate-600'}`}>
                        Status: {readableStatus}
                    </div>
                </div>

                <p className="text-slate-400 text-sm mb-8">
                    Provide your personal information to meet compliance requirements. Document URLs are placeholders—replace with your uploader when ready.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Full Name</label>
                            <input
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Date of Birth</label>
                            <input
                                name="date_of_birth"
                                type="date"
                                value={form.date_of_birth}
                                onChange={handleChange}
                                required
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Country</label>
                            <input
                                name="country"
                                value={form.country}
                                onChange={handleChange}
                                required
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">ID Type</label>
                            <input
                                name="id_type"
                                value={form.id_type}
                                onChange={handleChange}
                                required
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                                placeholder="Passport / National ID"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">ID Number</label>
                            <input
                                name="id_number"
                                value={form.id_number}
                                onChange={handleChange}
                                required
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Document URL</label>
                            <input
                                name="document_url"
                                value={form.document_url}
                                onChange={handleChange}
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Selfie URL</label>
                            <input
                                name="selfie_url"
                                value={form.selfie_url}
                                onChange={handleChange}
                                disabled={isLocked}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || isLocked}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Submit KYC
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConsumerKYC;
