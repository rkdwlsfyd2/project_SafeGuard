package com.civilcomplaint.entity;

import lombok.Data;
import java.io.Serializable;

@Data
public class ComplaintAgencyKey implements Serializable {
    private Long complaintNo;
    private Long agencyNo;
}
