package com.safeguard.service.impl;

import com.safeguard.service.FileService;
import io.awspring.cloud.s3.S3Template;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final S3Template s3Template;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;

    @Value("${spring.cloud.aws.credentials.access-key}")
    private String accessKey;

    @Override
    public String storeFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = "";

        try {
            if (originalFileName.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + originalFileName);
            }

            int lastIndex = originalFileName.lastIndexOf('.');
            if (lastIndex != -1) {
                extension = originalFileName.substring(lastIndex);
            }

            String fileName = UUID.randomUUID().toString() + extension;

            // 로컬 개발 환경용 폴백 (Access Key가 "none"이거나 설정되지 않은 경우) -> 제거됨 (IAM Role 지원 위해)
            // if ("none".equals(accessKey) || accessKey == null || accessKey.isEmpty()) {
            // log.info("[File Service] AWS 설정이 없어 로컬 저장소에 저장합니다: {}", fileName);
            // return storeLocally(file, fileName);
            // }

            try {
                // S3 업로드 시도
                log.info("[File Service] S3 업로드 시도: {}", fileName);
                s3Template.upload(bucketName, fileName, file.getInputStream());
                return s3Template.download(bucketName, fileName).getURL().toString();
            } catch (Exception s3Ex) {
                log.error("[File Service] S3 업로드 실패, 로컬 저장소로 전환합니다.", s3Ex);
                return storeLocally(file, fileName);
            }

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    private String storeLocally(MultipartFile file, String fileName) throws IOException {
        java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads").toAbsolutePath().normalize();
        if (!java.nio.file.Files.exists(uploadPath)) {
            java.nio.file.Files.createDirectories(uploadPath);
        }
        java.nio.file.Path targetLocation = uploadPath.resolve(fileName);
        java.nio.file.Files.copy(file.getInputStream(), targetLocation,
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        // 프론트엔드에서 접근 가능한 상대 경로 반환
        return "/uploads/" + fileName;
    }
}