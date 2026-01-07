package com.civilcomplaint.mapper;

import com.civilcomplaint.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserMapper {
    Optional<AppUser> findByUserNo(@Param("userNo") Long userNo);

    Optional<AppUser> findByUserId(@Param("userId") String userId);

    Optional<AppUser> findByEmail(@Param("email") String email);

    boolean existsByEmail(@Param("email") String email);

    void insert(AppUser user);

    void update(AppUser user);

    void deleteByUserNo(@Param("userNo") Long userNo);
}
