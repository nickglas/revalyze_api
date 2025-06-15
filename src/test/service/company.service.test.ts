import 'reflect-metadata';
import { Types } from 'mongoose';
import * as companyService from '../../services/company.service';
import Company from '../../models/company.model';
import User from '../../models/user.model';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { CompanyService } from '../../services/company.service';
import Container from 'typedi';
import { CompanyRepository } from '../../repositories/company.repository';
import { StripeService } from '../../services/stripe.service';

jest.mock('../../models/company.model');
jest.mock('../../models/user.model');
jest.mock('../../services/stripe.service');

describe('Company Service', () => {
  let companyService: CompanyService;

  beforeEach(() => {
    Container.set(CompanyRepository, {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    });
    Container.set(StripeService, new StripeService());
    companyService = Container.get(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Container.reset();
  });

  describe('getCompanyById', () => {
    it('throws BadRequestError if companyId is invalid', async () => {
      await expect(companyService.getCompanyById('invalid-id'))
        .rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError if company not found', async () => {
      (Company.findById as jest.Mock).mockResolvedValue(null);

      const id = new Types.ObjectId().toString();
      await expect(companyService.getCompanyById(id))
        .rejects.toThrow(NotFoundError);
    });

    it('returns company if found', async () => {
      const fakeCompany = { _id: new Types.ObjectId(), name: 'TestCo' };
      (Company.findById as jest.Mock).mockResolvedValue(fakeCompany);

      const id = new Types.ObjectId().toString();
      const result = await companyService.getCompanyById(id);
      expect(result).toEqual(fakeCompany);
      expect(Company.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('updateCompanyById', () => {
    const validCompanyId = new Types.ObjectId().toString();
    const validUserId = new Types.ObjectId().toString();

    const companyAdminUser = {
      _id: validUserId,
      role: 'company_admin',
      companyId: validCompanyId,
    };

    it('throws BadRequestError if companyId or userId invalid', async () => {
      await expect(companyService.updateCompanyById('invalid', validCompanyId, {}))
        .rejects.toThrow(BadRequestError);

      await expect(companyService.updateCompanyById(validUserId, 'invalid', {}))
        .rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);
      await expect(companyService.updateCompanyById(validUserId, validCompanyId, {}))
        .rejects.toThrow(NotFoundError);
    });

    it('throws UnauthorizedError if user is not company_admin', async () => {
      (User.findById as jest.Mock).mockResolvedValue({ role: 'employee', companyId: validCompanyId });
      await expect(companyService.updateCompanyById(validUserId, validCompanyId, {}))
        .rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError if user companyId does not match', async () => {
      (User.findById as jest.Mock).mockResolvedValue({ role: 'company_admin', companyId: new Types.ObjectId().toString() });
      await expect(companyService.updateCompanyById(validUserId, validCompanyId, {}))
        .rejects.toThrow(UnauthorizedError);
    });

    it('filters updates to only allowed fields and updates company', async () => {
      const updates = {
        mainEmail: 'newemail@test.com',
        phone: '123456789',
        address: 'New Address',
        invalidField: 'shouldBeIgnored',
      };

      (User.findById as jest.Mock).mockResolvedValue(companyAdminUser);
      (Company.findByIdAndUpdate as jest.Mock).mockImplementation((id, filteredUpdates) => {
        // Return filteredUpdates to check what was saved
        return Promise.resolve({ ...filteredUpdates, _id: id });
      });

      const result = await companyService.updateCompanyById(validUserId, validCompanyId, updates);

      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
        validCompanyId,
        {
          mainEmail: updates.mainEmail,
          phone: updates.phone,
          address: updates.address,
        },
        { new: true }
      );

      expect(result).toEqual({
        mainEmail: updates.mainEmail,
        phone: updates.phone,
        address: updates.address,
        _id: validCompanyId,
      });
    });

    it('throws NotFoundError if company not found during update', async () => {
      (User.findById as jest.Mock).mockResolvedValue(companyAdminUser);
      (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(companyService.updateCompanyById(validUserId, validCompanyId, { mainEmail: 'x' }))
        .rejects.toThrow(NotFoundError);
    });
  });
});
