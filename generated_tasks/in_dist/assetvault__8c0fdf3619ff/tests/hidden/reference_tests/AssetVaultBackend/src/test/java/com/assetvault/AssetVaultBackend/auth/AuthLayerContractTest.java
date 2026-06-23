package com.assetvault.AssetVaultBackend.auth;

import com.assetvault.AssetVaultBackend.auth.controller.AuthController;
import com.assetvault.AssetVaultBackend.auth.dto.AuthResponse;
import com.assetvault.AssetVaultBackend.auth.dto.SigninRequest;
import com.assetvault.AssetVaultBackend.auth.dto.SignupRequest;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthLayerContractTest {

    @Test
    void authResponseConstructorsExposeExpectedAuthenticationPayload() {
        UUID userId = UUID.randomUUID();

        AuthResponse success = new AuthResponse(userId, "Ada", "ada@example.com", "PATIENT", "jwt-token");

        assertEquals(userId, success.getUserId());
        assertEquals("Ada", success.getName());
        assertEquals("ada@example.com", success.getEmail());
        assertEquals("PATIENT", success.getRole());
        assertEquals("jwt-token", success.getToken());
        assertTrue(success.isSuccess());
        assertEquals("Authentication successful", success.getMessage());

        AuthResponse failure = new AuthResponse(false, "Missing or invalid authorization header");

        assertFalse(failure.isSuccess());
        assertEquals("Missing or invalid authorization header", failure.getMessage());
    }

    @Test
    void requestDtosValidateRequiredSigninAndSignupFields() {
        assertTrue(new SigninRequest("ada@example.com", "secret").isValid());
        assertFalse(new SigninRequest("", "secret").isValid());
        assertFalse(new SigninRequest("ada@example.com", "").isValid());

        SignupRequest valid = new SignupRequest(
                "Ada",
                "ada@example.com",
                "secret1",
                "12345-1234567-1",
                "555-0100",
                "1 Main Street",
                "Karachi",
                "O+",
                "1990-01-01",
                "patient",
                "City Hospital",
                null);
        assertTrue(valid.isValid());

        SignupRequest weakPassword = new SignupRequest(
                "Ada",
                "ada@example.com",
                "short",
                "12345-1234567-1",
                null,
                null,
                null,
                null,
                null,
                "patient",
                null,
                null);
        assertFalse(weakPassword.isValid());
    }

    @Test
    void authControllerPublishesExpectedRestEndpoints() throws Exception {
        assertNotNull(AuthController.class.getAnnotation(RestController.class));
        assertArrayEquals(new String[] {"/api/auth"}, AuthController.class.getAnnotation(RequestMapping.class).value());

        assertMapping("signup", PostMapping.class, "/signup", SignupRequest.class);
        assertMapping("signin", PostMapping.class, "/signin", SigninRequest.class);
        assertMapping("verifyToken", PostMapping.class, "/verify", String.class);
        assertMapping("getHospitals", GetMapping.class, "/hospitals");
        assertMapping("getCurrentUser", GetMapping.class, "/me", String.class);
        assertMapping("logout", PostMapping.class, "/logout", String.class);
        assertMapping(
                "updateProfile",
                PutMapping.class,
                "/profile/{userId}",
                UUID.class,
                java.util.Map.class,
                String.class);
    }

    @Test
    void securityConfigExposesStatelessAuthBeans() throws Exception {
        assertNotNull(SecurityConfig.class.getAnnotation(Configuration.class));
        assertNotNull(SecurityConfig.class.getAnnotation(EnableWebSecurity.class));

        Method passwordEncoder = SecurityConfig.class.getDeclaredMethod("passwordEncoder");
        assertNotNull(passwordEncoder.getAnnotation(Bean.class));
        assertEquals(PasswordEncoder.class, passwordEncoder.getReturnType());
        assertTrue(passwordEncoder.invoke(uninitializedSecurityConfig()) instanceof BCryptPasswordEncoder);

        assertBeanMethod("filterChain", SecurityFilterChain.class, org.springframework.security.config.annotation.web.builders.HttpSecurity.class);
        assertBeanMethod("authenticationManager", AuthenticationManager.class, org.springframework.security.config.annotation.web.builders.HttpSecurity.class);
        assertBeanMethod("corsConfigurationSource", org.springframework.web.cors.CorsConfigurationSource.class);
    }

    private static void assertMapping(
            String methodName,
            Class<? extends java.lang.annotation.Annotation> annotationType,
            String expectedPath,
            Class<?>... parameterTypes) throws Exception {
        Method method = AuthController.class.getDeclaredMethod(methodName, parameterTypes);
        java.lang.annotation.Annotation annotation = method.getAnnotation(annotationType);

        assertNotNull(annotation, methodName + " should be annotated with " + annotationType.getSimpleName());
        String[] paths = (String[]) annotationType.getDeclaredMethod("value").invoke(annotation);
        assertTrue(
                Arrays.asList(paths).contains(expectedPath),
                methodName + " should map " + expectedPath + " but had " + Arrays.toString(paths));
    }

    private static void assertBeanMethod(String methodName, Class<?> returnType, Class<?>... parameterTypes) throws Exception {
        Method method = SecurityConfig.class.getDeclaredMethod(methodName, parameterTypes);
        assertNotNull(method.getAnnotation(Bean.class), methodName + " should be a Spring bean");
        assertEquals(returnType, method.getReturnType());
    }

    private static SecurityConfig uninitializedSecurityConfig() throws Exception {
        java.lang.reflect.Constructor<SecurityConfig> constructor =
                SecurityConfig.class.getDeclaredConstructor(com.assetvault.AssetVaultBackend.auth.filter.JwtAuthenticationFilter.class);
        constructor.setAccessible(true);
        return constructor.newInstance((Object) null);
    }
}
