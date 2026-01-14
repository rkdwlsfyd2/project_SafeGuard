package com.safeguard.mapper;

import com.safeguard.dto.UserDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    void insertUser(UserDTO user);

    Optional<UserDTO> findByUserId(@Param("userId") String userId);

    UserDTO selectUserByUserId(String userId);

    List<UserDTO> selectUserByNameAndPhone(@Param("name") String name, @Param("phone") String phone); // For find ID

    Optional<UserDTO> selectUserByUserIdAndPhone(@Param("userId") String userId, @Param("phone") String phone); // For
                                                                                                                // find
                                                                                                                // PW

    void updateUserPassword(@Param("userId") String userId, @Param("password") String password);

    boolean existsByUserId(String userId);

    Optional<UserDTO> selectUserByUserNo(@Param("userNo") Long userNo);

    void updateUser(UserDTO user);

    void deleteUserByUserNo(@Param("userNo") Long userNo);
}
