package app.tuner.player;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * airglow accounts (design/ui-v1/accounts-v1/SPEC.md 5.7): the account's data key and refresh token at rest on the TV.
 * An AES-256-GCM key that lives in the Android Keystore (never leaves it) wraps the value; the wrapped bytes sit in the
 * app's private files. Jetpack's EncryptedSharedPreferences is deprecated; this is the shape its replacements use.
 * The WebView gets the value through the plugin at launch, into memory only.
 */
final class Secret {
    private static final String ALIAS = "airglow.account";
    private Secret() {}

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        KeyStore.Entry e = ks.getEntry(ALIAS, null);
        if (e instanceof KeyStore.SecretKeyEntry) return ((KeyStore.SecretKeyEntry) e).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return g.generateKey();
    }
    private static File file(Context c, String name) {
        File dir = new File(c.getFilesDir(), "secret");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, name.replaceAll("[^A-Za-z0-9_.-]", "_"));
    }
    static synchronized void set(Context c, String name, String value) throws Exception {
        Cipher ci = Cipher.getInstance("AES/GCM/NoPadding");
        ci.init(Cipher.ENCRYPT_MODE, key());
        byte[] ct = ci.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] iv = ci.getIV();
        String out = Base64.encodeToString(iv, Base64.NO_WRAP) + "." + Base64.encodeToString(ct, Base64.NO_WRAP);
        File f = file(c, name), tmp = new File(f.getPath() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(out.getBytes(StandardCharsets.US_ASCII)); o.getFD().sync(); }
        if (!tmp.renameTo(f)) throw new Exception("could not store");   // (written whole, then swapped in)
    }
    static synchronized String get(Context c, String name) throws Exception {
        File f = file(c, name);
        if (!f.exists()) return null;
        String[] p = new String(Files.readAllBytes(f.toPath()), StandardCharsets.US_ASCII).split("\\.");
        if (p.length != 2) return null;
        Cipher ci = Cipher.getInstance("AES/GCM/NoPadding");
        ci.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(p[0], Base64.NO_WRAP)));
        return new String(ci.doFinal(Base64.decode(p[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    static synchronized void clear(Context c, String name) { File f = file(c, name); if (f.exists()) f.delete(); }
}
