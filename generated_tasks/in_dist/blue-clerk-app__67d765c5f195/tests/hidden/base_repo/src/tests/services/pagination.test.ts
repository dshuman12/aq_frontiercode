import { expect } from 'chai';
import sinon from 'sinon';
import * as helper from '../../../src/services/helper';
import { getDatesFilterQuery, getPaginationQuery, getCursor, getSortPaginationMongo } from '../../../src/services/pagination';
import moment from 'moment';
import { ObjectId } from 'mongodb';

describe('Pagination Service', () => {
    describe('getDatesFilterQuery', () => {
        it('should return a date filter query with $gte and $lte', async () => {
            const startDate = '2023-01-01';
            const endDate = '2023-01-31';
            const result = await getDatesFilterQuery(startDate, endDate);
            expect(result).to.deep.equal({
                $gte: new Date(moment(startDate).format('YYYY-MM-DD')),
                $lte: new Date(moment(endDate).format('YYYY-MM-DD'))
            });
        });
    });

    describe('getCursor', () => {
        let fromCursorHashStub: sinon.SinonStub;

        beforeEach(() => {
            fromCursorHashStub = sinon.stub(helper, 'fromCursorHash');
        });

        afterEach(() => {
            fromCursorHashStub.restore();
        });

        it('should return cursor and cursorId', async () => {
            const hashedCursor = 'hashedCursor';
            const cursor = { _id: '507f1f77bcf86cd799439011' };
            fromCursorHashStub.returns(JSON.stringify(cursor));

            const result = await getCursor(hashedCursor);
            expect(result).to.deep.equal({
                cursor,
                cursorId: new ObjectId(cursor._id)
            });
        });
    });

    describe('getSortPaginationMongo', () => {
        it('should return $gt for next direction and ASC order', async () => {
            const direction = 'next';
            const sort = { order: 'ASC' };
            const result = await getSortPaginationMongo(direction, sort);
            expect(result).to.equal('$gt');
        });

        it('should return $lt for previous direction and ASC order', async () => {
            const direction = 'previous';
            const sort = { order: 'ASC' };
            const result = await getSortPaginationMongo(direction, sort);
            expect(result).to.equal('$lt');
        });

        it('should return $lt for next direction and DESC order', async () => {
            const direction = 'next';
            const sort = { order: 'DESC' };
            const result = await getSortPaginationMongo(direction, sort);
            expect(result).to.equal('$lt');
        });

        it('should return $gt for previous direction and DESC order', async () => {
            const direction = 'previous';
            const sort = { order: 'DESC' };
            const result = await getSortPaginationMongo(direction, sort);
            expect(result).to.equal('$gt');
        });

        it('should return $lt for default case', async () => {
            const direction = 'unknown';
            const sort = { order: 'ASC' };
            const result = await getSortPaginationMongo(direction, sort);
            expect(result).to.equal('$lt');
        });
    });
});