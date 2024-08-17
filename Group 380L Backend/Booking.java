import java.util.Date;

public class Booking {
    private int bookingID;
    private Date checkInDate;
    private Date checkOutDate;
    private Room room; 
    private Customer customer;
  

    /**
     * Constructs a new Booking with the specified details.
     *
     * @param bookingID    the unique identifier for the booking
     * @param checkInDate  the date when the customer is scheduled to check in
     * @param checkOutDate the date when the customer is scheduled to check out
     * @param room         the room associated with the booking
     * @param customer     the customer who made the booking
     */
    public Booking(Date checkInDate, Date checkOutDate, Room room) {
    
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.room = room;
    }

    /**
     * Returns the unique identifier for the booking.
     *
     * @return the booking ID
     */
    public int getBookingID() {
        return bookingID;
    }

    /**
     * Returns the check-in date for the booking.
     *
     * @return the check-in date
     */
    public Date getCheckInDate() {
        return checkInDate;
    }

    /**
     * Returns the check-out date for the booking.
     *
     * @return the check-out date
     */
    public Date getCheckOutDate() {
        return checkOutDate;
    }


    /**
     * Returns the room associated with the booking.
     *
     * @return the room
     */
    public Room getRoom() {
        return room;
    }

    /**
     * Returns the customer who made the booking.
     *
     * @return the customer
     */
    public Customer getCustomer() {
        return customer;
    }

    /**
     * Sets the unique identifier for the booking.
     *
     * @param bookingID the booking ID
     */
    public void setBookingID(int bookingID) {
        this.bookingID = bookingID;
    }

    /**
     * Sets the check-in date for the booking.
     *
     * @param checkInDate the check-in date
     */
    public void setCheckInDate(Date checkInDate) {
        this.checkInDate = checkInDate;
    }

    /**
     * Sets the check-out date for the booking.
     *
     * @param checkOutDate the check-out date
     */
    public void setCheckOutDate(Date checkOutDate) {
        this.checkOutDate = checkOutDate;
    }

    /**
     * Sets the room associated with the booking.
     *
     * @param room the room
     */
    public void setRoom(Room room) {
        this.room = room;
    }

    /**
     * Sets the customer who made the booking.
     *
     * @param customer the customer
     */
    public void setCustomer(Customer customer) {
        this.customer = customer;
    }
	
}
