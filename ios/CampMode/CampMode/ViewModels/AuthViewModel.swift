import Foundation
import SwiftUI
import AuthenticationServices
import CryptoKit

@MainActor
class AuthViewModel: ObservableObject {
    @Published var user: AuthUser?
    @Published var isLoading = true
    @Published var error: String?
    @Published var message: String?
    
    private var refreshToken: String? {
        get { UserDefaults.standard.string(forKey: "campmode_refresh_token") }
        set { UserDefaults.standard.set(newValue, forKey: "campmode_refresh_token") }
    }
    
    private var storedUserId: String? {
        get { UserDefaults.standard.string(forKey: "campmode_user_id") }
        set { UserDefaults.standard.set(newValue, forKey: "campmode_user_id") }
    }
    
    var isSignedIn: Bool { user != nil }
    var isAuthenticated: Bool { user != nil }
    
    var displayName: String {
        user?.userMetadata?.fullName ?? user?.email?.components(separatedBy: "@").first ?? "User"
    }
    
    var userName: String? {
        user?.userMetadata?.fullName
    }
    
    var userEmail: String? {
        user?.email
    }
    
    var userInitial: String {
        String(displayName.prefix(1)).uppercased()
    }
    
    // For Sign in with Apple
    private var currentNonce: String?
    
    init() {
        Task { await restoreSession() }
    }
    
    private func restoreSession() async {
        guard let token = refreshToken else {
            isLoading = false
            return
        }
        do {
            let response = try await SupabaseClient.shared.refreshToken(token)
            self.user = response.user
            if let rt = response.refreshToken { self.refreshToken = rt }
            self.storedUserId = response.user?.id
        } catch {
            self.refreshToken = nil
            self.storedUserId = nil
        }
        isLoading = false
    }
    
    func signIn(email: String, password: String) async {
        error = nil
        isLoading = true
        do {
            let response = try await SupabaseClient.shared.signIn(email: email, password: password)
            self.user = response.user
            self.refreshToken = response.refreshToken
            self.storedUserId = response.user?.id
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
    
    func signUp(email: String, password: String) async {
        error = nil
        message = nil
        isLoading = true
        do {
            let response = try await SupabaseClient.shared.signUp(email: email, password: password)
            if response.user != nil && response.accessToken != nil {
                // Auto-confirmed
                self.user = response.user
                self.refreshToken = response.refreshToken
                self.storedUserId = response.user?.id
            } else {
                message = "Account created! Check your email to confirm, then log in."
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
    
    func resetPassword(email: String) async {
        error = nil
        message = nil
        isLoading = true
        do {
            try await SupabaseClient.shared.resetPassword(email: email)
            message = "Check your email for a password reset link."
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
    
    func updateDisplayName(_ name: String) async {
        do {
            try await SupabaseClient.shared.updateUserName(name)
            // Update local user
            if var u = user {
                user = AuthUser(id: u.id, email: u.email, userMetadata: UserMetadata(fullName: name))
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func signOut() {
        Task { await SupabaseClient.shared.signOut() }
        user = nil
        refreshToken = nil
        storedUserId = nil
    }
    
    // MARK: - Sign in with Apple
    func prepareAppleSignIn() -> String {
        let nonce = randomNonceString()
        currentNonce = nonce
        return sha256(nonce)
    }
    
    func handleAppleSignIn(result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let idTokenData = credential.identityToken,
                  let idToken = String(data: idTokenData, encoding: .utf8),
                  let nonce = currentNonce else {
                error = "Failed to get Apple ID credentials"
                return
            }
            
            isLoading = true
            do {
                let response = try await SupabaseClient.shared.signInWithApple(idToken: idToken, nonce: nonce)
                self.user = response.user
                self.refreshToken = response.refreshToken
                self.storedUserId = response.user?.id
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
            
        case .failure(let error):
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                self.error = error.localizedDescription
            }
        }
    }
    
    private func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        while remainingLength > 0 {
            let randoms: [UInt8] = (0..<16).map { _ in
                var random: UInt8 = 0
                let _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                return random
            }
            for random in randoms {
                if remainingLength == 0 { break }
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        return result
    }
    
    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}
