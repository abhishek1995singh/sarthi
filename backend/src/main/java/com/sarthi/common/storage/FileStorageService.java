package com.sarthi.common.storage;

import com.sarthi.common.exception.BusinessValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "gif", "webp", "doc", "docx", "xls", "xlsx", "txt"
    );

    private final Path root;

    public FileStorageService(@Value("${app.storage.location:./data/uploads}") String storageLocation) {
        this.root = Path.of(storageLocation).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException ex) {
            throw new BusinessValidationException("Could not initialize file storage.");
        }
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("File is empty.");
        }

        String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        if (original.contains("..")) {
            throw new BusinessValidationException("Invalid file name.");
        }

        String extension = extensionOf(original);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessValidationException("File type not allowed. Use PDF, images, or office documents.");
        }

        String storedName = UUID.randomUUID() + "." + extension;
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new BusinessValidationException("Invalid storage path.");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return storedName;
        } catch (IOException ex) {
            throw new BusinessValidationException("Could not store file.");
        }
    }

    public Resource loadAsResource(String storedFilename) {
        try {
            Path file = root.resolve(storedFilename).normalize();
            if (!file.startsWith(root) || !Files.exists(file)) {
                throw new BusinessValidationException("File not found.");
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new BusinessValidationException("File not readable.");
            }
            return resource;
        } catch (MalformedURLException ex) {
            throw new BusinessValidationException("File not found.");
        }
    }

    public void delete(String storedFilename) {
        if (storedFilename == null || storedFilename.isBlank()) {
            return;
        }
        try {
            Path file = root.resolve(storedFilename).normalize();
            if (file.startsWith(root)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException ignored) {
            // Best effort cleanup.
        }
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot + 1).toLowerCase();
    }
}
