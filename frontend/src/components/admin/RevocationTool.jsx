import React from 'react';
import { AlertTriangle } from 'lucide-react';

const RevocationTool = ({ onUpdate }) => {
    return (
        <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Revocation Tool</h3>
            <p className="text-slate-400">Revoke or expire credentials</p>
            <p className="text-sm text-slate-500 mt-4">Component placeholder - implement credential revocation</p>
        </div>
    );
};

export default RevocationTool;
