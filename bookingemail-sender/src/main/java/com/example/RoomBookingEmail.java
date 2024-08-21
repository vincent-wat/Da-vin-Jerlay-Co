package com.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

public class RoomBookingEmail {
    public static void main(String[] args) {
        int userId = Integer.parseInt(args[0]);
        String roomType = args[1];
        String checkIn = args[2];
        String checkOut = args[3];
        
        String jdbcURL = "jdbc:mysql://localhost:3306/hotel_db";
        String dbUser = "root";
        String dbPassword = "";

        String sender = "davinjerlay@gmail.com";
        String host = "smtp.gmail.com";

        Properties properties = System.getProperties();
        properties.setProperty("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "587");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.ssl.trust", "smtp.gmail.com");

        Session session = Session.getInstance(properties, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication("davinjerlay@gmail.com", "uplivyddcndjfuoq");
            }
        });

        String recipientEmail = null;
        String nickname = null;

        try {
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            String sql = "SELECT email, nickname FROM users WHERE id = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(sql);
            preparedStatement.setInt(1, userId);
            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {
                recipientEmail = resultSet.getString("email");
                nickname = resultSet.getString("nickname");
            }

            resultSet.close();
            preparedStatement.close();
            connection.close();

            System.out.println("Recipient email: " + recipientEmail);
            System.out.println("Recipient nickname: " + nickname);

        } catch (SQLException e) {
            e.printStackTrace();
        }

        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(sender));
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(recipientEmail));
            message.setSubject("Booking Confirmation");

            Multipart multipart = new MimeMultipart();

            MimeBodyPart textPart = new MimeBodyPart();
            String emailContent = "<div style='font-family: Arial, sans-serif; color: black; text-align: center;'>" +
                                  "<p><strong>Hello " + nickname + ",</strong></p>" +
                                  "<p>Your booking for a " + roomType + " room has been confirmed.</p>" +
                                  "<p>Check-in Date: " + checkIn + "</p>" +
                                  "<p>Check-out Date: " + checkOut + "</p>" +
                                  "<p>Thank you for choosing our hotel.</p>" +
                                  "</div>";
            textPart.setContent(emailContent, "text/html");

            multipart.addBodyPart(textPart);
            message.setContent(multipart);

            Transport.send(message);
            System.out.println("Mail successfully sent");
        } catch (MessagingException mex) {
            mex.printStackTrace();
        }
    }
}
