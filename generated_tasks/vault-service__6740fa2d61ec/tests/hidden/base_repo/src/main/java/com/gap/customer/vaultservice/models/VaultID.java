package com.gap.customer.vaultservice.models;


import lombok.Getter;

import java.io.UnsupportedEncodingException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Objects;
import java.util.UUID;

//TODO: to be implemented

@Getter
public class VaultID {

    private String id;
    public VaultID() {
        this.id = generateRandomId();
    }


    public void setId(String id) {
        this.id = id;
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VaultID vaultID = (VaultID) o;
        return id.equals(vaultID.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }


    private static String bytesToHex(byte[] array) {
        StringBuffer sb = new StringBuffer();
        for (int j = 0; j < array.length; ++j) {
            int b = array[j] & 0xFF;
            if (b < 0x10) {
                sb.append('0');
            }
            sb.append(Integer.toHexString(b));
        }
        return sb.toString().toUpperCase();
    }



    //TODO:Algorithm2
    private static String generateRandomId(){
        MessageDigest salt = null;
        try {
            salt = MessageDigest.getInstance("MD5");
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
        try {
            salt.update(UUID.randomUUID().toString().getBytes("UTF-8"));
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        String digest = bytesToHex(salt.digest());
        return digest;
    }

}
