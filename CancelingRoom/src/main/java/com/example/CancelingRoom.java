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
import java.io.InputStream;
import java.io.IOException;
import javax.mail.util.ByteArrayDataSource;

public class CancelingRoom {
    public static void main(String[] args) {
        // Database Setup
        String jdbcURL = "jdbc:mysql://localhost:3306/hotel_db";
        String dbUser = "root";
        String dbPassword = ""; // Ensure this matches your MySQL setup

        // Sender's Email
        String sender = "davinjerlay@gmail.com";

        // Gmail Service Setup
        String host = "smtp.gmail.com";

        Properties properties = System.getProperties();
        properties.setProperty("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "587");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.ssl.trust", "smtp.gmail.com");
        properties.put("mail.debug", "true"); // Enable debug output

        // Retrieve properties
        Session session = Session.getInstance(properties, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication("davinjerlay@gmail.com", "upli vydd cndj fuoq");
            }
        });

        int userId = Integer.parseInt(args[0]); // Use the userId passed as an argument

        // Database Connection + User Info Queries
        String recipientEmail = null;
        String nickname = null;
        String roomStatus = null;

        try {
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            // Query for email at customer user ID
            String sql = "SELECT email FROM users WHERE id = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(sql);
            preparedStatement.setInt(1, userId);
            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {
                recipientEmail = resultSet.getString("email");
                System.out.println("Recipient email: " + recipientEmail);
            } else {
                System.err.println("No email found for user ID: " + userId);
            }

            // Query for name at customer user ID
            String nicknameSql = "SELECT nickname FROM users WHERE id = ?";
            PreparedStatement nicknameStatement = connection.prepareStatement(nicknameSql);
            nicknameStatement.setInt(1, userId);
            ResultSet nicknameResultSet = nicknameStatement.executeQuery();

            if (nicknameResultSet.next()) {
                nickname = nicknameResultSet.getString("nickname");
                System.out.println("Recipient nickname: " + nickname);
            } else {
                System.err.println("No nickname found for user ID: " + userId);
            }

            // Query for room status
            String roomCancelled = "SELECT status FROM bookings WHERE user_id = ? AND status = 'canceled'";
            PreparedStatement roomStatement = connection.prepareStatement(roomCancelled);
            roomStatement.setInt(1, userId);
            ResultSet roomResultSet = roomStatement.executeQuery();

            if (roomResultSet.next()) {
                roomStatus = roomResultSet.getString("status");
                System.out.println("Room status: " + roomStatus);
            } else {
                System.err.println("No canceled booking found for user ID: " + userId);
            }

            nicknameResultSet.close();
            nicknameStatement.close();
            connection.close();

        } catch (SQLException e) {
            e.printStackTrace();
        }

        if ("canceled".equals(roomStatus)) {
            try {
                MimeMessage message = new MimeMessage(session);

                // Set sender
                message.setFrom(new InternetAddress(sender));

                // Set recipient
                message.addRecipient(Message.RecipientType.TO, new InternetAddress(recipientEmail));

                // Set subject
                message.setSubject("Da' Vin Jerlay Co. Room Cancellation Confirmation");

                // Multipart for body/image separation
                Multipart multipart = new MimeMultipart();

                // Create the body
                MimeBodyPart textPart = new MimeBodyPart();
                String emailContent = "<div style='font-family: Arial, sans-serif; color: black; text-align: center;'>" +
                        "<p><strong>Hello " + nickname + ", </strong></p>" +
                        "<p><strong>We've received your request to cancel your room.</strong></p>" +
                        "<p><strong>We are sad to see you go.</strong></p>" +
                        "<p><strong>Thank you, </strong></p>" +
                        "<p><strong>The Da' Vin Jerlay Team</strong></p>" +
                        "<br><img src='cid:logo' width='500' height='88'>" +
                        "</div>";
                textPart.setContent(emailContent, "text/html");

                // Create the image
                MimeBodyPart imagePart = new MimeBodyPart();
                ClassLoader classLoader = CancelingRoom.class.getClassLoader();
                InputStream inputStream = classLoader.getResourceAsStream("logo.png");
                if (inputStream == null) {
                    System.err.println("File not found: logo.png");
                } else {
                    DataSource source = new ByteArrayDataSource(inputStream, "image/png");
                    imagePart.setDataHandler(new DataHandler(source));
                    imagePart.setHeader("Content-ID", "<logo>");

                    // Combine parts
                    multipart.addBodyPart(textPart);
                    multipart.addBodyPart(imagePart);
                    message.setContent(multipart);

                    // Send email
                    Transport.send(message);
                    System.out.println("Mail successfully sent");
                }
            } catch (MessagingException | IOException e) {
                e.printStackTrace();
            }
        } else {
            System.err.println("No cancellation to process for user ID: " + userId);
        }
    }
}
