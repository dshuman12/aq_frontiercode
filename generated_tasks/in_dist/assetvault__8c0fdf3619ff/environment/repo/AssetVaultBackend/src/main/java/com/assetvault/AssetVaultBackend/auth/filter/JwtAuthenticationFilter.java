package com.assetvault.AssetVaultBackend.auth.filter;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.assetvault.AssetVaultBackend.auth.util.JwtUtil;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * JWT Authentication Filter
 * Validates JWT tokens from Authorization header on each request
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // Short-circuit: allow unauthenticated access to public asset prices endpoints
        String path = request.getRequestURI();
        if (path != null && (path.equals("/api/dashboard/asset-prices") || path.equals("/api/dashboard/hospital/asset-prices"))) {
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            String authHeader = request.getHeader("Authorization");
            String token = null;
            String email = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
                log.debug("JWT Token found in request");

                try {
                    if (jwtUtil.validateToken(token)) {
                        email = jwtUtil.getEmailFromToken(token);
                        log.debug("Token validated for email: {}", email);

                        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                            try {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                                UsernamePasswordAuthenticationToken authentication = 
                                        new UsernamePasswordAuthenticationToken(
                                                userDetails, 
                                                null, 
                                                userDetails.getAuthorities()
                                        );

                                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(authentication);
                                log.debug("Authentication set for user: {} with authorities: {}", email, userDetails.getAuthorities());
                            } catch (UsernameNotFoundException e) {
                                log.warn("User not found for email {} from valid JWT token. This indicates a data integrity issue: {}", email, e.getMessage());
                                // Clear the context to ensure 403 is returned
                                SecurityContextHolder.clearContext();
                            } catch (Exception e) {
                                log.error("Error loading user details for email {} from valid JWT token: {}", email, e.getMessage(), e);
                                // Clear the context to ensure 403 is returned
                                SecurityContextHolder.clearContext();
                            }
                        }
                    } else {
                        log.warn("Token validation failed for request to: {}", request.getRequestURI());
                    }
                } catch (Exception e) {
                    log.error("Cannot validate JWT token: {} - Stack trace: ", e.getMessage(), e);
                }
            } else {
                log.debug("No Bearer token found in Authorization header");
            }
        } catch (Exception e) {
            log.error("Cannot process JWT filter: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }
}
