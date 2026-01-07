package com.safeguard.mapper;

import com.safeguard.dto.UserDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    void save(UserDTO user);

    Optional<UserDTO> findByUserId(@Param("userId") String userId);

    List<UserDTO> findByNameAndPhone(@Param("name") String name, @Param("phone") String phone); // For find ID

    Optional<UserDTO> findByUserIdAndPhone(@Param("userId") String userId, @Param("phone") String phone); // For find PW

    void updatePassword(@Param("userId") String userId, @Param("password") String password);

    boolean existsByUserId(String userId);
}
