import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { Invoice } from '../../../src/models/Invoice';
import { ServiceTicket } from '../../../src/models/ServiceTicket';
import * as bouncedEmailsController from '../../../src/controllers/bouncedEmails';

describe('Bounced Emails Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusStub: sinon.SinonStub;
    let jsonStub: sinon.SinonStub;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };
        statusStub = res.status as sinon.SinonStub;
        jsonStub = res.json as sinon.SinonStub;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('storeforInvoices', () => {
        it('should update the invoice and return success', async () => {
            req.body = { email: 'test@example.com' };
            const invoiceStub = sinon.stub(Invoice, 'findOneAndUpdate').resolves({
                invoice: 'mockInvoice',
                invoiceId: 'mockInvoiceId',
                invoiceType: 'mockInvoiceType',
                job: 'mockJob',
                // Add other required properties here
            } as any);

            await bouncedEmailsController.storeforInvoices(req as Request, res as Response);

            expect(invoiceStub.calledOnce).to.be.true;
            expect(statusStub.calledWith(200)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Success' })).to.be.true;
        });

        it('should return 500 if invoice not found', async () => {
            req.body = { email: 'test@example.com' };
            sinon.stub(Invoice, 'findOneAndUpdate').resolves(null);

            await bouncedEmailsController.storeforInvoices(req as Request, res as Response);

            expect(statusStub.calledWith(500)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Invoice not found' })).to.be.true;
        });

        it('should return 500 on error', async () => {
            req.body = { email: 'test@example.com' };
            sinon.stub(Invoice, 'findOneAndUpdate').throws();

            await bouncedEmailsController.storeforInvoices(req as Request, res as Response);

            expect(statusStub.calledWith(500)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Failed to update bounced status' })).to.be.true;
        });
    });

    describe('storeforPO', () => {
        it('should update the service ticket and return success', async () => {
            req.body = { email: 'test@example.com' };
            const poTicketStub = sinon.stub(ServiceTicket, 'findOneAndUpdate').resolves({
                createdAt: new Date(),
                dueDate: new Date(),
                customer: 'mockCustomer',
                createdBy: 'mockCreatedBy',
                // Add other required properties here to match IServiceTicket
            } as any);

            await bouncedEmailsController.storeforPO(req as Request, res as Response);

            expect(poTicketStub.calledOnce).to.be.true;
            expect(statusStub.calledWith(200)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Success' })).to.be.true;
        });

        it('should return 500 if service ticket not found', async () => {
            req.body = { email: 'test@example.com' };
            sinon.stub(ServiceTicket, 'findOneAndUpdate').resolves(null);

            await bouncedEmailsController.storeforPO(req as Request, res as Response);

            expect(statusStub.calledWith(500)).to.be.true;
            expect(jsonStub.calledWith({ message: 'poTicket not found' })).to.be.true;
        });

        it('should return 500 on error', async () => {
            req.body = { email: 'test@example.com' };
            sinon.stub(ServiceTicket, 'findOneAndUpdate').throws();

            await bouncedEmailsController.storeforPO(req as Request, res as Response);

            expect(statusStub.calledWith(500)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Failed to update bounced status' })).to.be.true;
        });
    });

    describe('markReadInvoiceNBounce', () => {
        it('should mark the invoice as read and return success', async () => {
            req.body = { invoiceId: '123' };
            const invoiceStub = sinon.stub(Invoice, 'findOneAndUpdate').resolves({
                invoice: 'mockInvoice',
                invoiceId: 'mockInvoiceId',
                invoiceType: 'mockInvoiceType',
                job: 'mockJob',
                // Add other required properties here to match IInvoice
            } as any);

            await bouncedEmailsController.markReadInvoiceNBounce(req as Request, res as Response);

            expect(invoiceStub.calledOnce).to.be.true;
            expect(statusStub.calledWith(200)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Success' })).to.be.true;
        });
    });

    describe('markReadPOBounce', () => {
        it('should mark the service ticket as read and return success', async () => {
            req.body = { id: '123' };
            const poTicketStub = sinon.stub(ServiceTicket, 'findOneAndUpdate').resolves({
                createdAt: new Date(),
                dueDate: new Date(),
                customer: 'mockCustomer',
                createdBy: 'mockCreatedBy',
                // Add other required properties here to match IServiceTicket
            } as any);

            await bouncedEmailsController.markReadPOBounce(req as Request, res as Response);

            expect(poTicketStub.calledOnce).to.be.true;
            expect(statusStub.calledWith(200)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Success' })).to.be.true;
        });
    });
});