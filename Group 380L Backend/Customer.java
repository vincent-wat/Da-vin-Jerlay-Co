public class Customer {

    private String name;
    private int userID;
    private String email;

    /**
     * Constructs a new Customer with the specified details.
     *
     * @param n   the name of the customer
     * @param id  the unique identifier for the customer
     * @param e   the email address of the customer
     */
    public Customer(String n, int id, String e) {
        this.name = n;
        this.userID = id;
        this.email = e;
    }

    /**
     * Sets the name of the customer.
     *
     * @param n the name of the customer
     */
    public void setName(String n) {
        name = n;
    }

    /**
     * Sets the unique identifier for the customer.
     *
     * @param id the user's ID
     */
    public void setUserID(int id) {
        userID = id;
    }

    /**
     * Sets the email address of the customer.
     *
     * @param e the email address of the customer
     */
    public void setEmail(String e) {
        email = e;
    }
    
    /**
     * Returns the name of the customer.
     *
     * @return the customer's name
     */
    public String getName() {
        return name;
    }

    /**
     * Returns the unique identifier for the customer.
     *
     * @return the customer's user ID
     */
    public int getUserID() {
        return userID;
    }

    /**
     * Returns the email address of the customer.
     *
     * @return the customer's email
     */
    public String getEmail() {
        return email;
    }

}
