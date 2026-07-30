import api from '@/lib/api';

export const treatmentApprovalsService = {
  /** List approvals for an admission. status: 'PENDING' | 'APPROVED' | 'REJECTED' */
  async getApprovals(admissionId, status) {
    const { data } = await api.get(`/admissions/${admissionId}/treatment-approvals`, {
      params: status ? { status } : undefined,
    });
    return data.data || [];
  },

  async requestApproval(admissionId, { treatmentName, clinicalJustification }) {
    const { data } = await api.post(`/admissions/${admissionId}/treatment-approvals`, {
      treatment_name: treatmentName,
      clinical_justification: clinicalJustification || null,
    });
    return data.data;
  },

  /** Specialist decision — approved = true approves, false rejects. */
  async decideApproval(approvalId, approved) {
    const { data } = await api.patch(`/treatment-approvals/${approvalId}`, {
      approval_status: approved,
    });
    return data.data;
  },

  /** Nurse records bedside execution. status: 'IN_PROGRESS' | 'COMPLETED' */
  async executeApproval(approvalId, status, notes) {
    const { data } = await api.patch(`/treatment-approvals/${approvalId}/execution`, {
      execution_status: status,
      execution_notes: notes || null,
    });
    return data.data;
  },

  /** Requester withdraws their own still-pending request. */
  async withdrawApproval(approvalId) {
    await api.delete(`/treatment-approvals/${approvalId}`);
  },
};
