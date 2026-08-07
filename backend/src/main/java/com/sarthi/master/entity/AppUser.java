package com.sarthi.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String role; // OWNER or STAFF

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "preferred_locale", nullable = false, length = 5)
    private String preferredLocale = "en";

    @Column(name = "preferred_theme", nullable = false, length = 32)
    private String preferredTheme = "harvest";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public void setUsername(String u) { this.username = u; }
    public String getPassword() { return password; }
    public void setPassword(String p) { this.password = p; }
    public String getFullName() { return fullName; }
    public void setFullName(String n) { this.fullName = n; }
    public String getRole() { return role; }
    public void setRole(String r) { this.role = r; }
    public boolean isActive() { return active; }
    public void setActive(boolean a) { this.active = a; }
    public String getPreferredLocale() { return preferredLocale; }
    public void setPreferredLocale(String preferredLocale) { this.preferredLocale = preferredLocale; }
    public String getPreferredTheme() { return preferredTheme; }
    public void setPreferredTheme(String preferredTheme) { this.preferredTheme = preferredTheme; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
