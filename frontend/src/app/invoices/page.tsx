'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateInvoiceModal from '@/components/forms/CreateInvoiceModal';
import { invoiceService } from '@/services/invoice';
import paymentService from '@/services/payment';
import { authService } from '@/services/auth';
import { Invoice } from '@/types';
import { FileText, IndianRupee, Calendar, AlertCircle, Plus, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    // Get current user info
    const user = authService.getUserFromToken();
    setCurrentUser(user);
    
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-300 bg-green-900/20 border border-green-800';
      case 'pending':
        return 'text-yellow-300 bg-yellow-900/20 border border-yellow-800';
      case 'overdue':
        return 'text-red-300 bg-red-900/20 border border-red-800';
      case 'draft':
        return 'text-slate-300 bg-slate-800 border border-slate-700';
      default:
        return 'text-slate-300 bg-slate-800 border border-slate-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidAmount = invoices
    .filter(invoice => invoice.status.toLowerCase() === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingAmount = invoices
    .filter(invoice => invoice.status.toLowerCase() === 'pending')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  // Check if user can create invoices (Admin, ProjectManager, Client)
  const canCreateInvoice = currentUser && ['Admin', 'ProjectManager', 'Client'].includes(currentUser.role);

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!currentUser) {
      toast.error('Please login to make payment');
      return;
    }

    if (currentUser.role !== 'Client' && currentUser.role !== 'Admin') {
      toast.error('Only clients can make payments');
      return;
    }

    if (invoice.status === 'Paid') {
      toast.error('Invoice is already paid');
      return;
    }

    try {
      // Use invoice.clientId for the payment since that's who should pay
      await paymentService.payInvoice(invoice.id, invoice.amount, invoice.clientId);
      
      // Update invoice status to paid
      await invoiceService.update(invoice.id, { ...invoice, status: 'Paid' });
      
      toast.success('Payment processed successfully!');
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  const canMakePayment = (invoice: Invoice) => {
    return currentUser && 
           (currentUser.role === 'Client' || currentUser.role === 'Admin') && 
           invoice.status !== 'Paid';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-80">
          <motion.div
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pl-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="space-y-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: -25 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.15 },
            },
          }}
        >
          <motion.div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold drop-shadow-md">
                <span className="text-white/90">Invoices</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-1">
                Manage your billing and payments
              </p>
            </div>
            {canCreateInvoice && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -10 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Invoice
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <IndianRupee className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <IndianRupee className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Paid Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/20 p-3 rounded-xl">
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Pending Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Invoices Table */}
        {invoices.length > 0 ? (
          <motion.div
            className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100">All Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/50">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Invoice ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      className="hover:bg-slate-700/30 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                        #{invoice.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {canMakePayment(invoice) && (
                          <button
                            onClick={() => handlePayInvoice(invoice)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600/90 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pay Now
                          </button>
                        )}
                        {invoice.status === 'Paid' && (
                          <span className="inline-flex items-center px-3 py-1.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg">
                            <CreditCard className="w-4 h-4 mr-1" />
                            Paid
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-12 bg-slate-900/10 backdrop-blur-xl rounded-2xl border border-white/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FileText className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-200">No invoices</h3>
            <p className="mt-1 text-sm text-slate-400">No invoices have been created yet.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onInvoiceCreated={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}
    </DashboardLayout>
  );
}