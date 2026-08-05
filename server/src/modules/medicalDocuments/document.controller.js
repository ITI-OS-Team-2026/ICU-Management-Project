const fs = require("fs");
const fetch = require("node-fetch");
const documentService = require("./document.service");
const APIError = require("../../utils/APIError");

const createDocument = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const uploadedBy = req.user.id;
    const { document_type } = req.body;

    if (!req.file) {
      throw new APIError("No file uploaded", 400);
    }

    const doc = await documentService.createDocument(admissionId, uploadedBy, req.file, document_type, req);

    res.status(201).json({
      status: "success",
      data: doc,
    });
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

    const disposition = `attachment; filename="${doc.originalFilename}"`;
    const contentType = doc.mimeType || "application/octet-stream";

    if (doc.storageType === "cloudinary" && doc.cloudinaryUrl) {
      // Proxy the file through the server to avoid cross-origin redirect issues
      // when the frontend axios call uses responseType: 'blob' + withCredentials.
      const upstream = await fetch(doc.cloudinaryUrl);
      if (!upstream.ok) throw new APIError("File could not be retrieved from cloud storage", 502);
      res.setHeader("Content-Disposition", disposition);
      res.setHeader("Content-Type", contentType);
      return upstream.body.pipe(res);
    }

    if (doc.storageType === "blob" && doc.fileContent) {
      res.setHeader("Content-Disposition", disposition);
      res.setHeader("Content-Type", contentType);
      return res.send(doc.fileContent);
    }

    // Legacy: documents uploaded before cloud storage was introduced.
    if (doc.storageType === "local" && doc.filePath) {
      if (!fs.existsSync(doc.filePath)) {
        throw new APIError("Physical file not found on disk", 404);
      }
      return res.download(doc.filePath, doc.originalFilename);
    }

    throw new APIError("File is not available", 404);
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
