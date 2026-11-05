import UIKit
import WebKit
import Capacitor
import Security

// airglow accounts (design/ui-v1/accounts-v1/SPEC.md 5.7): the account's data key and refresh token in the Keychain,
// this device only, readable after the first unlock. The page gets them through this plugin, into memory only.
@objc(AirglowSecretPlugin)
public class AirglowSecretPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AirglowSecretPlugin"
    public let jsName = "AirglowSecret"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]
    private func query(_ key: String) -> [String: Any] {
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "app.tuner.player.account", kSecAttrAccount as String: key]
    }
    @objc func get(_ call: CAPPluginCall) {
        var q = query(call.getString("key") ?? "acct")
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        let st = SecItemCopyMatching(q as CFDictionary, &out)
        if st == errSecItemNotFound { call.resolve(["value": NSNull()]); return }
        guard st == errSecSuccess, let d = out as? Data, let v = String(data: d, encoding: .utf8) else { call.reject("keychain \(st)"); return }
        call.resolve(["value": v])
    }
    @objc func set(_ call: CAPPluginCall) {
        guard let v = call.getString("value"), let d = v.data(using: .utf8) else { call.reject("no value"); return }
        let q = query(call.getString("key") ?? "acct")
        SecItemDelete(q as CFDictionary)
        var add = q
        add[kSecValueData as String] = d
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let st = SecItemAdd(add as CFDictionary, nil)
        if st == errSecSuccess { call.resolve() } else { call.reject("keychain \(st)") }
    }
    @objc func clear(_ call: CAPPluginCall) {
        SecItemDelete(query(call.getString("key") ?? "acct") as CFDictionary)
        call.resolve()
    }
}

// The WebView's media settings for the HTML5 player (phone-v1 PORT-NATIVE.md): inline playback, Picture in Picture,
// AirPlay, and play() from the app's own taps without a further gesture.
class AirglowViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AirglowSecretPlugin())
    }
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let c = super.webViewConfiguration(for: instanceConfiguration)
        c.allowsInlineMediaPlayback = true
        c.allowsPictureInPictureMediaPlayback = true
        c.allowsAirPlayForMediaPlayback = true
        c.mediaTypesRequiringUserActionForPlayback = []
        return c
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AirglowViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
