import api from '@/lib/api';

export const aiService = {
  /**
   * Fetch saved AI summaries for an admission.
   * @param {string} admissionId
   * @param {Object} [params]
   * @returns {Promise<Array>}
   */
  async getSummaries(admissionId, params = {}) {
    const { data } = await api.get(`/admissions/${admissionId}/summaries`, { params });
    return data?.data || [];
  },

  /**
   * Generate a fresh AI clinical summary using AWS Bedrock.
   * @param {string} admissionId
   * @returns {Promise<Object>}
   */
  async generatePatientSummary(admissionId) {
    const { data } = await api.post(`/ai/admissions/${admissionId}/patient-summary`);
    return data?.data || data;
  },

  /**
   * Fetch aggregated patient context data (without invoking LLM).
   * @param {string} admissionId
   * @returns {Promise<Object>}
   */
  async getPatientContext(admissionId) {
    const { data } = await api.get(`/ai/admissions/${admissionId}/patient-context`);
    return data?.data || data;
  },

  /**
   * Soft delete (archive) an AI summary.
   * @param {string} summaryId
   * @returns {Promise<Object>}
   */
  async deleteSummary(summaryId) {
    const { data } = await api.delete(`/ai/summaries/${summaryId}`);
    return data;
  },

  /**
   * Restore (unarchive) an AI summary.
   * @param {string} summaryId
   * @returns {Promise<Object>}
   */
  async restoreSummary(summaryId) {
    const { data } = await api.patch(`/ai/summaries/${summaryId}/restore`);
    return data;
  },
};
