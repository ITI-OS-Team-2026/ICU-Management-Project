const noteService = require("./note.service");

const createClinicalNote = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const authorId = req.user.id;
    const { content } = req.body;

    const note = await noteService.createClinicalNote(admissionId, authorId, content);

    res.status(201).json({
      status: "success",
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

const getClinicalNotes = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const notes = await noteService.getClinicalNotes(admissionId);

    res.status(200).json({
      status: "success",
      results: notes.length,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

const deleteClinicalNote = async (req, res, next) => {
  try {
    const { id: noteId } = req.params;

    await noteService.deleteClinicalNote(noteId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const createNursingNote = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const authorId = req.user.id;
    const { note: noteContent } = req.body;

    const note = await noteService.createNursingNote(admissionId, authorId, noteContent);

    res.status(201).json({
      status: "success",
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

const getNursingNotes = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const notes = await noteService.getNursingNotes(admissionId);

    res.status(200).json({
      status: "success",
      results: notes.length,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNursingNote = async (req, res, next) => {
  try {
    const { id: noteId } = req.params;

    await noteService.deleteNursingNote(noteId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClinicalNote,
  getClinicalNotes,
  deleteClinicalNote,
  createNursingNote,
  getNursingNotes,
  deleteNursingNote,
};
