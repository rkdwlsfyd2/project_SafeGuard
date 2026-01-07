package com.civilcomplaint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CivilComplaintApplication {
    public static void main(String[] args) {
        SpringApplication.run(CivilComplaintApplication.class, args);
        System.out.println("[Server] Backend server running on port 5000");
        System.out.println("[Server] http://localhost:5000");
    }
}
