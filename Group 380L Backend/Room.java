public class Room {
    private RoomType roomType; 


    /**
     * Constructs a new Room with the specified details.
     *
     * @param roomType       the type of the room (e.g., Single, Double, Suite)
     */
    public Room(RoomType roomType) {
        this.roomType = roomType;
    }

   

    /**
     * Returns the type of the room.
     *
     * @return the room's type
     */
    public RoomType getRoomType() {
        return roomType;
    }


    /**
     * Sets the type of the room.
     *
     * @param t the type of the room
     */
    public void setRoomType(RoomType t) {
        this.roomType = t;
    }

}
