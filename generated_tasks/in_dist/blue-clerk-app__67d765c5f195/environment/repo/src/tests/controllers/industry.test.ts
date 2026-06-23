import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { createIndustry, getIndustries, removeIndustry } from '../../controllers/industry';
import { Industry } from '../../models/Industry';
import { Status, Messages } from '../../common/constants';

describe('Industry Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonStub: sinon.SinonStub;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'userId' }
        };
        res = {
            json: sinon.stub()
        };
        jsonStub = res.json as sinon.SinonStub;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('createIndustry', () => {
        it('should return error if industry already exists', async () => {
            req.body = { title: 'Test Industry' };
            sinon.stub(Industry, 'findOne').yields(null, { title: 'Test Industry' });

            await createIndustry(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Error, message: 'Industry already created' })).to.be.true;
        });

        it('should create a new industry', async () => {
            req.body = { title: 'New Industry' };
            sinon.stub(Industry, 'findOne').yields(null, null);
            const saveStub = sinon.stub(Industry.prototype, 'save').yields(null);

            await createIndustry(req as Request, res as Response);

            expect(saveStub.calledOnce).to.be.true;
            expect(jsonStub.calledWith({ status: Status.Success, message: 'Industry created successfully.' })).to.be.true;
        });

        it('should return error on save failure', async () => {
            req.body = { title: 'New Industry' };
            sinon.stub(Industry, 'findOne').yields(null, null);
            sinon.stub(Industry.prototype, 'save').yields(new Error('Save error'));

            await createIndustry(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Error, message: Messages.GenericError })).to.be.true;
        });
    });

    describe('getIndustries', () => {
        it('should return list of industries', async () => {
            const industries = [{ title: 'Industry1' }, { title: 'Industry2' }];
            sinon.stub(Industry, 'find').yields(null, industries);

            await getIndustries(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Success, industries })).to.be.true;
        });

        it('should return error on find failure', async () => {
            sinon.stub(Industry, 'find').yields(new Error('Find error'), null);

            await getIndustries(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Error, message: Messages.GenericError })).to.be.true;
        });
    });

    describe('removeIndustry', () => {
        it('should remove an industry', async () => {
            req.body = { industryId: 'industryId' };
            sinon.stub(Industry, 'findOneAndDelete').returns({
                exec: (callback: any) => callback(null, { _id: 'industryId' })
            } as any);

            await removeIndustry(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Success, message: 'Industry removed successfully.' })).to.be.true;
        });

        it('should return error on delete failure', async () => {
            req.body = { industryId: 'industryId' };
            sinon.stub(Industry, 'findOneAndDelete').returns({
                exec: (callback: any) => callback(new Error('Delete error'), null)
            } as any);

            await removeIndustry(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Error, message: Messages.GenericError })).to.be.true;
        });
    });
});