package com.ecommerce.backend.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.ecommerce.backend.auth.dto.AuthResponse;
import com.ecommerce.backend.auth.dto.LoginRequest;
import com.ecommerce.backend.auth.dto.RegisterRequest;
import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.security.AuthUserDetails;
import com.ecommerce.backend.security.JwtService;
import com.ecommerce.backend.user.Role;
import com.ecommerce.backend.user.User;
import com.ecommerce.backend.user.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BadRequestException("Email already registered.");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.ROLE_CUSTOMER);
        user.setActive(true);

        User saved = userRepository.save(user);
        AuthUserDetails details = AuthUserDetails.from(saved);
        String token = jwtService.generateToken(details);
        return new AuthResponse(token, "Bearer", saved.getId(), saved.getFullName(), saved.getEmail(), saved.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        AuthUserDetails user = authenticate(request);
        if (user.role() == Role.ROLE_ADMIN) {
            throw new BadRequestException("Admin must login at /admin/login.");
        }
        return toAuthResponse(user);
    }

    public AuthResponse adminLogin(LoginRequest request) {
        AuthUserDetails user = authenticate(request);
        if (user.role() != Role.ROLE_ADMIN) {
            throw new BadRequestException("Only admin accounts can login here.");
        }
        return toAuthResponse(user);
    }

    private AuthUserDetails authenticate(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password()));
        } catch (BadCredentialsException ex) {
            throw new BadRequestException("Invalid email or password.");
        }

        return (AuthUserDetails) authentication.getPrincipal();
    }

    private AuthResponse toAuthResponse(AuthUserDetails user) {
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, "Bearer", user.id(), user.fullName(), user.email(), user.role().name());
    }
}
