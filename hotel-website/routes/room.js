import express from 'express';
const router = express.Router();

router.get('/:id', (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const user = { is_admin: true }; // Mock user object for the test
    const loggedin = true; // Mock loggedin status

    if (roomId === 1) {
        const room = {
            id: 1,
            type: 'Deluxe',
            price: 100,
            image: 'images/roomdeluxe.png' // Replace with actual image path
        };
        res.render('room', { roomType: room.type, room, user, loggedin });
    } else {
        res.status(404).send('Room not found');
    }
});

export default router;
