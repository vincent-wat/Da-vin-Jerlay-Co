import request from 'supertest';
import express from 'express';
import { expect } from 'chai';

import roomRouter from '../routes/room.js'; // Correct path to your room.js route file

const app = express();

// Setup view engine to render ejs templates
app.set('view engine', 'ejs');
app.set('views', 'views'); // Assuming 'views' is your directory for ejs files

app.use('/room', roomRouter);

describe('GET /room/:id', function() {
    it('should return room details for a valid id', function(done) {
        request(app)
            .get('/room/1')
            .expect('Content-Type', /html/) // EJS templates will render HTML
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                expect(res.text).to.include('Deluxe'); // Checking the rendered HTML
                expect(res.text).to.include('100'); // Checking the price in the HTML
                done();
            });
    });

    it('should return 404 for an invalid id', function(done) {
        request(app)
            .get('/room/999')
            .expect(404)
            .expect('Room not found', done);
    });
});
