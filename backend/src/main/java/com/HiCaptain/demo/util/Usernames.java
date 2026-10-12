package com.HiCaptain.demo.util;

import java.util.UUID;
import java.util.Locale;

public final class Usernames {
    private Usernames() {}

    public static String generate(String email) {
        String prefix = email.split("@", 2)[0].toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (prefix.isEmpty()) prefix = "user";
        if (prefix.length() > 18) prefix = prefix.substring(0, 18).replaceAll("_+$", "");
        return prefix + "_" + UUID.randomUUID().toString().substring(0, 6);
    }
}
