package com.ecommerce.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.ecommerce.backend.user.Role;
import com.ecommerce.backend.user.User;
import com.ecommerce.backend.user.UserRepository;

@Configuration
public class StartupDataSeeder {

    @Bean
    ApplicationRunner seedDefaultAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String adminEmail = "admin@shop.com";
            if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
                return;
            }

            User admin = new User();
            admin.setFullName("Default Admin");
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode("Admin@123"));
            admin.setRole(Role.ROLE_ADMIN);
            admin.setActive(true);
            userRepository.save(admin);
        };
    }
}
