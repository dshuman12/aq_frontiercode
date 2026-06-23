import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { WorkType } from '../../../src/models/WorkType';
import { Status } from '../../../src/common/constants';
import * as workTypeController from '../../../src/controllers/workType';

describe('WorkType Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonStub: sinon.SinonStub;

    beforeEach(() => {
        req = {};
        res = {
            json: sinon.stub()
        };
        jsonStub = res.json as sinon.SinonStub;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getWorkTypes', () => {
        it('should return work types based on query', async () => {
            req.query = { title: 'test' };
            const workTypes = [{ title: 'test' }];
            sinon.stub(WorkType as any, 'find').resolves(workTypes);

            await workTypeController.getWorkTypes(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Success, workTypes })).to.be.true;
        });
    });

    describe('getWorkTypeById', () => {
        it('should return a work type by id', async () => {
            req.params = { id: '123' };
            const workType = { title: 'test' };
            sinon.stub(WorkType as any, 'findById').resolves(workType);

            await workTypeController.getWorkTypeById(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Success, workType })).to.be.true;
        });
    });

    describe('updateWorkType', () => {
        it('should update a work type', async () => {
            req.body = { workTypeId: '123', title: 'updated title' };
            const workType = { save: sinon.stub(), title: 'old title' };
            sinon.stub(WorkType, 'findById').resolves(workType as any);

            await workTypeController.updateWorkType(req as Request, res as Response);

            expect(workType.title).to.equal('updated title');
            expect(workType.save.calledOnce).to.be.true;
            expect(jsonStub.calledWith({ status: Status.Success, message: 'Work Type updated successfully!' })).to.be.true;
        });

        it('should return error if work type not found', async () => {
            req.body = { workTypeId: '123', title: 'updated title' };
            sinon.stub(WorkType, 'findById').resolves(null);

            await workTypeController.updateWorkType(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Error, message: 'Work Type is not found' })).to.be.true;
        });
    });

    describe('createWorkType', () => {
        it('should create a new work type', async () => {
            req.body = { title: 'new title' };
            const workType = { save: sinon.stub() };
            sinon.stub(WorkType.prototype, 'save').resolves(workType);

            await workTypeController.createWorkType(req as Request, res as Response);

            expect(jsonStub.calledWith({ status: Status.Success, message: 'Work Type created successfully!' })).to.be.true;
        });
    });
});