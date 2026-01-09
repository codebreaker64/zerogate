import { Calendar, CheckCircle, FileText, Globe, Hash, Loader2, ShieldCheck, ShieldQuestion, Upload, User, X } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';
import { getCurrentWalletUser } from '../utils/siwx';
import { getMyKYCApplication, submitUserKYC, supabase } from '../utils/supabase';

// Reusable Image Upload Component
const ImageUploadField = ({ label, value, onChange, disabled, placeholder }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files[0];
        if (file) await handleUpload(file);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) await handleUpload(file);
    };

    const handleUpload = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG)');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            // Match BusinessDashboard file naming convention: images/timestamp_name
            const fileName = `images/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

            // Upload to 'asset-docs' bucket as requested (simulating standard storage)
            const { data, error: uploadError } = await supabase.storage
                .from('asset-docs')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL (matching BusinessDashboard logic)
            const { data: { publicUrl } } = supabase.storage
                .from('asset-docs')
                .getPublicUrl(fileName);

            // Return object with details needed for documents JSONB
            onChange({
                url: publicUrl,
                path: data.path,
                name: file.name
            });
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const clearImage = (e) => {
        e.stopPropagation();
        if (!disabled) onChange(null);
    };

    const displayUrl = value?.url || value; // Handle simple string (legacy) or object

    return (
        <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                {label}
            </label>

            <div
                className={`relative w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden ${dragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : displayUrl
                        ? 'border-purple-500/50 bg-purple-900/10'
                        : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={disabled}
                />

                {uploading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                        <span className="text-xs text-slate-400">Uploading secure document...</span>
                    </div>
                ) : displayUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img src={displayUrl} alt="Preview" className="h-full w-auto object-contain rounded-md opacity-80" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs font-medium text-white flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Uploaded
                            </p>
                        </div>
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-red-500/80 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <Upload className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <div className="text-center px-4">
                            <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                                Click or drag to upload
                            </p>
                            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wide">
                                {placeholder || 'JPG, PNG, WEBP'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {!displayUrl && <p className="text-[10px] text-slate-500 mt-1.5 ml-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Stored in asset-docs
            </p>}
        </div>
    );
};

const UserKYC = () => {
    const [form, setForm] = useState({
        full_name: '',
        date_of_birth: '',
        country: '',
        id_type: '',
        id_number: '',
        document_data: null, // Changed from document_url string to object
        selfie_data: null    // Changed from selfie_uri string to object
    });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('not_started');
    const navigate = useNavigate();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    useEffect(() => {
        if (!walletAddress) {
            navigate('/user/login');
            return;
        }

        const load = async () => {
            const user = await getCurrentWalletUser();

            let currentStatus = 'not_started';
            if (user?.status === 'active') {
                // User is already approved, redirect to dashboard
                navigate('/user/dashboard');
                return;
            } else {
                const app = await getMyKYCApplication();
                if (app) currentStatus = app.status;
            }
            setStatus(currentStatus);
        };

        load();
    }, [navigate, walletAddress]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Updated Helper for direct object updates (from DragDrop)
    const handleValueChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Transform data to match Schema and BusinessDashboard format
            const submissionPayload = {
                full_name: form.full_name,
                date_of_birth: form.date_of_birth,
                country: form.country,
                id_type: form.id_type,
                id_number: form.id_number,

                // Extract URL string for selfie_uri (TEXT column)
                selfie_uri: form.selfie_data?.url || '',

                // Construct documents JSONB array with full metadata
                documents: form.document_data ? [{
                    title: 'ID Document', // Normalized title
                    name: form.document_data.name,
                    path: form.document_data.path,
                    url: form.document_data.url,
                    type: 'identification',
                    uploaded_at: new Date().toISOString()
                }] : []
            };

            await submitUserKYC(submissionPayload);

            // Success - navigate to dashboard to show pending verification status
            alert('✅ KYC Submitted Successfully!\n\nYour verification is now pending admin review. You will be notified once approved.');

            setTimeout(() => {
                navigate('/user/dashboard');
            }, 500);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Failed to submit KYC');
            setSubmitting(false);
        }
    };

    const isLocked = status === 'pending' || status === 'under_review' || status === 'approved';
    const readableStatus = (status || 'not_started').replace(/_/g, ' ');

    // Status badge style helper
    const getStatusStyle = (s) => {
        switch (s) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
            case 'pending':
            case 'under_review': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
            default: return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <Suspense fallback={null}>
                    <ThreeBackground />
                </Suspense>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/90 to-slate-900/95 pointer-events-none" />

            {/* Main Card */}
            <div className="w-full max-w-4xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 lg:p-10 shadow-2xl relative z-10 transition-all duration-300 hover:shadow-purple-900/10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-white/10">
                            <ShieldQuestion className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Compliance</span>
                                <span className="w-1 h-1 rounded-full bg-slate-500" />
                                <span className="text-xs font-medium text-slate-400">Step 1 of 2</span>
                            </div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Identity Verification</h1>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/30 rounded-2xl p-6 border border-slate-700/30 mb-8 flex gap-4">
                    <div className="w-1 bg-purple-500 rounded-full flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-1">Why is this required?</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            ZeroGate strictly adheres to global AML/CFT regulations. We need to verify the identity of every user before enabling Real World Asset (RWA) settlements on the XRPL. Your data is encrypted and stored securely.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        {/* Full Name */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                                Full Legal Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={handleChange}
                                    required
                                    disabled={isLocked}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                    placeholder="As shown on ID"
                                />
                            </div>
                        </div>

                        {/* DOB */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                                Date of Birth
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    name="date_of_birth"
                                    type="date"
                                    value={form.date_of_birth}
                                    onChange={handleChange}
                                    required
                                    disabled={isLocked}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                                Country of Residence
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    required
                                    disabled={isLocked}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                    placeholder="Singapore, USA, etc."
                                />
                            </div>
                        </div>

                        {/* ID Type */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                                ID Document Type
                            </label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    name="id_type"
                                    value={form.id_type}
                                    onChange={handleChange}
                                    required
                                    disabled={isLocked}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                    placeholder="Passport / National ID"
                                />
                            </div>
                        </div>

                        {/* ID Number */}
                        <div className="group md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-purple-400 transition-colors">
                                Identification Number
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    name="id_number"
                                    value={form.id_number}
                                    onChange={handleChange}
                                    required
                                    disabled={isLocked}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                    placeholder="e.g. A1234567Z"
                                />
                            </div>
                        </div>

                        {/* Links Section Divider */}
                        <div className="md:col-span-2 pt-2 pb-2">
                            <div className="h-px bg-slate-700/50 w-full" />
                        </div>

                        {/* Document Uploads using ImageUploadField */}
                        <ImageUploadField
                            label="ID Document (Passport/ID)"
                            value={form.document_data}
                            onChange={(data) => handleValueChange('document_data', data)}
                            disabled={isLocked}
                            placeholder="Upload clear photo of ID"
                        />

                        <ImageUploadField
                            label="Facial Verification (Selfie)"
                            value={form.selfie_data}
                            onChange={(data) => handleValueChange('selfie_data', data)}
                            disabled={isLocked}
                            placeholder="Upload selfie holding your ID"
                        />
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || isLocked}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            <span>Submit Verification Data</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserKYC;
