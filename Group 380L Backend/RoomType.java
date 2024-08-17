enum RoomType {
    SINGLE, DOUBLE, TRIPLE, QUADRUPLE, SUITE, DELUXE;

    public static RoomType fromDatabase(String dbValue) {
        switch (dbValue) {
            case "1bed":
                return SINGLE;
            case "2bed":
                return DOUBLE;
            case "3bed":
                return TRIPLE;
            case "4bed":
                return QUADRUPLE;
            case "suite":
                return SUITE;
            case "deluxe":
                return DELUXE;
            default:
                throw new IllegalArgumentException("No enum constant for database value: " + dbValue);
        }
    }

    @Override
    public String toString() {
        return this.name().charAt(0) + this.name().substring(1).toLowerCase();
    }
}