'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { invoiceService } from '@/services/invoice';
import { Invoice } from '@/types';
import { FileText, IndianRupee, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchInvoices();
  }, []);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Invoices</h1>
          <p className="text-slate-400 mt-2">Manage your billing and payments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <IndianRupee className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <IndianRupee className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Paid Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Pending Amount</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        {invoices.length > 0 ? (
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">All Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700">
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
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-700/50">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-200">No invoices</h3>
            <p className="mt-1 text-sm text-slate-400">No invoices have been created yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}