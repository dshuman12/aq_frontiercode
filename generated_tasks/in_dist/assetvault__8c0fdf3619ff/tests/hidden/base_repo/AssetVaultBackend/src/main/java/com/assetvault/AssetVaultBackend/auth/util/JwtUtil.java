package com.assetvault.AssetVaultBackend.auth.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * JWT Utility Component
 * Handles JWT token generation, validation, and parsing
 */
@Component
public class JwtUtil {
    
    @Value("${jwt.secret:your-super-secret-key-change-this-in-production-at-least-256-bits-long}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}")  // 24 hours default
    private long jwtExpiration;
    
    /**
     * Get signing key for JWT
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }
    
    /**
     * Generate JWT token for user
     * @param userId User's unique identifier
     * @param email User's email
     * @param role User's role
     * @return JWT token
     */
    public String generateToken(UUID userId, String email, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);
        
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }
    
    /**
     * Validate JWT token
     * @param token JWT token to validate
     * @return true if token is valid
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Get user ID from token
     * @param token JWT token
     * @return User ID
     */
    public UUID getUserIdFromToken(String token) {
        String userId = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        return UUID.fromString(userId);
    }
    
    /**
     * Get email from token
     * @param token JWT token
     * @return User email
     */
    public String getEmailFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("email", String.class);
    }
    
    /**
     * Get role from token
     * @param token JWT token
     * @return User role
     */
    public String getRoleFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }
}
