import request from 'supertest';
import { expect } from 'chai';
import express from 'express';
import roomRouter from '../routes/room.js'; // Ensure the correct path

const app = express();
app.use('/', roomRouter);

describe('GET /room/:id', function () {
    
    });

    it('should return 404 for an invalid id', function (done) {
        request(app)
            .get('/room/999')
            .expect(404)
            done();
    });

