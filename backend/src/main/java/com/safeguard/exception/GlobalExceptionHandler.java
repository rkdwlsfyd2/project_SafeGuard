package com.safeguard.exception;

import com.safeguard.common.CommonResponse;
import com.safeguard.dto.ErrorLogDTO;
import com.safeguard.service.ErrorLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.UUID;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final ErrorLogService errorLogService;

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CommonResponse<Void>> handleException(Exception e, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.error("[Exception] traceId={}, message={}", traceId, e.getMessage(), e);

        // Security: Mask potentially sensitive info in response
        String userMessage = "서버 내부 오류가 발생했습니다.";
        String errorCode = "INTERNAL_SERVER_ERROR";

        if (e instanceof IllegalArgumentException) {
            errorCode = "BAD_REQUEST";
            userMessage = e.getMessage();
        } else if (e instanceof RuntimeException) {
            // Business logic errors (careful not to expose too much)
            userMessage = e.getMessage();
            errorCode = "RUNTIME_ERROR";
        } else if (e instanceof NoResourceFoundException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(CommonResponse.fail("NOT_FOUND", "리소스를 찾을 수 없습니다."));
        }

        // Async DB Logging
        try {
            saveErrorLog(e, request, traceId, errorCode);
        } catch (Exception logError) {
            log.error("Failed to save error log", logError);
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CommonResponse.fail(errorCode, userMessage));
    }

    private void saveErrorLog(Exception e, HttpServletRequest request, String traceId, String errorCode) {
        String stackTrace = getStackTraceAsString(e);
        String clientIp = request.getRemoteAddr();
        String method = request.getMethod();
        String uri = request.getRequestURI();

        // Try to get user ID if authenticated
        String userId = "anonymous";
        if (request.getUserPrincipal() != null) {
            userId = request.getUserPrincipal().getName();
        }

        ErrorLogDTO logDto = ErrorLogDTO.builder()
                .traceId(traceId)
                .endpoint(uri)
                .httpMethod(method)
                .clientIp(clientIp)
                .userId(userId)
                .errorCode(errorCode)
                .errorMessage(e.getMessage())
                .stackTrace(stackTrace)
                .build();

        errorLogService.logError(logDto);
    }

    private String getStackTraceAsString(Exception e) {
        StringWriter sw = new StringWriter();
        e.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }
}
