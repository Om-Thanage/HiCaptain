'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { feedbackService } from '@/services/feedback';
import { Feedback } from '@/types';
import { MessageCircle, Star, Calendar, Plus, Edit, Trash2, X, AlertCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedbackFormData {
  content: string;
  rating: number;
  projectId: string;
  clientId: string;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [formData, setFormData] = useState<FeedbackFormData>({
    content: '',
    rating: 5,
    projectId: '',
    clientId: ''
  });
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true); setLoadError(false);
    try {
      const data = await feedbackService.getAll();
      setFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback');
      setFeedbacks([]); setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getAverageRating = () => {
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    return (total / feedbacks.length).toFixed(1);
  };

  const filteredFeedbacks = filterRating 
    ? feedbacks.filter(f => f.rating === filterRating)
    : feedbacks;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Feedback content is required';
    }

    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    if (!formData.projectId.trim()) {
      newErrors.projectId = 'Project ID is required';
    }

    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingFeedback) {
        await feedbackService.update(editingFeedback.id, formData);
        toast.success('Feedback updated successfully!');
      } else {
        await feedbackService.create(formData);
        toast.success('Feedback created successfully!');
      }
      
      fetchFeedbacks();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setFormData({
      content: feedback.content,
      rating: feedback.rating,
      projectId: feedback.projectId,
      clientId: feedback.clientId
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this feedback?')) {
      try {
        await feedbackService.delete(id);
        toast.success('Feedback deleted successfully!');
        fetchFeedbacks();
      } catch (error) {
        console.error('Error deleting feedback:', error);
        toast.error('Failed to delete feedback');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      rating: 5,
      projectId: '',
      clientId: ''
    });
    setEditingFeedback(null);
    setErrors({});
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

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
        {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">Could not load feedback. <button type="button" onClick={fetchFeedbacks}>Retry</button></div>}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Feedback</h1>
            <p className="text-slate-400 mt-2">Client feedback and reviews</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Rating Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterRating || ''}
                onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Feedback
            </button>
          </div>
        </div>

        {/* Stats */}
        {feedbacks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <MessageCircle className="h-8 w-8 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Total Feedback</p>
                  <p className="text-2xl font-bold text-slate-100">{feedbacks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <Star className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Average Rating</p>
                  <p className="text-2xl font-bold text-slate-100">{getAverageRating()}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <Star className="h-8 w-8 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">5-Star Reviews</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {feedbacks.filter(f => f.rating === 5).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
              <div className="flex items-center">
                <div className="shrink-0">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Filtered</p>
                  <p className="text-2xl font-bold text-slate-100">{filteredFeedbacks.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback List */}
        {filteredFeedbacks.length > 0 ? (
          <div className="space-y-4">
            {filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {feedback.clientId.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">Client {feedback.clientId}</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {renderStars(feedback.rating)}
                        </div>
                        <span className="text-sm text-slate-400">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-sm text-slate-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(feedback.createdAt)}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEdit(feedback)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit feedback"
                      >
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(feedback.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-slate-300 leading-relaxed">{feedback.content}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400">
                    Project ID: {feedback.projectId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-100">
              {feedbacks.length === 0 ? 'No feedback' : 'No feedback matches filter'}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {feedbacks.length === 0 
                ? 'No feedback has been received yet.' 
                : 'Try adjusting your filter criteria.'
              }
            </p>
            {feedbacks.length === 0 && (
              <div className="mt-6">
                <button 
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Feedback
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-slate-100">
                  {editingFeedback ? 'Edit Feedback' : 'New Feedback'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Project ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="page-feedback-field-1">
                    Project ID *
                  </label>
                  <input id="page-feedback-field-1"
                    type="text"
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project ID"
                  />
                  {errors.projectId && (
                    <p className="mt-1 text-sm text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.projectId}
                    </p>
                  )}
                </div>

                {/* Client ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="page-feedback-field-2">
                    Client ID *
                  </label>
                  <input id="page-feedback-field-2"
                    type="text"
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter client ID"
                  />
                  {errors.clientId && (
                    <p className="mt-1 text-sm text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.clientId}
                    </p>
                  )}
                </div>

                {/* Rating */}
                <div>
                  <p id="feedback-rating-label" className="block text-sm font-medium text-slate-300 mb-2">
                    Rating *
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= formData.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-slate-400">({formData.rating}/5)</span>
                  </div>
                  {errors.rating && (
                    <p className="mt-1 text-sm text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.rating}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label htmlFor="page-feedback-field-3" className="block text-sm font-medium text-slate-300 mb-2">
                    Feedback Content *
                  </label>
                  <textarea id="page-feedback-field-3"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your feedback..."
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.content}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingFeedback ? 'Update' : 'Create'} Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}