import api from '@/lib/api';

export const documentsService = {
  async uploadDocument(admissionId, file, documentType, description = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) {
      formData.append('description', description);
    }

    const { data } = await api.post(`/admissions/${admissionId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data;
  },

  async getDocuments(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/documents`);
    return data.data || [];
  },

  async downloadDocument(docId, filename) {
    const response = await api.get(`/documents/${docId}/download`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'document');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async deleteDocument(docId) {
    await api.delete(`/documents/${docId}`);
  }
};
