import React from 'react';
import { DollarSign } from 'lucide-react';

const PaymentMonitor = () => {
    return (
        <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Payment Monitor</h3>
            <p className="text-slate-400">Real-time payment tracking</p>
            <p className="text-sm text-slate-500 mt-4">Component placeholder - implement with real-time subscriptions</p>
        </div>
    );
};

export default PaymentMonitor;
