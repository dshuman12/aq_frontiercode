import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { Request, Response } from 'express';
import { DocumentQuery, Types } from 'mongoose';
import { get, create, update } from '../../controllers/jobSite';
import { JobSite, IJobSite } from '../../models/JobSite';
import { JobLocation, IJobLocation } from '../../models/JobLocation';
import { Status, Messages } from '../../common/constants';
import { describe } from 'mocha';




describe('JobSite Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusStub: sinon.SinonStub;
    let jsonStub: sinon.SinonStub;
    let sendStub: sinon.SinonStub;
  
    beforeEach(() => {
      req = {};
      res = {
        status: () => res as Response,
        json: () => res as Response,
        send: () => res as Response,
      };
      statusStub = sinon.stub(res, 'status').returns(res as Response);
      jsonStub = sinon.stub(res, 'json').returns(res as Response);
      sendStub = sinon.stub(res, 'send').returns(res as Response);
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe('get', () => {
        it('should get job sites by id', async () => {
          req.params = { id: '123' };
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(null, [{ _id: '123', name: 'Test Site' }]);
            return {
              exec: sinon.stub().resolves([{ _id: '123', name: 'Test Site' }])
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.OK)).to.be.true;
          expect(sendStub.calledWith([{ _id: '123', name: 'Test Site' }])).to.be.true;
        });

        it('should get job sites by customerId', async () => {
          req.query = { customerId: '456' };
          req.params = {}; // Ensure req.params is defined
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(null, [{ _id: '456', name: 'Customer Site' }]);
            return {
              exec: sinon.stub().resolves([{ _id: '456', name: 'Customer Site' }])
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.OK)).to.be.true;
          expect(sendStub.calledWith([{ _id: '456', name: 'Customer Site' }])).to.be.true;
        });

        it('should get job sites by homeOwnerId', async () => {
          req.query = { homeOwnerId: '789' };
          req.params = {}; // Ensure req.params is defined
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(null, [{ _id: '789', name: 'HomeOwner Site' }]);
            return {
              exec: sinon.stub().resolves([{ _id: '789', name: 'HomeOwner Site' }])
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.OK)).to.be.true;
          expect(sendStub.calledWith([{ _id: '789', name: 'HomeOwner Site' }])).to.be.true;
        });

        it('should get job sites by locationId', async () => {
          req.query = { locationId: '101112' };
          req.params = {}; // Ensure req.params is defined
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(null, [{ _id: '101112', name: 'Location Site' }]);
            return {
              exec: sinon.stub().resolves([{ _id: '101112', name: 'Location Site' }])
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.OK)).to.be.true;
          expect(sendStub.calledWith([{ _id: '101112', name: 'Location Site' }])).to.be.true;
        });

        it('should get job sites by isActive status', async () => {
          req.query = { isActive: 'true' };
          req.params = {}; // Ensure req.params is defined
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(null, [{ _id: '131415', name: 'Active Site', isActive: true }]);
            return {
              exec: sinon.stub().resolves([{ _id: '131415', name: 'Active Site', isActive: true }])
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.OK)).to.be.true;
          expect(sendStub.calledWith([{ _id: '131415', name: 'Active Site', isActive: true }])).to.be.true;
        });

        it('should handle errors', async () => {
          req.params = { id: '123' };
          const findStub = sinon.stub(JobSite, 'find').callsFake((query, callback) => {
            callback(new Error('Database error'), null);
            return {
              exec: sinon.stub().rejects(new Error('Database error'))
            } as any;
          });
      
          await get(req as Request, res as Response);
      
          expect(findStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(Status.InternalError)).to.be.true;
          expect(sendStub.calledWith(Messages.InternalServerError)).to.be.true;
        });
      });
  
    describe('create', () => {
      it('should create a new job site', async () => {
        req.body = {
          name: 'New Site',
          location: { lat: 40, long: -70 },
          locationId: new Types.ObjectId().toHexString(),
        };
        
        const jobLocationStub = sinon.stub(JobLocation, 'findById').resolves({
          _id: req.body.locationId,
          name: 'Test Location',
          contacts: [],
          location: { type: 'Point', coordinates: [0, 0] },
          builderId: new Types.ObjectId(),
          customerIds: [],
          companyId: new Types.ObjectId(),
        } as any);
  
        const jobSiteFindOneStub = sinon.stub(JobSite, 'findOne').resolves(null);
        const jobSiteCreateStub = sinon.stub(JobSite, 'create').resolves({
          _id: new Types.ObjectId(),
          name: req.body.name,
          location: { type: 'Point', coordinates: [req.body.location.long, req.body.location.lat] },
          address: {},
          locationId: new Types.ObjectId(),
          customerId: new Types.ObjectId(),
        } as any);
        const jobLocationUpdateStub = sinon.stub(JobLocation, 'findByIdAndUpdate').resolves();
  
        await create(req as Request, res as Response);
  
        expect(jobLocationStub.calledOnce).to.be.true;
        expect(jobSiteFindOneStub.calledOnce).to.be.true;
        expect(jobSiteCreateStub.calledOnce).to.be.true;
        expect(jobLocationUpdateStub.calledOnce).to.be.true;
        expect(jsonStub.calledWith(sinon.match({ status: Status.Success }))).to.be.true;
      });

      it('should handle missing locationId', async () => {
        req.body = {
          name: 'New Site',
          location: { lat: 40, long: -70 },
        };
  
        await create(req as Request, res as Response);
  
        expect(statusStub.calledWith(Status.MissingParameters)).to.be.true;
        expect(jsonStub.calledWith(sinon.match({ status: Status.Error, message: sinon.match.string }))).to.be.true;
      });

      it('should handle missing name', async () => {
        req.body = {
          location: { lat: 40, long: -70 },
          locationId: new Types.ObjectId().toHexString(),
        };
  
        await create(req as Request, res as Response);
  
        expect(statusStub.calledWith(Status.MissingParameters)).to.be.true;
        expect(jsonStub.calledWith(sinon.match({ status: Status.Error, message: sinon.match.string }))).to.be.true;
      });

      it('should handle missing both location and address', async () => {
        req.body = {
          name: 'New Site',
          locationId: new Types.ObjectId().toHexString(),
        };
  
        await create(req as Request, res as Response);
  
        expect(statusStub.calledWith(Status.MissingParameters)).to.be.true;
        expect(jsonStub.calledWith(sinon.match({ status: Status.Error, message: 'Either location or address is required.' }))).to.be.true;
      });
    });

    describe('update', () => {
        it('should update a job site successfully', async () => {
            const req = {
                params: { id: new Types.ObjectId().toString() },
                body: {
                    name: 'Updated Job Site',
                    location: { lat: 10, long: 20 },
                    address: {
                        street: 'Updated Street',
                        city: 'Updated City',
                        state: 'Updated State',
                        zipcode: 'Updated Zipcode'
                    },
                    locationId: new Types.ObjectId().toString(),
                    isActive: true,
                },
            } as Partial<Request>;

            const res = {
                json: sinon.stub() as SinonStub,
                status: sinon.stub().returnsThis() as SinonStub,
            } as Partial<Response>;

            const mockJobLocation: Partial<any> = {
                _id: new Types.ObjectId(req.body.locationId),
                customerIds: [new Types.ObjectId()],
                homeOwner: new Types.ObjectId(),
                name: 'Mock Location',
            };

            const mockJobSite: Partial<any> = {
                _id: new Types.ObjectId(req?.params?.id),
                name: 'Existing Job Site',
                location: { type: 'Point', coordinates: [0, 0] },
                address: {
                    street: 'Existing Street',
                    city: 'Existing City',
                    state: 'Existing State',
                    zipcode: 'Existing Zipcode'
                },
                locationId: new Types.ObjectId(req.body.locationId),
                customerId: new Types.ObjectId(),
                homeOwner: new Types.ObjectId(),
                isActive: true,
            };

            const jobLocationStub = sinon.stub(JobLocation, 'findById').resolves(mockJobLocation as IJobLocation);
            const jobSiteStub = sinon.stub(JobSite, 'findById').resolves(mockJobSite as IJobSite);
            const jobSiteFindOneStub = sinon.stub(JobSite, 'findOne').resolves(null);
            const jobSiteUpdateStub = sinon.stub(JobSite, 'updateOne').resolves({ nModified: 1 });

            await update(req as Request, res as Response);

            expect(jobLocationStub.calledOnce).to.be.true;
            expect(jobSiteStub.calledOnce).to.be.true;
            expect(jobSiteFindOneStub.calledOnce).to.be.true;
            expect(jobSiteUpdateStub.calledOnce).to.be.true;
            expect((res.json as SinonStub).calledWith(sinon.match({ status: Status.OK, message: 'Job Address has been updated successfully.' }))).to.be.true;

            jobLocationStub.restore();
            jobSiteStub.restore();
            jobSiteFindOneStub.restore();
            jobSiteUpdateStub.restore();
        });

        it('should handle missing id', async () => {
            req.body = {
                name: 'Updated Job Site',
                location: { lat: 10, long: 20 },
                address: {
                    street: 'Updated Street',
                    city: 'Updated City',
                    state: 'Updated State',
                    zipcode: 'Updated Zipcode'
                },
                locationId: new Types.ObjectId().toString(),
                isActive: true,
            };
            req.params = {}; // Ensure req.params is defined

            await update(req as Request, res as Response);

            expect(jsonStub.calledWith(sinon.match({ status: Status.Error, message: sinon.match.string }))).to.be.true;
        });

        it('should handle missing locationId', async () => {
            req.params = { id: new Types.ObjectId().toString() };
            req.body = {
                name: 'Updated Job Site',
                location: { lat: 10, long: 20 },
                address: {
                    street: 'Updated Street',
                    city: 'Updated City',
                    state: 'Updated State',
                    zipcode: 'Updated Zipcode'
                },
                isActive: true,
            };

            await update(req as Request, res as Response);

            expect(jsonStub.calledWith(sinon.match({ status: Status.Error, message: sinon.match.string }))).to.be.true;
        });

    
        it('should handle updating with a new name that already exists', async () => {
            const req = {
                params: { id: new Types.ObjectId().toString() },
                body: {
                    name: 'New Job Site',  // New name to trigger the condition
                    location: { lat: 10, long: 20 },
                    address: {
                        street: 'Updated Street',
                        city: 'Updated City',
                        state: 'Updated State',
                        zipcode: 'Updated Zipcode'
                    },
                    locationId: new Types.ObjectId().toString(),
                    isActive: true,
                },
            } as Partial<Request>;
        
            const res = {
                json: sinon.stub().returnsThis() as SinonStub,
                status: sinon.stub().returnsThis() as SinonStub,
            } as Partial<Response>;
        
            const mockJobLocation: Partial<any> = {
                _id: new Types.ObjectId(req.body.locationId),
                customerIds: [new Types.ObjectId()],
                homeOwner: new Types.ObjectId(),
                name: 'Mock Location',
            };
        
            const mockJobSite: Partial<any> = {
                _id: new Types.ObjectId(req?.params?.id),
                name: 'Existing Job Site', // Existing name
                location: { type: 'Point', coordinates: [0, 0] },
                address: {
                    street: 'Existing Street',
                    city: 'Existing City',
                    state: 'Existing State',
                    zipcode: 'Existing Zipcode'
                },
                locationId: new Types.ObjectId(req.body.locationId),
                customerId: new Types.ObjectId(),
                homeOwner: new Types.ObjectId(),
                isActive: true,
            };
        
            const jobLocationStub = sinon.stub(JobLocation, 'findById').resolves(mockJobLocation as any);
            const jobSiteStub = sinon.stub(JobSite, 'findById').resolves(mockJobSite as any);
            
            // Simulating that another JobSite exists with the new name
            const jobSiteFindOneStub = sinon.stub(JobSite, 'findOne').resolves(mockJobSite as any);
            const jobSiteUpdateStub = sinon.stub(JobSite, 'updateOne').resolves({ nModified: 0 });
        
            await update(req as Request, res as Response);
        
            expect(jobLocationStub.calledOnce).to.be.true;
            expect(jobSiteStub.calledOnce).to.be.true;
            expect(jobSiteFindOneStub.calledOnce).to.be.true;
            expect(jobSiteUpdateStub.calledOnce).to.be.false; // Should not proceed to update
            expect((res.status as SinonStub).calledWith(Status.Forbidden)).to.be.true;
            expect((res.json as SinonStub).calledWith(sinon.match({ status: Status.Forbidden, message: 'JobSite with that name already exists in this subdivision.' }))).to.be.true;
        
            jobLocationStub.restore();
            jobSiteStub.restore();
            jobSiteFindOneStub.restore();
            jobSiteUpdateStub.restore();
        });
        


    });
});