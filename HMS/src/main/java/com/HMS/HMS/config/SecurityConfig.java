package com.HMS.HMS.config;

import com.HMS.HMS.util.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // WebSocket endpoints - must be permitted for real-time updates
                        .requestMatchers("/ws/**").permitAll()

                        // Auth endpoints
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register").hasRole("ADMIN")
                        .requestMatchers("/api/auth/allUsers").hasRole("ADMIN")
                        .requestMatchers("/api/auth/update/**").hasRole("ADMIN")
                        .requestMatchers("/api/auth/delete/**").hasRole("ADMIN")

                        // Ward and transfer endpoints
                        .requestMatchers("/api/transfers/**").permitAll()
                        .requestMatchers("/api/patients/**").permitAll()
                        .requestMatchers("/api/admissions/**").permitAll()
                        .requestMatchers("/api/wards/getAll").permitAll()
                        
                        // Reports endpoints
                        .requestMatchers("/api/reports/admissions/**").permitAll()
                        .requestMatchers("/api/reports/ward-statistics/**").permitAll()
                        .requestMatchers("/api/reports/hospital-wide/**").permitAll()
                        .requestMatchers("/api/reports/pharmacy/**").permitAll()
                        .requestMatchers("/api/reports/clinic/**").permitAll()
                        .requestMatchers("/api/reports/comprehensive-clinic/**").permitAll()
                        .requestMatchers("/api/reports/appointment-analytics/**").permitAll()
                        
                        // Medical endpoints
                        .requestMatchers("/api/doctors/**").permitAll()
                        .requestMatchers("/api/appointments/**").permitAll()
                        .requestMatchers("/api/prescriptions/**").permitAll()
                        
                        // Pharmacy endpoints
                        .requestMatchers("/api/pharmacy/reports/**").permitAll()
                        .requestMatchers("/api/pharmacy/medications/**").permitAll()
                        .requestMatchers("/api/pharmacy/analytics/**").permitAll()
                        
                        // Dialysis and clinic endpoints
                        .requestMatchers("/api/dialysis/**").permitAll()
                        .requestMatchers("/api/clinic/**").permitAll()
                        
                        // Lab and test endpoints
                        .requestMatchers("/api/test/**").permitAll()
                        .requestMatchers("/api/test-results/**").permitAll()
                        .requestMatchers("/api/simple-test/**").permitAll()
                        .requestMatchers("/api/test-results-simple/**").permitAll()
                        .requestMatchers("/api/test-simple/**").permitAll()
                        .requestMatchers("/api/health-test/**").permitAll()
                        .requestMatchers("/api/debug/**").permitAll()
                        .requestMatchers("/api/lab-reports/**").permitAll()
                    
                        
                        // Actuator endpoints
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}