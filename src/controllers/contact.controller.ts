// src/controllers/contact.controller.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Container } from "typedi";
import { ContactService } from "../services/contact.service";
import { CreateContactDto } from "../dto/contact/contact.create.dto";
import { UpdateContactDto } from "../dto/contact/contact.update.dto";

/**
 * Controller to handle GET /contacts
 * Retrieves paginated list of contacts for an external company.
 */
export const getContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const externalCompanyId = req.query.externalCompanyId
      ? new mongoose.Types.ObjectId(req.query.externalCompanyId as string)
      : undefined;

    const name = req.query.name?.toString();
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const createdAfter = req.query.createdAfter
      ? new Date(req.query.createdAfter as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy?.toString() || "createdAt";
    const sortOrder = req.query.sortOrder?.toString() === "asc" ? 1 : -1;

    const contactService = Container.get(ContactService);
    const { contacts, total } = await contactService.getContacts(
      companyId,
      externalCompanyId,
      name,
      isActive,
      createdAfter,
      page,
      limit,
      sortBy,
      sortOrder
    );

    res.status(200).json({
      data: contacts,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle GET /contacts/:id
 * Retrieves a single contact by ID.
 */
export const getContactById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const contactId = new mongoose.Types.ObjectId(req.params.id);

    const contactService = Container.get(ContactService);
    const contact = await contactService.getById(contactId, companyId);
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle POST /contacts
 * Creates a new contact.
 */
export const createContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto: CreateContactDto = req.body;
    const contactService = Container.get(ContactService);

    const contact = await contactService.createContact(companyId, dto);
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /contacts/:id
 * Updates a contact by ID.
 */
export const updateContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const contactId = new mongoose.Types.ObjectId(req.params.id);
    const updates: UpdateContactDto = req.body;

    const contactService = Container.get(ContactService);
    const updated = await contactService.updateContact(
      companyId,
      contactId,
      updates
    );

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /contacts/:id/status
 * Toggles the active status of a contact.
 */
export const toggleContactStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const contactId = new mongoose.Types.ObjectId(req.params.id);

    const contactService = Container.get(ContactService);
    const updated = await contactService.toggleIsActive(contactId, companyId);

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle DELETE /contacts/:id
 * Deletes a contact by ID.
 */
export const deleteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const contactId = new mongoose.Types.ObjectId(req.params.id);

    const contactService = Container.get(ContactService);
    const deleted = await contactService.deleteContact(contactId, companyId);

    res.status(200).json(deleted);
  } catch (err) {
    next(err);
  }
};
