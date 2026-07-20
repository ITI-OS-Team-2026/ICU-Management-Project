const documentService = require("./document.service");
const APIError = require("../../utils/APIError");
const fs = require("fs");

const createDocument = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const uploadedBy = req.user.id;
    const { document_type } = req.body;

    if (!req.file) {
      throw new APIError("No file uploaded", 400);
    }

    try {
      const doc = await documentService.createDocument(admissionId, uploadedBy, req.file, document_type, req);

      res.status(201).json({
        status: "success",
        data: doc,
      });
    } catch (err) {
      // Clean up uploaded file on failure so no partial files are left on disk
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const docs = await documentService.getDocuments(admissionId);

    res.status(200).json({
      status: "success",
      results: docs.length,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await documentService.getDocumentById(id);

    if (!fs.existsSync(doc.filePath)) {
      throw new APIError("Physical file not found on disk", 404);
    }

    res.download(doc.filePath, doc.originalFilename);
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    await documentService.deleteDocument(id, req);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
};
